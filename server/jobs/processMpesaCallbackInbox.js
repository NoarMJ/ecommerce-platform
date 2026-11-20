const mpesaService = require('../services/mpesaService');
const { describeError } = require('../utils/logSafe');

const SWEEP_INTERVAL = 15 * 1000;
let running = false;

const runMpesaCallbackInboxSweep = async () => {
  if (running) return;
  running = true;
  try {
    await mpesaService.processPendingStkCallbacks();
  } catch (error) {
    console.error('M-Pesa callback inbox sweep failed:', describeError(error));
  } finally {
    running = false;
  }
};

const startMpesaCallbackInboxWorker = () => {
  const timer = setInterval(runMpesaCallbackInboxSweep, SWEEP_INTERVAL);
  timer.unref();
  return timer;
};

module.exports = { startMpesaCallbackInboxWorker, runMpesaCallbackInboxSweep };
