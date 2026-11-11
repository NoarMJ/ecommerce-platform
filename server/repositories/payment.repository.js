const prisma = require('../config/prisma');

const create = (data) => prisma.payment.create({ data });

const update = (id, data) => prisma.payment.update({ where: { id }, data });

const findByCheckoutRequestId = (checkoutRequestId) =>
  prisma.payment.findUnique({ where: { checkoutRequestId } });

// A prompt that is still waiting, started after the given time
const findRecentInitiated = (orderId, since) =>
  prisma.payment.findFirst({
    where: { orderId, status: 'initiated', createdAt: { gt: since } },
  });

const findLatestForOrder = (orderId) =>
  prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      resultDesc: true,
      mpesaReceiptNumber: true,
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
  findRecentInitiated,
  findLatestForOrder,
  updateIfInitiated,
  completeFromCallback,
};