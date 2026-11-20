const test = require('node:test');
const assert = require('node:assert/strict');
const paymentRepository = require('../../repositories/payment.repository');
const mpesaService = require('../../services/mpesaService');

function stub(t, target, replacements) {
  const originals = {};
  for (const [key, value] of Object.entries(replacements)) {
    originals[key] = target[key];
    target[key] = value;
  }
  t.after(() => Object.assign(target, originals));
}

const callbackBody = {
  Body: {
    stkCallback: {
      CheckoutRequestID: 'ws_CO_inbox_test',
      ResultCode: 1032,
      ResultDesc: 'Request cancelled by user',
    },
  },
};

test('M-Pesa callback is recorded before an unmatched result is returned', async (t) => {
  const calls = [];
  const event = { id: 'event-1', status: 'pending', body: callbackBody };
  stub(t, paymentRepository, {
    recordStkCallbackEvent: async (data) => {
      calls.push('record');
      assert.equal(data.checkoutRequestId, 'ws_CO_inbox_test');
      return event;
    },
    findByCheckoutRequestId: async () => {
      calls.push('match');
      return null;
    },
    updateStkCallbackEvent: async (id, data) => {
      calls.push('update');
      assert.equal(id, event.id);
      assert.equal(data.status, 'unmatched');
    },
  });

  const result = await mpesaService.receiveStkCallback(callbackBody);

  assert.deepEqual(result, { state: 'unmatched' });
  assert.deepEqual(calls, ['record', 'match', 'update']);
});

test('callback database processing errors are thrown and left retryable', async (t) => {
  const event = { id: 'event-2', status: 'pending', body: callbackBody };
  const updates = [];
  stub(t, paymentRepository, {
    recordStkCallbackEvent: async () => event,
    findByCheckoutRequestId: async () => { throw new Error('database unavailable'); },
    updateStkCallbackEvent: async (id, data) => updates.push({ id, ...data }),
  });

  await assert.rejects(mpesaService.receiveStkCallback(callbackBody), /database unavailable/);
  assert.equal(updates[0].status, 'failed');
  assert.equal(updates[0].lastError, 'database unavailable');
});

test('an already processed duplicate callback is not applied again', async (t) => {
  let matched = false;
  stub(t, paymentRepository, {
    recordStkCallbackEvent: async () => ({ id: 'event-3', status: 'processed', body: callbackBody }),
    findByCheckoutRequestId: async () => { matched = true; return null; },
  });

  const result = await mpesaService.receiveStkCallback(callbackBody);

  assert.deepEqual(result, { state: 'processed', duplicate: true });
  assert.equal(matched, false);
});
