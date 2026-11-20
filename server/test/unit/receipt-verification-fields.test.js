const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../../config/prisma');
const paymentRepository = require('../../repositories/payment.repository');

// Runs a repository transaction against a fake client and records every
// payment update, so tests can check which fields a receipt check writes.
function fakeTransaction(t, { existingVerification = null } = {}) {
  const paymentUpdates = [];
  const tx = {
    paymentReceiptVerification: {
      findUnique: async () => existingVerification,
      updateMany: async () => ({ count: 1 }),
      update: async () => ({}),
      create: async () => ({}),
    },
    payment: {
      updateMany: async (args) => {
        paymentUpdates.push(args.data);
        return { count: 1 };
      },
    },
  };
  const original = prisma.$transaction;
  prisma.$transaction = async (fn) => fn(tx);
  t.after(() => { prisma.$transaction = original; });
  return paymentUpdates;
}

const PROMPT_FIELDS = ['resultCode', 'resultDesc', 'rawCallback'];

test('a failed receipt check keeps the STK prompt\'s own result fields', async (t) => {
  const paymentUpdates = fakeTransaction(t);

  const changed = await paymentRepository.updateReconciliationResult({
    paymentId: 'payment-1',
    receipt: 'TEST000001',
    status: 'not_found',
    resultCode: 2032,
    resultDesc: 'The transaction receipt number does not exist.',
    rawCallback: { Result: {} },
  });

  assert.equal(changed, true);
  assert.deepEqual(paymentUpdates, [{ reconciliationStatus: 'not_found' }]);
});

test('starting a receipt check does not clear the STK prompt\'s result fields', async (t) => {
  const paymentUpdates = fakeTransaction(t);

  await paymentRepository.markReconciliationRequested({
    paymentId: 'payment-1',
    receipt: 'TEST000001',
    requestedAt: new Date(),
  });

  assert.equal(paymentUpdates.length, 1);
  for (const field of PROMPT_FIELDS) {
    assert.equal(field in paymentUpdates[0], false, `${field} must not be written`);
  }
  assert.equal(paymentUpdates[0].reconciliationStatus, 'pending');
});
