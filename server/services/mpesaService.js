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

function assertTransactionStatusConfigured() {
  assertConfigured();
  const required = ['MPESA_INITIATOR_NAME', 'MPESA_SECURITY_CREDENTIAL'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error('Missing M-Pesa transaction status settings:', missing.join(', '));
    throw new AppError('M-Pesa receipt verification is not configured.', 503);
  }
}

async function verifyTransactionReceipt({ payment, order, receipt }) {
  assertTransactionStatusConfigured();
  const callbackBase = process.env.MPESA_CALLBACK_BASE_URL.replace(/\/$/, '');
  const callbackSecret = process.env.MPESA_CALLBACK_SECRET;
  const resultUrl = `${callbackBase}/api/payments/transaction-status/${callbackSecret}`;
  const timeoutUrl = `${callbackBase}/api/payments/transaction-status-timeout/${callbackSecret}`;

  try {
    const token = await getAccessToken();
    const response = await fetch(`${BASE_URL}/mpesa/transactionstatus/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Initiator: process.env.MPESA_INITIATOR_NAME,
        SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
        CommandID: 'TransactionStatusQuery',
        TransactionID: receipt,
        PartyA: process.env.MPESA_SHORTCODE,
        IdentifierType: '4',
        ResultURL: resultUrl,
        QueueTimeOutURL: timeoutUrl,
        Remarks: 'Customer payment reconciliation',
        Occasion: String(order.orderNumber).slice(-12),
      }),
    });
    const data = await response.json();

    if (!response.ok || String(data.ResponseCode) !== '0') {
      throw new AppError(data.ResponseDescription || 'Safaricom could not check this receipt.', 502);
    }

    if (data.OriginatorConversationID) {
      await paymentRepository.setReconciliationConversationId(
        payment.id,
        receipt,
        String(data.OriginatorConversationID)
      );
    }
    paymentEvents.emit('payment-updated', { orderId: payment.orderId });
    return data;
  } catch (error) {
    await paymentRepository.updateReconciliationResult({
      paymentId: payment.id,
      receipt,
      status: 'failed',
      resultDesc: error.message,
    });
    paymentEvents.emit('payment-updated', { orderId: payment.orderId });
    throw error;
  }
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

const statusResultValues = (result) => {
  const parameters = result?.ResultParameters?.ResultParameter;
  if (Array.isArray(parameters)) return parameters;
  return parameters ? [parameters] : [];
};

async function handleTransactionStatusCallback(body) {
  const result = body?.Result;
  const conversationId = result?.OriginatorConversationID;
  if (typeof conversationId !== 'string') {
    console.warn('Ignoring malformed M-Pesa transaction status callback.');
    return;
  }

  const values = statusResultValues(result);
  const valueFor = (names) => values.find((item) => names.includes(item?.Key))?.Value;
  const receiptValue = valueFor(['TransactionReceipt', 'ReceiptNo', 'MpesaReceiptNumber']);
  const receipt = String(receiptValue || result.TransactionID || '');
  let payment = await paymentRepository.findByReconciliationConversationId(conversationId);
  // Safaricom can return the result very quickly, before the initiating HTTP
  // response's conversation ID has been committed. The submitted receipt is
  // unique and safely identifies that in-flight reconciliation request.
  if (!payment && receipt) payment = await paymentRepository.findByAnyReceipt(receipt);
  if (!payment || payment.reconciliationStatus !== 'pending') {
    console.warn('Transaction status callback did not match an active reconciliation.');
    return;
  }

  const resultCode = Number(result.ResultCode);
  const resultDesc = typeof result.ResultDesc === 'string' ? result.ResultDesc : 'Safaricom returned a transaction status.';
  if (resultCode !== 0) {
    const status = /not found|does not exist|invalid transaction/i.test(resultDesc) ? 'not_found' : 'failed';
    const changed = await paymentRepository.updateReconciliationResult({
      paymentId: payment.id,
      receipt: payment.reconciliationReceipt,
      status,
      resultCode: Number.isInteger(resultCode) ? resultCode : null,
      resultDesc,
      rawCallback: body,
    });
    if (changed) paymentEvents.emit('payment-updated', { orderId: payment.orderId });
    return;
  }

  const returnedReceipt = String(receiptValue || result.TransactionID || '');
  const amount = Number(valueFor(['TransactionAmount', 'Amount']));
  const expectedAmount = Math.ceil(payment.amountMinor / 100);
  const debitNames = values.filter((item) => item?.Key === 'DebitPartyName').map((item) => String(item.Value ?? ''));
  const payerMsisdn = debitNames.map((entry) => entry.match(/254[17]\d{8}/)?.[0]).find(Boolean);
  const receiptMatches = returnedReceipt.toUpperCase() === String(payment.reconciliationReceipt).toUpperCase();
  const amountMatches = Number.isFinite(amount) && amount === expectedAmount;
  const payerMatches = !payerMsisdn || payerMsisdn === payment.phone;

  if (!receiptMatches || !amountMatches || !payerMatches) {
    const reasons = [];
    if (!receiptMatches) reasons.push('receipt did not match');
    if (!amountMatches) reasons.push('amount did not match this order');
    if (!payerMatches) reasons.push('payer phone did not match the prompt');
    const changed = await paymentRepository.updateReconciliationResult({
      paymentId: payment.id,
      receipt: payment.reconciliationReceipt,
      status: 'mismatch',
      resultCode,
      resultDesc: `Safaricom found a transaction, but the ${reasons.join(', ')}.`,
      rawCallback: body,
    });
    if (changed) paymentEvents.emit('payment-updated', { orderId: payment.orderId });
    return;
  }

  try {
    const changed = await paymentRepository.completeFromReconciliation({
      payment,
      receipt: returnedReceipt,
      resultCode,
      resultDesc,
      rawCallback: body,
    });
    if (changed) paymentEvents.emit('payment-updated', { orderId: payment.orderId });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    const changed = await paymentRepository.updateReconciliationResult({
      paymentId: payment.id,
      receipt: payment.reconciliationReceipt,
      status: 'mismatch',
      resultCode,
      resultDesc: 'This M-Pesa receipt is already attached to another payment.',
      rawCallback: body,
    });
    if (changed) paymentEvents.emit('payment-updated', { orderId: payment.orderId });
  }
}

async function handleTransactionStatusTimeout(body) {
  const conversationId = body?.OriginatorConversationID || body?.Result?.OriginatorConversationID;
  if (typeof conversationId !== 'string') return;
  const payment = await paymentRepository.findByReconciliationConversationId(conversationId);
  if (!payment) return;
  const changed = await paymentRepository.updateReconciliationResult({
    paymentId: payment.id,
    receipt: payment.reconciliationReceipt,
    status: 'failed',
    resultDesc: 'Safaricom did not return a transaction status. You can check the receipt again.',
    rawCallback: body,
  });
  if (changed) paymentEvents.emit('payment-updated', { orderId: payment.orderId });
}

module.exports = {
  initiateStkPush,
  handleStkCallback,
  verifyTransactionReceipt,
  handleTransactionStatusCallback,
  handleTransactionStatusTimeout,
};
