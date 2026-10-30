const { Server } = require('socket.io');
const { paymentEvents } = require('./services/paymentEvents');
const {
  getPaymentStatusForUser,
  getPaymentStatusForOrder,
} = require('./services/paymentStatusService');

const roomFor = (orderId) => `order:${String(orderId).toLowerCase()}`;

function attachSocket(httpServer, sessionMiddleware) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Reuse the express-session cookie so a socket knows who is logged in.
  io.engine.use(sessionMiddleware);

  io.on('connection', (socket) => {
    // The browser asks to follow one order. Reply with the current status,
    // which covers page refreshes, reconnects and results that landed earlier.
    socket.on('payment:watch', async (orderId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};

      try {
        const userId = socket.request.session?.userId;
        if (!userId) {
          return reply({ ok: false, message: 'Authentication required. Please log in.' });
        }

        if (typeof orderId !== 'string') {
          return reply({ ok: false, message: 'Order not found.' });
        }

        // Same ownership rule as GET /api/payments/order/:orderId/status.
        const status = await getPaymentStatusForUser(orderId, userId);
        if (!status) {
          return reply({ ok: false, message: 'Order not found.' });
        }

        socket.join(roomFor(orderId));
        return reply({ ok: true, status });
      } catch (error) {
        console.error('payment:watch failed:', error);
        return reply({ ok: false, message: 'Something went wrong.' });
      }
    });

    socket.on('payment:unwatch', (orderId) => {
      if (typeof orderId === 'string') socket.leave(roomFor(orderId));
    });
  });

  // Fired by the M-Pesa callback only when a payment actually changed.
  paymentEvents.on('payment-updated', async ({ orderId }) => {
    try {
      const status = await getPaymentStatusForOrder(orderId);
      if (status) {
        io.to(roomFor(orderId)).emit('payment:update', { orderId, status });
      }
    } catch (error) {
      console.error('payment:update broadcast failed:', error);
    }
  });

  return io;
}

module.exports = { attachSocket };