const test = require('node:test');
const assert = require('node:assert/strict');
const { toSellerOrderView } = require('../../services/sellerOrder.service');

const order = {
  id: 'order-1', orderNumber: 'ORD-1', orderStatus: 'pending',
  paymentStatus: 'pending', paymentMethod: 'mpesa', createdAt: new Date(),
  shipFullName: 'Buyer', shipPhone: '0712345678', shipAddressLine1: 'Private address',
  shipAddressLine2: null, shipCity: 'Nairobi', shipCounty: 'Nairobi',
  shipPostalCode: null, customerNote: 'Private note',
  items: [{ id: 'item-1', lineTotalMinor: 1000, quantity: 1 }],
};

test('seller view withholds delivery data until payment is confirmed', () => {
  const view = toSellerOrderView(order);
  assert.equal(view.shipping, null);
  assert.equal(view.customerNote, null);
  assert.equal(view.readyToFulfil, false);
});

test('seller view releases delivery data for paid orders', () => {
  const view = toSellerOrderView({ ...order, paymentStatus: 'paid' });
  assert.equal(view.shipping.addressLine1, 'Private address');
  assert.equal(view.customerNote, 'Private note');
  assert.equal(view.readyToFulfil, true);
});

test('COD delivery data is released only after admin moves it into fulfilment', () => {
  const waiting = toSellerOrderView({ ...order, paymentMethod: 'cash_on_delivery' });
  const released = toSellerOrderView({ ...order, paymentMethod: 'cash_on_delivery', orderStatus: 'processing' });
  assert.equal(waiting.shipping, null);
  assert.ok(released.shipping);
});
