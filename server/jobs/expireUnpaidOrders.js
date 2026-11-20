
const orderRepository = require('../repositories/order.repository');
const { paymentEvents } = require('../services/paymentEvents');

const SWEEP_INTERVAL = 60 * 1000;

// Allow an unresolved M-Pesa prompt additional time before cancelling
// an order whose stock reservation has expired.
const UNRESOLVED_PROMPT_GRACE_MS = 60 * 60 * 1000;

const runExpirySweep = async () => {
  try {
    const expiredOrderIds =
      await orderRepository.findExpiredUnpaidOrderIds(
        new Date(),
        UNRESOLVED_PROMPT_GRACE_MS
      );

    let expiredCount = 0;

    for (const orderId of expiredOrderIds) {
      try {
        // The repository should perform a conditional transactional update.
        // This makes concurrent sweeps safe.
        const expired = await orderRepository.expireUnpaid(orderId);

        if (expired) {
          expiredCount += 1;
          // A customer still on the payment page sees "Order expired" right away.
          paymentEvents.emit('payment-updated', { orderId });
        }
      } catch (error) {
        console.error(
          `Could not expire order ${orderId}:`,
          error.message
        );
      }
    }

    if (expiredCount > 0) {
      console.log(
        `Expired ${expiredCount} unpaid order(s)`
      );
    }
  } catch (error) {
    console.error(
      'Unpaid order expiry sweep failed:',
      error.message
    );
  }
};

const startOrderExpirySweeper = () => {
  // Run immediately when the application starts.
  runExpirySweep();

  // Then check for expired orders every minute.
  const timer = setInterval(
    runExpirySweep,
    SWEEP_INTERVAL
  );

  timer.unref();

  return timer;
};

module.exports = {
  startOrderExpirySweeper,
  runExpirySweep,
};
