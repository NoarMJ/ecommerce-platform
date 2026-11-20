const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const paymentController = require('../controllers/paymentController');
const { callbackRateLimit, requireCallbackSecret } = require('../middleware/mpesaCallbackGuard');

const router = express.Router();

// Public on purpose: Safaricom calls these. The secret in the URL guards them,
// checked in constant time, behind a per-address rate limit.
const safaricomOnly = [callbackRateLimit, requireCallbackSecret];
router.post('/stk-callback/:secret', safaricomOnly, paymentController.mpesaCallback);
router.post('/transaction-status/:secret', safaricomOnly, paymentController.transactionStatusCallback);
router.post('/transaction-status-timeout/:secret', safaricomOnly, paymentController.transactionStatusTimeout);

router.post('/stk-push', requireAuth, paymentController.startMpesaPayment);
router.post('/reconcile-receipt', requireAuth, paymentController.reconcilePaymentReceipt);
router.get('/order/:orderId/status', requireAuth, paymentController.getOrderPaymentStatus);
router.post('/order/:orderId/check-status', requireAuth, paymentController.checkPaymentStatus);

module.exports = router;
