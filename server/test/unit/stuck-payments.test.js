const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../../config/prisma');
const paymentRepository = require('../../repositories/payment.repository');
const orderRepository = require('../../repositories/order.repository');
const mpesaService = require('../../services/mpesaService');
const {
  pickDueOldPayments,
  runStkQuerySweep,
} = require('../../jobs/queryPendingStkPayments');

const MINUTE = 60 * 1000;

function stub(t, target, replacements) {
  const originals = {};
  for (const [key, value] of Object.entries(replacements)) {
    originals[key] = target[key];
    target[key] = value;
  }
  t.after(() => Object.assign(target, originals));
}

test('an old prompt is asked about again only every 15 minutes', () => {
  const now = Date.now();
  const lastQueried = new Map([
    ['asked-just-now', now - MINUTE],
    ['asked-long-ago', now - 20 * MINUTE],
  ]);
  const payments = [{ id: 'asked-just-now' }, { id: 'asked-long-ago' }, { id: 'never-asked' }];

  const due = pickDueOldPayments(payments, now, lastQueried).map((p) => p.id);

  assert.deepEqual(due, ['never-asked', 'asked-long-ago']);
});

test('old prompts are limited per sweep, least recently asked first', () => {
  const now = Date.now();
  const lastQueried = new Map();
  const payments = Array.from({ length: 8 }, (_, i) => {
    lastQueried.set(`p${i}`, now - (60 - i) * MINUTE);
    return { id: `p${i}` };
  });

  const due = pickDueOldPayments(payments, now, lastQueried).map((p) => p.id);

  assert.deepEqual(due, ['p0', 'p1', 'p2', 'p3', 'p4']);
});

test('the sweep keeps querying prompts older than 30 minutes, and recent ones first', async (t) => {
  const windows = [];
  const queried = [];
  stub(t, paymentRepository, {
    findAwaitingResult: async ({ olderThan, newerThan }) => {
      windows.push({ olderThan, newerThan });
      return windows.length === 1 ? [{ id: 'recent' }] : [{ id: 'old' }];
    },
  });
  stub(t, mpesaService, {
    queryStkPushResult: async (payment) => queried.push(payment.id),
  });

  await runStkQuerySweep();

  assert.deepEqual(queried, ['recent', 'old']);
  const ageOf = (date) => Math.round((Date.now() - date.getTime()) / MINUTE);
  assert.equal(ageOf(windows[0].newerThan), 30);
  assert.equal(ageOf(windows[1].olderThan), 30);
  assert.equal(ageOf(windows[1].newerThan), 48 * 60);
});

test('one failed query does not stop the rest of the sweep', async (t) => {
  const queried = [];
  stub(t, paymentRepository, {
    findAwaitingResult: async ({ newerThan }) =>
      Date.now() - newerThan.getTime() <= 31 * MINUTE ? [{ id: 'a' }, { id: 'b' }] : [],
  });
  stub(t, mpesaService, {
    queryStkPushResult: async (payment) => {
      queried.push(payment.id);
      if (payment.id === 'a') throw new Error('Safaricom unreachable');
    },
  });
  stub(t, console, { error: () => {} });

  await runStkQuerySweep();

  assert.deepEqual(queried, ['a', 'b']);
});

test('M-Pesa orders without a stock hold can still expire', async (t) => {
  let where;
  stub(t, prisma.order, {
    findMany: async (args) => {
      where = args.where;
      return [{ id: 'legacy-order' }];
    },
  });
  const now = new Date();
  const graceMs = 60 * MINUTE;

  const ids = await orderRepository.findExpiredUnpaidOrderIds(now, graceMs);

  assert.deepEqual(ids, ['legacy-order']);
  const legacy = where.OR.find((branch) => branch.paymentMethod);
  assert.deepEqual(legacy, {
    paymentMethod: 'mpesa',
    createdAt: { lt: new Date(now.getTime() - graceMs) },
    stockReservations: { none: {} },
  });
  // A recent prompt or a payment needing review still blocks expiry.
  assert.deepEqual(where.payments.none.OR[0], { status: 'needs_review' });
  assert.equal(where.payments.none.OR[1].status, 'initiated');
});
