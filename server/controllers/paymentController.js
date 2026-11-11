const paymentService = require('../services/payment.service');
const mpesaService = require('../services/mpesaService');
const { getPaymentStatusForUser } = require('../services/paymentStatusService');

function handleError(res, error, label) {
  if (error.isAppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(`${label}:`, error);
  return res
    .status(500)
    .json({ message: 'Something went wrong. Please try again.' });
}

// POST /api/payments/stk-push   body: { orderId, phone }
async function startMpesaPayment(req, res) {
  try {
    const { orderId, phone } = req.body ?? {};

    const payment = await paymentService.startMpesaPayment({
      orderId,
      userId: req.session.userId,
      phone,
    });

    return res.status(202).json({
      message: 'Check your phone and enter your M-Pesa PIN.',
      paymentId: payment.id,
    });
  } catch (error) {
    return handleError(res, error, 'startMpesaPayment');
  }
}

// POST /api/payments/stk-callback/:secret   (called by Safaricom, not by users)
async function mpesaCallback(req, res) {
  if (req.params.secret !== process.env.MPESA_CALLBACK_SECRET) {
    return res.status(404).end();
  }

  try {
    console.log('M-Pesa callback received:', JSON.stringify(req.body));
    await mpesaService.handleStkCallback(req.body);
  } catch (error) {
    console.error('mpesaCallback:', error);
  }

  // Always acknowledge, so Safaricom doesn't keep retrying.
  return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

// GET /api/payments/order/:orderId/status
async function getOrderPaymentStatus(req, res) {
  try {
    const status = await getPaymentStatusForUser(
      req.params.orderId,
      req.session.userId
    );

    if (!status) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.json(status);
  } catch (error) {
    return handleError(res, error, 'getOrderPaymentStatus');
  }
}

module.exports = { startMpesaPayment, mpesaCallback, getOrderPaymentStatus };