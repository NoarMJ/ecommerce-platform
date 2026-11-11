const { EventEmitter } = require('events');

// A shared announcement board for payment changes
const paymentEvents = new EventEmitter();

module.exports = { paymentEvents };