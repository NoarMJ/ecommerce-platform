const paymentRepository = require('../repositories/payment.repository');
const mpesaService = require('../services/mpesaService');
const { describeError } = require('../utils/logSafe');

const SWEEP_INTERVAL = 60 * 1000;

// The prompt stays on the phone for about a minute. Give the callback time
// to arrive before asking Safaricom ourselves.
const WAIT_FOR_CALLBACK_MS = 90 * 1000;

// Recent prompts are asked about on every sweep.
const RECENT_WINDOW_MS = 30 * 60 * 1000;

// Callbacks are sometimes never delivered, and Safaricom can answer "still
// processing" for a while. Older prompts are still asked about, less often,
// so they do not stay unresolved forever. After MAX_AGE_MS the order has long
// expired; the customer can still press "Check payment status".
const OLD_PROMPT_INTERVAL_MS = 15 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

const RECENT_BATCH = 20;
const OLD_BATCH = 100;
const OLD_QUERIES_PER_SWEEP = 5;

// When each older prompt was last asked about. Memory only: after a restart
// each one is asked about once more, which is harmless.
const lastOldQueryAt = new Map();

// Which older prompts are due for another query on this sweep.
const pickDueOldPayments = (payments, now, lastQueried = lastOldQueryAt) => {
  const due = payments.filter((payment) => {
    const last = lastQueried.get(payment.id);
    return last === undefined || now - last >= OLD_PROMPT_INTERVAL_MS;
  });
  // Least recently asked first, so none is starved.
  due.sort((a, b) => (lastQueried.get(a.id) ?? 0) - (lastQueried.get(b.id) ?? 0));
  return due.slice(0, OLD_QUERIES_PER_SWEEP);
};

const query = async (payment) => {
  try {
    await mpesaService.queryStkPushResult(payment);
  } catch (error) {
    console.error(`STK status query for payment ${payment.id} failed:`, describeError(error));
  }
};

let running = false;

const runStkQuerySweep = async () => {
  if (running) return; // a slow Safaricom must not stack sweeps
  running = true;

  try {
    const now = Date.now();

    const recent = await paymentRepository.findAwaitingResult({
      olderThan: new Date(now - WAIT_FOR_CALLBACK_MS),
      newerThan: new Date(now - RECENT_WINDOW_MS),
      take: RECENT_BATCH,
    });

    // One at a time, to stay well inside Safaricom's rate limits.
    for (const payment of recent) await query(payment);

    const old = await paymentRepository.findAwaitingResult({
      olderThan: new Date(now - RECENT_WINDOW_MS),
      newerThan: new Date(now - MAX_AGE_MS),
      take: OLD_BATCH,
    });

    const oldIds = new Set(old.map((payment) => payment.id));
    for (const id of lastOldQueryAt.keys()) {
      if (!oldIds.has(id)) lastOldQueryAt.delete(id);
    }

    for (const payment of pickDueOldPayments(old, now)) {
      lastOldQueryAt.set(payment.id, now);
      await query(payment);
    }
  } catch (error) {
    console.error('STK status query sweep failed:', describeError(error));
  } finally {
    running = false;
  }
};

const startStkQuerySweeper = () => {
  if (!process.env.MPESA_CONSUMER_KEY) {
    console.warn('M-Pesa is not configured; STK status query sweeper not started.');
    return null;
  }

  const timer = setInterval(runStkQuerySweep, SWEEP_INTERVAL);
  timer.unref();
  return timer;
};

module.exports = {
  startStkQuerySweeper,
  runStkQuerySweep,
  pickDueOldPayments,
};
