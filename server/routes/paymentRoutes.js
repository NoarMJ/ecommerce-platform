const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Public on purpose: Safaricom calls this. The secret in the URL guards it.
router.post('/stk-callback/:secret', paymentController.mpesaCallback);

router.post('/stk-push', requireAuth, paymentController.startMpesaPayment);
router.get('/order/:orderId/status', requireAuth, paymentController.getOrderPaymentStatus);

module.exports = router;