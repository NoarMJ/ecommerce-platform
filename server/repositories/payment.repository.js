
const prisma = require('../config/prisma');
const stockReservationRepository = require('./stockReservation.repository');

const NEEDS_REVIEW_NOTE =
  'Payment received for an order that can no longer be fulfilled. Check by hand and refund if needed.';

const create = (data) => prisma.payment.create({ data });

// Serialize prompt claims per order across server instances. The second
// request rechecks for an unresolved attempt after acquiring the lock, before
// either request can call Safaricom.
const createInitiatedIfNone = (data) =>
  prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      WITH order_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtext(${data.orderId}))
      )
      SELECT 1 FROM order_lock
    `;

    const existing = await tx.payment.findFirst({
      where: { orderId: data.orderId, status: 'initiated' },
      select: { id: true },
    });
    if (existing) return null;

    return tx.payment.create({ data: { ...data, status: 'initiated' } });
  });

const update = (id, data) =>
  prisma.payment.update({ where: { id }, data });

const findByCheckoutRequestId = (checkoutRequestId) =>
  prisma.payment.findUnique({ where: { checkoutRequestId } });

const recordStkCallbackEvent = async ({ payloadHash, checkoutRequestId, body }) => {
  try {
    return await prisma.mpesaCallbackEvent.create({
      data: {
        payloadHash,
        checkoutRequestId,
        body,
      },
    });
  } catch (error) {
    // Safaricom may redeliver the same callback after an HTTP error. Reuse its
    // durable inbox row so the callback remains idempotent.
    if (error.code !== 'P2002') throw error;
    return prisma.mpesaCallbackEvent.findUnique({ where: { payloadHash } });
  }
};

const updateStkCallbackEvent = (id, { status, lastError = null }) =>
  prisma.mpesaCallbackEvent.update({
    where: { id },
    data: {
      status,
      attemptCount: { increment: 1 },
      lastError,
      processedAt: status === 'processed' ? new Date() : null,
    },
  });

const findRetryableStkCallbackEvents = ({ checkoutRequestId, take = 100 } = {}) =>
  prisma.mpesaCallbackEvent.findMany({
    where: {
      status: { in: ['pending', 'unmatched', 'failed'] },
      ...(checkoutRequestId ? { checkoutRequestId } : {}),
    },
    orderBy: { receivedAt: 'asc' },
    take,
  });

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
      phone: true,
      resultCode: true,
      resultDesc: true,
      mpesaReceiptNumber: true,
      reconciliationReceipt: true,
      reconciliationStatus: true,
      reconciliationRequestedAt: true,
      createdAt: true,
    },
  });

// Prompts that have been waiting longer than olderThan for a callback, newest
// window only: after newerThan the customer can still trigger a manual check.
const findAwaitingResult = ({ olderThan, newerThan, take = 20 }) =>
  prisma.payment.findMany({
    where: {
      status: 'initiated',
      checkoutRequestId: { not: null },
      createdAt: { lt: olderThan, gt: newerThan },
    },
    orderBy: { createdAt: 'asc' },
    take,
  });

// The receipt shown on the confirmation page.
const findSucceededForOrder = (orderId) =>
  prisma.payment.findFirst({
    where: { orderId, status: 'succeeded' },
    orderBy: { createdAt: 'desc' },
    select: {
      mpesaReceiptNumber: true,
      phone: true,
      amountMinor: true,
      updatedAt: true,
    },
  });

// A status query can mark a payment succeeded before the callback brings
// the receipt number. Fill it in once, without touching anything else.
const setReceiptIfMissing = async (id, receipt) => {
  const result = await prisma.payment.updateMany({
    where: { id, status: 'succeeded', mpesaReceiptNumber: null },
    data: { mpesaReceiptNumber: receipt },
  });
  return result.count === 1;
};

// Safaricom confirmed money for a prompt we had already recorded as failed or
// cancelled. Keep the money visible for a person to check; never settle automatically.
const flagLateSuccess = async (id, { receipt, rawCallback }) => {
  try {
    const result = await prisma.payment.updateMany({
      where: { id, status: { in: ['failed', 'cancelled'] } },
      data: {
        status: 'needs_review',
        mpesaReceiptNumber: receipt,
        resultCode: 0,
        resultDesc: 'Paid after this prompt was recorded as unpaid. Check by hand and refund if needed.',
        rawCallback,
      },
    });
    return result.count === 1;
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    // Receipt already on another payment: still flag it, without the receipt.
    const result = await prisma.payment.updateMany({
      where: { id, status: { in: ['failed', 'cancelled'] } },
      data: {
        status: 'needs_review',
        resultCode: 0,
        resultDesc: `Paid after this prompt was recorded as unpaid (duplicate receipt ${receipt}). Check by hand.`,
        rawCallback,
      },
    });
    return result.count === 1;
  }
};

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

  return attempt
    ? {
        ...attempt.payment,
        reconciliationReceipt: attempt.receipt,
        reconciliationStatus: attempt.status,
      }
    : null;
};

const findByAnyReceipt = async (receipt) => {
  const attempt = await prisma.paymentReceiptVerification.findUnique({
    where: { receipt },
  });

  if (attempt) {
    const payment = await prisma.payment.findUnique({
      where: { id: attempt.paymentId },
    });

    return payment
      ? {
          ...payment,
          reconciliationReceipt: attempt.receipt,
          reconciliationStatus: attempt.status,
        }
      : null;
  }

  return prisma.payment.findFirst({
    where: { mpesaReceiptNumber: receipt },
  });
};

const markReconciliationRequested = ({ paymentId, receipt, requestedAt }) =>
  prisma.$transaction(async (tx) => {
    // Check receipt ownership before changing either record.
    const existing = await tx.paymentReceiptVerification.findUnique({
      where: { receipt },
    });

    if (existing && existing.paymentId !== paymentId) {
      return false;
    }

    // Only an unresolved payment can start a new reconciliation request.
    // resultCode, resultDesc and rawCallback belong to the STK prompt, so a
    // receipt check leaves them alone; its own result is kept on the
    // PaymentReceiptVerification row.
    const result = await tx.payment.updateMany({
      where: { id: paymentId, status: 'initiated' },
      data: {
        reconciliationReceipt: receipt,
        reconciliationConversationId: null,
        reconciliationStatus: 'pending',
        reconciliationRequestedAt: requestedAt,
      },
    });

    if (result.count !== 1) return false;

    if (existing) {
      await tx.paymentReceiptVerification.update({
        where: { receipt },
        data: {
          status: 'pending',
          conversationId: null,
          resultCode: null,
          resultDesc: null,
        },
      });
    } else {
      await tx.paymentReceiptVerification.create({
        data: { paymentId, receipt },
      });
    }

    return true;
  });


const setReconciliationConversationId = async (
  paymentId,
  receipt,
  conversationId
) => {
  return prisma.$transaction(async (tx) => {
    const verification = await tx.paymentReceiptVerification.updateMany({
      where: {
        paymentId,
        receipt,
        status: 'pending',
      },
      data: { conversationId },
    });

    if (verification.count !== 1) return false;

    const payment = await tx.payment.updateMany({
      where: {
        id: paymentId,
        status: 'initiated',
        reconciliationReceipt: receipt,
        reconciliationStatus: 'pending',
      },
      data: {
        reconciliationConversationId: conversationId,
      },
    });

    if (payment.count !== 1) {
      throw new Error(
        'Could not save the reconciliation conversation ID to the payment.'
      );
    }

    return true;
  });
};


const updateReconciliationResult = async ({
  paymentId,
  receipt,
  status,
  resultCode,
  resultDesc,
  rawCallback,
}) => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.paymentReceiptVerification.updateMany({
      where: { paymentId, receipt, status: 'pending' },
      data: {
        status,
        ...(resultCode !== undefined ? { resultCode } : {}),
        resultDesc,
        ...(rawCallback !== undefined ? { rawCallback } : {}),
      },
    });

    if (!result.count) return false;

    await tx.payment.updateMany({
      where: {
        id: paymentId,
        status: 'initiated',
        reconciliationReceipt: receipt,
        reconciliationStatus: 'pending',
      },
      // Only the summary. The details stay on the verification row above, so
      // the payment keeps the STK prompt's own result code and callback.
      data: { reconciliationStatus: status },
    });

    return true;
  });
};

// Settle the stock and order after money has been confirmed.
// If the order can no longer be fulfilled, retain the payment record for
// investigation instead of silently treating it as a normal successful order.
const settleOrderForPayment = async (tx, payment) => {
  const outcome = await stockReservationRepository.settlePaidOrder(
    tx,
    payment.orderId
  );

  if (outcome === 'needs_review') {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'needs_review',
        resultDesc: NEEDS_REVIEW_NOTE,
      },
    });
  }

  return outcome;
};

// Records a verified receipt and settles the associated order atomically.
const completeFromReconciliation = ({
  payment,
  receipt,
  resultCode,
  resultDesc,
  rawCallback,
}) =>
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
      where: {
        paymentId: payment.id,
        receipt,
        status: 'pending',
      },
      data: {
        status: 'verified',
        resultCode,
        resultDesc,
        rawCallback,
      },
    });

    if (attempt.count !== 1) {
      throw new Error('Receipt verification is no longer pending.');
    }

    await settleOrderForPayment(tx, payment);

    return true;
  });

// Records the callback result and settles the order when payment succeeds.
// Both changes happen together or not at all.
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

    if (result.count !== 1) return false;

    if (status === 'succeeded') {
      await settleOrderForPayment(tx, payment);
    }

    return true;
  });

module.exports = {
  create,
  createInitiatedIfNone,
  update,
  findByCheckoutRequestId,
  recordStkCallbackEvent,
  updateStkCallbackEvent,
  findRetryableStkCallbackEvents,
  findInitiatedForOrder,
  findLatestForOrder,
  findAwaitingResult,
  findSucceededForOrder,
  setReceiptIfMissing,
  flagLateSuccess,
  findByReconciliationConversationId,
  findByAnyReceipt,
  markReconciliationRequested,
  setReconciliationConversationId,
  updateReconciliationResult,
  completeFromReconciliation,
  updateIfInitiated,
  completeFromCallback,
};
