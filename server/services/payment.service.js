const orderRepository = require('../repositories/order.repository');
const paymentRepository = require('../repositories/payment.repository');
const mpesaService = require('./mpesaService');
const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/ids');

const startMpesaPayment = async ({ orderId, userId, phone }) => {
  if (!isUuid(orderId)) throw new AppError('Order not found.', 404);

  // The order must belong to the logged-in customer.
  const order = await orderRepository.findByIdForUser(orderId, userId);
  if (!order) throw new AppError('Order not found.', 404);

  if (
    order.paymentMethod !== 'mpesa' ||
    order.paymentStatus !== 'pending' ||
    order.orderStatus !== 'pending'
  ) {
    throw new AppError('This order cannot be paid with M-Pesa.', 409);
  }

  // Don't send another prompt while the last attempt has no verified result.
  // A time-based expiry can cause duplicate charges if the customer completes
  // the original prompt after our local timeout.
  const pending = await paymentRepository.findInitiatedForOrder(order.id);
  if (pending) {
    throw new AppError(
      'The previous M-Pesa prompt has no confirmed result yet. Check its status before trying again.',
      409
    );
  }

  return mpesaService.initiateStkPush({ order, userId, phone });
};

const reconcileMpesaPayment = async ({ orderId, userId, receipt }) => {
  if (!isUuid(orderId)) throw new AppError('Order not found.', 404);
  if (typeof receipt !== 'string' || !/^[A-Z0-9]{8,12}$/i.test(receipt.trim())) {
    throw new AppError('Enter the M-Pesa receipt code from your confirmation message.', 400);
  }

  const order = await orderRepository.findByIdForUser(orderId, userId);
  if (!order) throw new AppError('Order not found.', 404);
  if (order.paymentMethod !== 'mpesa' || order.paymentStatus !== 'pending') {
    throw new AppError('This order is not waiting for an M-Pesa payment.', 409);
  }

  const payment = await paymentRepository.findInitiatedForOrder(order.id);
  if (!payment) throw new AppError('There is no unresolved M-Pesa prompt for this order.', 409);

  const cleanReceipt = receipt.trim().toUpperCase();
  const existing = await paymentRepository.findByAnyReceipt(cleanReceipt);
  if (existing && existing.id !== payment.id) {
    throw new AppError('That M-Pesa receipt has already been submitted for another order.', 409);
  }

  const now = new Date();
  const isCheckPending = payment.reconciliationStatus === 'pending' &&
    payment.reconciliationRequestedAt &&
    now.getTime() - payment.reconciliationRequestedAt.getTime() < 30000;
  if (isCheckPending) {
    throw new AppError('Safaricom is still checking this receipt. Please wait for the result.', 409);
  }

  const marked = await paymentRepository.markReconciliationRequested({
    paymentId: payment.id,
    receipt: cleanReceipt,
    requestedAt: now,
  });
  if (!marked) throw new AppError('This M-Pesa prompt has already been resolved.', 409);

  const currentPayment = {
    ...payment,
    reconciliationReceipt: cleanReceipt,
    reconciliationStatus: 'pending',
  };
  await mpesaService.verifyTransactionReceipt({ payment: currentPayment, order, receipt: cleanReceipt });

  return { message: 'Safaricom is checking the receipt. This page will update when the result arrives.' };
};

module.exports = { startMpesaPayment, reconcileMpesaPayment };
