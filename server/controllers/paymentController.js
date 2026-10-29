const mongoose = require('mongoose');
const Order = require('../models/order');
const Payment = require('../models/payment');
const mpesaService = require('../services/mpesaService');

// POST /api/payments/stk-push   body: { orderId, phone }
async function startMpesaPayment(req, res) {
  try {
    const { orderId, phone } = req.body ?? {};

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // The order must belong to the logged-in customer.
    const order = await Order.findOne({ _id: orderId, user: req.session.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (
      order.paymentMethod !== 'mpesa' ||
      order.paymentStatus !== 'pending' ||
      order.orderStatus !== 'pending'
    ) {
      return res.status(409).json({ message: 'This order cannot be paid with M-Pesa.' });
    }

    // Don't fire a second prompt while one is still waiting.
    const recent = await Payment.findOne({
      order: order._id,
      status: 'initiated',
      createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) },
    });
    if (recent) {
      return res.status(409).json({
        message: 'A payment prompt was already sent. Check your phone.',
      });
    }

    const payment = await mpesaService.initiateStkPush({
      order,
      userId: req.session.userId,
      phone,
    });

    return res.status(202).json({
      message: 'Check your phone and enter your M-Pesa PIN.',
      paymentId: payment._id,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('startMpesaPayment:', error);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
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
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.session.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const payment = await Payment.findOne({ order: order._id })
      .sort({ createdAt: -1 })
      .select('status resultDesc mpesaReceiptNumber createdAt');

    return res.json({
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
    });
  } catch (error) {
    console.error('getOrderPaymentStatus:', error);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
}

module.exports = { startMpesaPayment, mpesaCallback, getOrderPaymentStatus };
