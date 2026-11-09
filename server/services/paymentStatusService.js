const mongoose = require('mongoose');
const Order = require('../models/order');
const Payment = require('../models/payment');

const ORDER_FIELDS = 'paymentMethod paymentStatus orderStatus';

// The single shape the payment page reads. Used by the HTTP route and the socket.
async function buildStatus(order) {
  const payment = await Payment.findOne({ order: order._id })
    .sort({ createdAt: -1 })
    .select('status resultDesc mpesaReceiptNumber createdAt')
    .lean();

  return {
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    latestPayment: payment
      ? {
          status: payment.status,
          resultDesc: payment.resultDesc,
          receipt: payment.mpesaReceiptNumber,
          startedAt: payment.createdAt,
        }
      : null,
  };
}

// Returns null if the order doesn't exist or belongs to someone else.
async function getPaymentStatusForUser(orderId, userId) {
  if (!userId || !mongoose.isValidObjectId(orderId)) return null;

  const order = await Order.findOne({ _id: orderId, user: userId })
    .select(ORDER_FIELDS)
    .lean();

  return order ? buildStatus(order) : null;
}

// No ownership check: only for pushing to sockets that already passed one.
async function getPaymentStatusForOrder(orderId) {
  const order = await Order.findById(orderId).select(ORDER_FIELDS).lean();
  return order ? buildStatus(order) : null;
}

module.exports = { getPaymentStatusForUser, getPaymentStatusForOrder };