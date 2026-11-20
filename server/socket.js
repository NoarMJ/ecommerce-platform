const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { paymentEvents } = require('./services/paymentEvents');
const {
  getPaymentStatusForUser,
  getPaymentStatusForOrder,
} = require('./services/paymentStatusService');

const roomFor = (orderId) => `order:${String(orderId).toLowerCase()}`;

function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  // Parse the handshake cookies.
  io.engine.use(cookieParser());

  // Runs once per connection. Never rejects, so an expired token doesn't cause a reconnect loop.
  io.use((socket, next) => {
    const token = socket.request.cookies?.access;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.data.userId = payload.sub; // use Number(payload.sub) if your user ids are integers
        socket.data.expiresAt = payload.exp * 1000;
      } catch {
        // invalid or expired: stays unauthenticated
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // Called once when the payment page opens (and again after a reconnect).
    // Returns the current status, then the socket joins the order's room for pushed updates.
    socket.on('payment:watch', async (orderId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};

      try {
        const { userId, expiresAt } = socket.data;
        if (!userId || !(expiresAt > Date.now())) {
          return reply({
            ok: false,
            code: 'AUTH_REQUIRED',
            message: 'Authentication required. Please log in.',
          });
        }

        if (typeof orderId !== 'string') {
          return reply({ ok: false, message: 'Order not found.' });
        }

        // Same ownership rule as GET /api/payments/order/:orderId/status.
        const status = await getPaymentStatusForUser(orderId, userId);
        if (!status) {
          return reply({ ok: false, message: 'Order not found.' });
        }

        socket.join(roomFor(orderId)); // joining twice is harmless
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