const test = require('node:test');
const assert = require('node:assert/strict');
const paymentRepository = require('../../repositories/payment.repository');
const orderRepository = require('../../repositories/order.repository');
const mpesaService = require('../../services/mpesaService');
const paymentService = require('../../services/payment.service');
const { paymentEvents } = require('../../services/paymentEvents');

const orderId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '550e8400-e29b-41d4-a716-446655440001';

const MPESA_ENV = {
  MPESA_CONSUMER_KEY: 'test-key',
  MPESA_CONSUMER_SECRET: 'test-secret',
  MPESA_SHORTCODE: '174379',
  MPESA_PASSKEY: 'test-passkey',
  MPESA_CALLBACK_BASE_URL: 'https://example.invalid',
  MPESA_CALLBACK_SECRET: 'test-callback-secret',
};

let paymentCounter = 0;
const newPayment = (overrides = {}) => ({
  id: `payment-${(paymentCounter += 1)}`,
  orderId,
  status: 'initiated',
  checkoutRequestId: `ws_CO_${paymentCounter}`,
  amountMinor: 150000,
  mpesaReceiptNumber: null,
  createdAt: new Date(Date.now() - 2 * 60 * 1000),
  ...overrides,
});

// Replaces properties for one test and restores them afterwards.
function stub(t, target, replacements) {
  const originals = {};
  for (const [key, value] of Object.entries(replacements)) {
    originals[key] = target[key];
    target[key] = value;
  }
  t.after(() => Object.assign(target, originals));
}

// Fakes Safaricom: the token request, then the STK query answer.
function fakeSafaricom(t, queryStatus, queryBody) {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  Object.assign(process.env, MPESA_ENV);
  global.fetch = async (url) => {
    if (String(url).includes('/oauth/')) {
      return { ok: true, json: async () => ({ access_token: 'token' }) };
    }
    return { ok: queryStatus < 400, status: queryStatus, json: async () => queryBody };
  };
  t.after(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });
}

test('STK query: a timeout result marks the payment failed with code 1037', async (t) => {
  fakeSafaricom(t, 200, { ResponseCode: '0', ResultCode: '1037', ResultDesc: 'DS timeout user cannot be reached' });
  let saved;
  stub(t, paymentRepository, {
    updateIfInitiated: async (id, data) => { saved = data; return true; },
  });
  const events = [];
  const onUpdate = (event) => events.push(event);
  paymentEvents.on('payment-updated', onUpdate);
  t.after(() => paymentEvents.off('payment-updated', onUpdate));

  const result = await mpesaService.queryStkPushResult(newPayment());

  assert.equal(result.state, 'updated');
  assert.equal(saved.status, 'failed');
  assert.equal(saved.resultCode, 1037);
  assert.deepEqual(events, [{ orderId }]);
});

test('STK query: a cancelled result marks the payment cancelled', async (t) => {
  fakeSafaricom(t, 200, { ResponseCode: '0', ResultCode: '1032', ResultDesc: 'Request cancelled by user' });
  let saved;
  stub(t, paymentRepository, {
    updateIfInitiated: async (id, data) => { saved = data; return true; },
  });

  await mpesaService.queryStkPushResult(newPayment());

  assert.equal(saved.status, 'cancelled');
});

test('STK query: success settles the order without a receipt', async (t) => {
  fakeSafaricom(t, 200, { ResponseCode: '0', ResultCode: '0', ResultDesc: 'The service request is processed successfully.' });
  let completed;
  stub(t, paymentRepository, {
    completeFromCallback: async (args) => { completed = args; return true; },
  });

  const result = await mpesaService.queryStkPushResult(newPayment());

  assert.equal(result.state, 'updated');
  assert.equal(completed.status, 'succeeded');
  assert.equal(completed.receipt, null);
});

test('STK query: "still processing" leaves the payment untouched', async (t) => {
  fakeSafaricom(t, 500, { errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' });
  let touched = false;
  stub(t, paymentRepository, {
    updateIfInitiated: async () => { touched = true; return true; },
    completeFromCallback: async () => { touched = true; return true; },
  });

  const result = await mpesaService.queryStkPushResult(newPayment());

  assert.equal(result.state, 'pending');
  assert.equal(touched, false);
});

test('late success callback fills in the receipt the status query could not give', async (t) => {
  const payment = newPayment({ status: 'succeeded' });
  let filled;
  stub(t, paymentRepository, {
    findByCheckoutRequestId: async () => payment,
    setReceiptIfMissing: async (id, receipt) => { filled = { id, receipt }; return true; },
  });

  await mpesaService.handleStkCallback({
    Body: {
      stkCallback: {
        CheckoutRequestID: payment.checkoutRequestId,
        ResultCode: 0,
        ResultDesc: 'ok',
        CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 'QHX7ABC123' }, { Name: 'Amount', Value: 1500 }] },
      },
    },
  });

  assert.deepEqual(filled, { id: payment.id, receipt: 'QHX7ABC123' });
});

test('success callback for a payment already marked failed is flagged for review', async (t) => {
  const payment = newPayment({ status: 'failed' });
  let flagged;
  stub(t, paymentRepository, {
    findByCheckoutRequestId: async () => payment,
    flagLateSuccess: async (id, data) => { flagged = { id, ...data }; return true; },
  });
  stub(t, console, { error: () => {} });

  await mpesaService.handleStkCallback({
    Body: {
      stkCallback: {
        CheckoutRequestID: payment.checkoutRequestId,
        ResultCode: 0,
        CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 'QHX7ABC999' }] },
      },
    },
  });

  assert.equal(flagged.id, payment.id);
  assert.equal(flagged.receipt, 'QHX7ABC999');
});

test('check status: does not query Safaricom while the prompt is still on the phone', async (t) => {
  stub(t, orderRepository, { findByIdForUser: async () => ({ id: orderId, paymentMethod: 'mpesa' }) });
  stub(t, paymentRepository, {
    findInitiatedForOrder: async () => newPayment({ createdAt: new Date() }),
  });
  let queried = false;
  stub(t, mpesaService, { queryStkPushResult: async () => { queried = true; return { state: 'pending' }; } });

  const result = await paymentService.checkMpesaPaymentStatus({ orderId, userId });

  assert.equal(result.pending, true);
  assert.equal(queried, false);
});

test('check status: reports when the payment already has a result', async (t) => {
  stub(t, orderRepository, { findByIdForUser: async () => ({ id: orderId, paymentMethod: 'mpesa' }) });
  stub(t, paymentRepository, { findInitiatedForOrder: async () => null });

  const result = await paymentService.checkMpesaPaymentStatus({ orderId, userId });

  assert.equal(result.pending, false);
});

test('check status: an older prompt is queried', async (t) => {
  stub(t, orderRepository, { findByIdForUser: async () => ({ id: orderId, paymentMethod: 'mpesa' }) });
  stub(t, paymentRepository, { findInitiatedForOrder: async () => newPayment() });
  stub(t, mpesaService, { queryStkPushResult: async () => ({ state: 'updated' }) });

  const result = await paymentService.checkMpesaPaymentStatus({ orderId, userId });

  assert.equal(result.pending, false);
});
