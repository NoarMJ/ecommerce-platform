const mongoose = require('mongoose');

const PAYMENT_STATUSES = [
  'initiated',     // prompt sent, waiting for the customer
  'succeeded',
  'failed',
  'cancelled',     // customer dismissed the prompt
  'needs_review',  // money arrived but something doesn't match; check by hand
];

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, default: 'mpesa' },
    phone: { type: String, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'initiated' },

    merchantRequestId: { type: String },
    checkoutRequestId: { type: String, unique: true, sparse: true },
    mpesaReceiptNumber: { type: String },

    resultCode: { type: Number },
    resultDesc: { type: String },
    rawCallback: { type: mongoose.Schema.Types.Mixed }, // kept for audit
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);