const cartRepository = require('../repositories/cart.repository');

const ONE_HOUR = 60 * 60 * 1000;

const runCleanup = async () => {
  try {
    const { count } = await cartRepository.deleteExpiredGuestCarts();

    if (count > 0) {
      console.log(`Cleaned up ${count} expired guest cart(s)`);
    }
  } catch (error) {
    console.error('Cart cleanup failed:', error.message);
  }
};

// Runs once at startup, then every hour
const startCartCleanup = () => {
  runCleanup();

  const timer = setInterval(runCleanup, ONE_HOUR);
  timer.unref(); // don't keep the process alive just for this timer

  return timer;
};

module.exports = { startCartCleanup };