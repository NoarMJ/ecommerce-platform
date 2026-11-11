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

  // Don't fire a second prompt while one is still waiting.
  const recent = await paymentRepository.findRecentInitiated(
    order.id,
    new Date(Date.now() - 2 * 60 * 1000)
  );
  if (recent) {
    throw new AppError('A payment prompt was already sent. Check your phone.', 409);
  }

  return mpesaService.initiateStkPush({ order, userId, phone });
};

module.exports = { startMpesaPayment };