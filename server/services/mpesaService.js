const Payment = require('../models/payment');
const Order = require('../models/order');
const { normaliseKenyanPhone } = require('./orderService');

const BASE_URL =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function assertConfigured() {
  const required = [
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_BASE_URL',
    'MPESA_CALLBACK_SECRET',
  ];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error('Missing M-Pesa settings in .env:', missing.join(', '));
    throw httpError(500, 'M-Pesa payments are not configured.');
  }
}

// Safaricom gives us a short-lived token in exchange for our key and secret.
async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  if (!response.ok) {
    console.error('M-Pesa token request failed:', response.status, await response.text());
    throw httpError(502, 'Could not reach M-Pesa. Please try again.');
  }

  const data = await response.json();
  return data.access_token;
}

// YYYYMMDDHHmmss
function createTimestamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

// Sends the payment prompt to the customer's phone.
async function initiateStkPush({ order, userId, phone }) {
  assertConfigured();

  const normalised = normaliseKenyanPhone(phone);
  if (!normalised) {
    throw httpError(400, 'Please enter a valid Kenyan phone number.');
  }
  const msisdn = normalised.replace('+', ''); // Safaricom wants 2547XXXXXXXX

  // Create our record first, so the callback always has something to match.
  const payment = await Payment.create({
    order: order._id,
    user: userId,
    phone: msisdn,
    amountMinor: order.totalMinor,
  });

  try {
    const token = await getAccessToken();
    const timestamp = createTimestamp();
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const callbackUrl =
      `${process.env.MPESA_CALLBACK_BASE_URL}` +
      `/api/payments/stk-callback/${process.env.MPESA_CALLBACK_SECRET}`;

    const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', // Till numbers use CustomerBuyGoodsOnline
        Amount: Math.ceil(order.totalMinor / 100), // whole shillings only
        PartyA: msisdn,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: msisdn,
        CallBackURL: callbackUrl,
        AccountReference: order.orderNumber.slice(-12), // max 12 characters
        TransactionDesc: 'Order payment',
      }),
    });

    const data = await response.json();

    if (!response.ok || data.ResponseCode !== '0') {
      console.error('STK push rejected:', response.status, data);
      throw httpError(502, 'M-Pesa could not send the payment prompt. Please try again.');
    }

    payment.checkoutRequestId = data.CheckoutRequestID;
    payment.merchantRequestId = data.MerchantRequestID;
    await payment.save();

    return payment;
  } catch (error) {
    payment.status = 'failed';
    payment.resultDesc = error.message;
    await payment.save();
    throw error;
  }
}

// Called when Safaricom reports what happened. This is the only thing
// allowed to mark an order as paid.
async function handleStkCallback(body) {
  const callback = body?.Body?.stkCallback;

  if (!callback?.CheckoutRequestID) {
    console.warn('Ignoring malformed M-Pesa callback:', JSON.stringify(body));
    return;
  }

  const payment = await Payment.findOne({ checkoutRequestId: callback.CheckoutRequestID });

  if (!payment) {
    console.warn('Callback for an unknown payment:', callback.CheckoutRequestID);
    return;
  }

  // Failure, cancellation or timeout.
  if (callback.ResultCode !== 0) {
    await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'initiated' },
      {
        $set: {
          status: callback.ResultCode === 1032 ? 'cancelled' : 'failed',
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc,
          rawCallback: body,
        },
      }
    );
    return;
  }

  // Success: read the details Safaricom sends.
  const items = callback.CallbackMetadata?.Item ?? [];
  const read = (name) => items.find((item) => item.Name === name)?.Value;

  const paidAmount = Number(read('Amount'));
  const receipt = read('MpesaReceiptNumber');
  const expectedAmount = Math.ceil(payment.amountMinor / 100);
  const amountMatches = paidAmount === expectedAmount;

  // The status condition makes a duplicate callback harmless.
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'initiated' },
    {
      $set: {
        status: amountMatches ? 'succeeded' : 'needs_review',
        mpesaReceiptNumber: receipt ? String(receipt) : undefined,
        resultCode: callback.ResultCode,
        resultDesc: callback.ResultDesc,
        rawCallback: body,
      },
    },
    { new: true }
  );

  if (!updated) return; // already handled

  if (!amountMatches) {
    console.error(
      `Payment ${payment._id}: expected KSh ${expectedAmount} but received ${paidAmount}. Check by hand.`
    );
    return;
  }

  await Order.updateOne(
    { _id: payment.order, paymentStatus: 'pending' },
    { $set: { paymentStatus: 'paid' } }
  );
}

module.exports = { initiateStkPush, handleStkCallback };