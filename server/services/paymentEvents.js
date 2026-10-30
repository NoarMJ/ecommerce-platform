const { EventEmitter } = require('events');

// In-process event bus for payment changes.
// Fine for a single server instance. With more than one instance,
// replace it with Redis pub/sub so every instance hears every event.
const paymentEvents = new EventEmitter();

function notifyPaymentUpdated(orderId) {
  paymentEvents.emit('payment-updated', { orderId: String(orderId) });
}

module.exports = { paymentEvents, notifyPaymentUpdated };