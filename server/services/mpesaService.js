const paymentRepository = require('../repositories/payment.repository');
const { paymentEvents } = require('./paymentEvents');
const { normaliseKenyanPhone } = require('../utils/phone');
const AppError = require('../utils/AppError');

const BASE_URL =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

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
    throw new AppError('M-Pesa payments are not configured.', 500);
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
    throw new AppError('Could not reach M-Pesa. Please try again.', 502);
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
    throw new AppError('Please enter a valid Kenyan phone number.', 400);
  }
  const msisdn = normalised.replace('+', ''); // Safaricom wants 2547XXXXXXXX

  // Create our record first, so the callback always has something to match.
  const payment = await paymentRepository.create({
    orderId: order.id,
    userId,
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
      throw new AppError(
        'M-Pesa could not send the payment prompt. Please try again.',
        502
      );
    }

    return await paymentRepository.update(payment.id, {
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
    });
  } catch (error) {
    await paymentRepository.update(payment.id, {
      status: 'failed',
      resultDesc: error.message,
    });
    throw error;
  }
}

// Safaricom's values are untrusted, so only accept the right types.
const asInt = (value) => (Number.isInteger(value) ? value : null);
const asText = (value) => (typeof value === 'string' ? value : null);

// Called when Safaricom reports what happened. This is the only thing
// allowed to mark an order as paid.
async function handleStkCallback(body) {
  const callback = body?.Body?.stkCallback;

  if (typeof callback?.CheckoutRequestID !== 'string') {
    console.warn('Ignoring malformed M-Pesa callback:', JSON.stringify(body));
    return;
  }

  const payment = await paymentRepository.findByCheckoutRequestId(
    callback.CheckoutRequestID
  );

  if (!payment) {
    console.warn('Callback for an unknown payment:', callback.CheckoutRequestID);
    return;
  }

  const resultCode = asInt(callback.ResultCode);
  const resultDesc = asText(callback.ResultDesc);

  // Failure, cancellation or timeout.
  if (callback.ResultCode !== 0) {
    const changed = await paymentRepository.updateIfInitiated(payment.id, {
      status: callback.ResultCode === 1032 ? 'cancelled' : 'failed',
      resultCode,
      resultDesc,
      rawCallback: body,
    });

    if (changed) paymentEvents.emit('payment-updated', { orderId: payment.orderId });
    return;
  }

  // Success: read the details Safaricom sends.
  const items = callback.CallbackMetadata?.Item ?? [];
  const read = (name) => items.find((item) => item.Name === name)?.Value;

  const paidAmount = Number(read('Amount'));
  const receipt = read('MpesaReceiptNumber');
  const receiptText = receipt ? String(receipt) : null;
  const expectedAmount = Math.ceil(payment.amountMinor / 100);
  const amountMatches = paidAmount === expectedAmount;

  let changed;

  try {
    // The "still initiated" condition makes a duplicate callback harmless.
    changed = await paymentRepository.completeFromCallback({
      payment,
      status: amountMatches ? 'succeeded' : 'needs_review',
      receipt: receiptText,
      resultCode,
      resultDesc,
      rawCallback: body,
    });
  } catch (error) {
    if (error.code !== 'P2002') throw error;

    // The same receipt number is already on another payment. Check by hand.
    console.error(`Payment ${payment.id}: duplicate receipt ${receiptText}. Check by hand.`);

    changed = await paymentRepository.updateIfInitiated(payment.id, {
      status: 'needs_review',
      resultCode,
      resultDesc: 'Duplicate receipt number',
      rawCallback: body,
    });
  }

  if (!changed) return; // already handled

  if (!amountMatches) {
    console.error(
      `Payment ${payment.id}: expected KSh ${expectedAmount} but received ${paidAmount}. Check by hand.`
    );
  }

  paymentEvents.emit('payment-updated', { orderId: payment.orderId });
}

module.exports = { initiateStkPush, handleStkCallback };