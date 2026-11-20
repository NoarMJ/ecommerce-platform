const paymentService = require('../services/payment.service');
const mpesaService = require('../services/mpesaService');
const { getPaymentStatusForUser } = require('../services/paymentStatusService');
const { describeError } = require('../utils/logSafe');

function handleError(res, error, label) {
  if (error.isAppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(`${label}:`, describeError(error));
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
      userId: req.userId,
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

// POST /api/payments/order/:orderId/check-status
// Asks Safaricom for the prompt's result when the callback has not arrived.
async function checkPaymentStatus(req, res) {
  try {
    const result = await paymentService.checkMpesaPaymentStatus({
      orderId: req.params.orderId,
      userId: req.userId,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'checkPaymentStatus');
  }
}

// POST /api/payments/reconcile-receipt { orderId, receipt }
async function reconcilePaymentReceipt(req, res) {
  try {
    const result = await paymentService.reconcileMpesaPayment({
      orderId: req.body?.orderId,
      userId: req.userId,
      receipt: req.body?.receipt,
    });
    return res.status(202).json(result);
  } catch (error) {
    return handleError(res, error, 'reconcilePaymentReceipt');
  }
}

// POST /api/payments/stk-callback/:secret   (called by Safaricom, not by users)
// The secret is checked by requireCallbackSecret in paymentRoutes.
async function mpesaCallback(req, res) {
  try {
    const result = await mpesaService.receiveStkCallback(req.body);
    if (result.state === 'invalid') {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Callback payload is invalid.' });
    }
    if (result.state === 'unmatched') {
      // The inbox has safely retained it; a later worker pass can match it.
      return res.json({
        ResultCode: 0,
        ResultDesc: 'Callback recorded; payment result is not yet confirmed.',
      });
    }
    return res.json({ ResultCode: 0, ResultDesc: 'Callback recorded and processed.' });
  } catch (error) {
    console.error('mpesaCallback:', describeError(error));
    // Never acknowledge a callback that could not be durably recorded or
    // whose database processing failed. Safaricom may retry the delivery.
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Callback could not be recorded or processed.',
    });
  }
}

async function transactionStatusCallback(req, res) {
  try {
    await mpesaService.handleTransactionStatusCallback(req.body);
  } catch (error) {
    console.error('transactionStatusCallback:', describeError(error));
  }
  return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

async function transactionStatusTimeout(req, res) {
  try {
    await mpesaService.handleTransactionStatusTimeout(req.body);
  } catch (error) {
    console.error('transactionStatusTimeout:', describeError(error));
  }
  return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

// GET /api/payments/order/:orderId/status
async function getOrderPaymentStatus(req, res) {
  try {
    const status = await getPaymentStatusForUser(
      req.params.orderId,
      req.userId
    );

    if (!status) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.json(status);
  } catch (error) {
    return handleError(res, error, 'getOrderPaymentStatus');
  }
}

module.exports = {
  startMpesaPayment,
  checkPaymentStatus,
  reconcilePaymentReceipt,
  mpesaCallback,
  transactionStatusCallback,
  transactionStatusTimeout,
  getOrderPaymentStatus,
};
