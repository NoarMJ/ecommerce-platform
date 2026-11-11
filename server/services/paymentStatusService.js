const orderRepository = require('../repositories/order.repository');
const paymentRepository = require('../repositories/payment.repository');
const { isUuid } = require('../utils/ids');

// The single shape the payment page reads. Used by the HTTP route and the socket.
async function buildStatus(order) {
  const payment = await paymentRepository.findLatestForOrder(order.id);

  return {
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    latestPayment: payment
      ? {
          status: payment.status,
          resultDesc: payment.resultDesc ?? undefined,
          receipt: payment.mpesaReceiptNumber ?? undefined,
          startedAt: payment.createdAt,
        }
      : null,
  };
}

// Returns null if the order doesn't exist or belongs to someone else.
async function getPaymentStatusForUser(orderId, userId) {
  if (!isUuid(orderId) || !isUuid(userId)) return null;

  const order = await orderRepository.findStatusByIdForUser(orderId, userId);

  return order ? buildStatus(order) : null;
}

// No ownership check: only for pushing to sockets that already passed one.
async function getPaymentStatusForOrder(orderId) {
  if (!isUuid(orderId)) return null;

  const order = await orderRepository.findStatusById(orderId);

  return order ? buildStatus(order) : null;
}

module.exports = { getPaymentStatusForUser, getPaymentStatusForOrder };