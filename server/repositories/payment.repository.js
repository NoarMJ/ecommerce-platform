const prisma = require('../config/prisma');

const create = (data) => prisma.payment.create({ data });

const update = (id, data) => prisma.payment.update({ where: { id }, data });

const findByCheckoutRequestId = (checkoutRequestId) =>
  prisma.payment.findUnique({ where: { checkoutRequestId } });

// An unanswered prompt may still be paid at any time. Do not expire this lock
// based only on age: doing so could let a second STK push charge the customer.
const findInitiatedForOrder = (orderId) =>
  prisma.payment.findFirst({
    where: { orderId, status: 'initiated' },
    orderBy: { createdAt: 'desc' },
  });

const findLatestForOrder = (orderId) =>
  prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      resultDesc: true,
      mpesaReceiptNumber: true,
      reconciliationReceipt: true,
      reconciliationStatus: true,
      reconciliationRequestedAt: true,
      createdAt: true,
    },
  });

// Changes a payment only if it is still "initiated".
// Returns true if it changed, false if it was already handled.
const updateIfInitiated = async (id, data) => {
  const result = await prisma.payment.updateMany({
    where: { id, status: 'initiated' },
    data,
  });
  return result.count === 1;
};

const findByReconciliationConversationId = async (conversationId) => {
  const attempt = await prisma.paymentReceiptVerification.findUnique({
    where: { conversationId },
    include: { payment: true },
  });
  return attempt ? { ...attempt.payment, reconciliationReceipt: attempt.receipt, reconciliationStatus: attempt.status } : null;
};

const findByAnyReceipt = async (receipt) => {
  const attempt = await prisma.paymentReceiptVerification.findUnique({ where: { receipt } });
  if (attempt) {
    const payment = await prisma.payment.findUnique({ where: { id: attempt.paymentId } });
    return payment ? { ...payment, reconciliationReceipt: attempt.receipt, reconciliationStatus: attempt.status } : null;
  }
  return prisma.payment.findFirst({ where: { mpesaReceiptNumber: receipt } });
};

const markReconciliationRequested = ({ paymentId, receipt, requestedAt }) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.paymentReceiptVerification.findUnique({ where: { receipt } });
    if (existing && existing.paymentId !== paymentId) return false;

    if (existing) {
      await tx.paymentReceiptVerification.update({
        where: { receipt },
        data: { status: 'pending', conversationId: null, resultCode: null, resultDesc: null },
      });
    } else {
      await tx.paymentReceiptVerification.create({ data: { paymentId, receipt } });
    }

    const result = await tx.payment.updateMany({
      where: { id: paymentId, status: 'initiated' },
      data: {
        reconciliationReceipt: receipt,
        reconciliationConversationId: null,
        reconciliationStatus: 'pending',
        reconciliationRequestedAt: requestedAt,
        resultCode: null,
        resultDesc: null,
      },
    });
    return result.count === 1;
  });

const setReconciliationConversationId = async (paymentId, receipt, conversationId) => {
  const result = await prisma.paymentReceiptVerification.updateMany({
    where: { paymentId, receipt, status: 'pending' },
    data: { conversationId },
  });
  await prisma.payment.updateMany({
    where: { id: paymentId, status: 'initiated', reconciliationReceipt: receipt, reconciliationStatus: 'pending' },
    data: { reconciliationConversationId: conversationId },
  });
  return result.count === 1;
};

const updateReconciliationResult = async ({ paymentId, receipt, status, resultCode, resultDesc, rawCallback }) => {
  const result = await prisma.paymentReceiptVerification.updateMany({
    where: { paymentId, receipt, status: 'pending' },
    data: {
      status,
      ...(resultCode !== undefined ? { resultCode } : {}),
      resultDesc,
      ...(rawCallback !== undefined ? { rawCallback } : {}),
    },
  });
  if (!result.count) return false;
  await prisma.payment.updateMany({
    where: { id: paymentId, status: 'initiated', reconciliationReceipt: receipt, reconciliationStatus: 'pending' },
    data: {
      reconciliationStatus: status,
      ...(resultCode !== undefined ? { resultCode } : {}),
      resultDesc,
      ...(rawCallback !== undefined ? { rawCallback } : {}),
    },
  });
  return true;
};

const completeFromReconciliation = ({ payment, receipt, resultCode, resultDesc, rawCallback }) =>
  prisma.$transaction(async (tx) => {
    const result = await tx.payment.updateMany({
      where: { id: payment.id, status: 'initiated' },
      data: {
        status: 'succeeded',
        mpesaReceiptNumber: receipt,
        reconciliationReceipt: receipt,
        reconciliationStatus: 'verified',
        resultCode,
        resultDesc,
        rawCallback,
      },
    });

    if (result.count !== 1) return false;

    const attempt = await tx.paymentReceiptVerification.updateMany({
      where: { paymentId: payment.id, receipt, status: 'pending' },
      data: { status: 'verified', resultCode, resultDesc, rawCallback },
    });
    if (attempt.count !== 1) throw new Error('Receipt verification is no longer pending.');

    const orderUpdate = await tx.order.updateMany({
      where: { id: payment.orderId, paymentStatus: 'pending' },
      data: { paymentStatus: 'paid' },
    });
    if (orderUpdate.count !== 1) throw new Error('Order payment was already resolved.');
    return true;
  });

// Records the callback result and, for a matching payment, marks the order
// paid. Both changes happen together or not at all.
const completeFromCallback = ({
  payment,
  status,
  receipt,
  resultCode,
  resultDesc,
  rawCallback,
}) =>
  prisma.$transaction(async (tx) => {
    const result = await tx.payment.updateMany({
      where: { id: payment.id, status: 'initiated' },
      data: {
        status,
        mpesaReceiptNumber: receipt,
        resultCode,
        resultDesc,
        rawCallback,
      },
    });

    if (result.count !== 1) return false; // a duplicate callback

    if (status === 'succeeded') {
      await tx.order.updateMany({
        where: { id: payment.orderId, paymentStatus: 'pending' },
        data: { paymentStatus: 'paid' },
      });
    }

    return true;
  });

module.exports = {
  create,
  update,
  findByCheckoutRequestId,
  findInitiatedForOrder,
  findLatestForOrder,
  findByReconciliationConversationId,
  findByAnyReceipt,
  markReconciliationRequested,
  setReconciliationConversationId,
  updateReconciliationResult,
  completeFromReconciliation,
  updateIfInitiated,
  completeFromCallback,
};
