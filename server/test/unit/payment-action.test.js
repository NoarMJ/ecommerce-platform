const test = require('node:test');
const assert = require('node:assert/strict');
const orderRepository = require('../../repositories/order.repository');
const { getPaymentAction, getUserOrders } = require('../../services/order.service');

const now = new Date('2026-11-19T12:00:00Z');
const later = new Date('2026-11-19T12:10:00Z');
const earlier = new Date('2026-11-19T11:50:00Z');

const unpaid = (overrides = {}) => ({
  paymentMethod: 'mpesa',
  paymentStatus: 'pending',
  orderStatus: 'pending',
  payments: [],
  stockReservations: [{ status: 'active', expiresAt: later }],
  ...overrides,
});

test('Pay now only when a new prompt would be accepted', () => {
  assert.equal(getPaymentAction(unpaid(), now), 'pay');
  for (const status of ['failed', 'cancelled']) {
    assert.equal(getPaymentAction(unpaid({ payments: [{ status }] }), now), 'pay');
  }
});

test('an unresolved prompt offers a status check, not a new prompt', () => {
  assert.equal(getPaymentAction(unpaid({ payments: [{ status: 'initiated' }] }), now), 'check');
});

test('a payment under review offers nothing to press', () => {
  assert.equal(getPaymentAction(unpaid({ payments: [{ status: 'needs_review' }] }), now), 'review');
});

test('no Pay now once the stock hold has run out or never existed', () => {
  const expiredHold = { status: 'active', expiresAt: earlier };
  assert.equal(getPaymentAction(unpaid({ stockReservations: [expiredHold] }), now), 'expired');
  assert.equal(getPaymentAction(unpaid({ stockReservations: [] }), now), 'expired');
  const released = { status: 'released', expiresAt: later };
  assert.equal(getPaymentAction(unpaid({ stockReservations: [released] }), now), 'expired');
});

test('paid, cancelled and cash-on-delivery orders have no payment action', () => {
  assert.equal(getPaymentAction(unpaid({ paymentStatus: 'paid' }), now), null);
  assert.equal(getPaymentAction(unpaid({ orderStatus: 'cancelled' }), now), null);
  assert.equal(getPaymentAction(unpaid({ paymentMethod: 'cash_on_delivery' }), now), null);
});

test('the order list carries each order\'s payment action', async (t) => {
  const original = orderRepository.findAllForUser;
  t.after(() => { orderRepository.findAllForUser = original; });
  orderRepository.findAllForUser = async () => [
    { ...unpaid({ stockReservations: [{ status: 'active', expiresAt: new Date(Date.now() + 60000) }] }), items: [] },
  ];

  const [order] = await getUserOrders('user-1');

  assert.equal(order.paymentAction, 'pay');
});

const paymentRepository = require('../../repositories/payment.repository');
const { isMpesaReceiptMissing, getOrderForAdmin } = require('../../services/order.service');

test('staff see paid M-Pesa orders that have no receipt code', () => {
  const paid = { paymentMethod: 'mpesa', paymentStatus: 'paid' };
  assert.equal(isMpesaReceiptMissing({ ...paid, payments: [{ mpesaReceiptNumber: null }] }), true);
  assert.equal(isMpesaReceiptMissing({ ...paid, payments: [] }), true);
  assert.equal(isMpesaReceiptMissing({ ...paid, payments: [{ mpesaReceiptNumber: 'TEST000001' }] }), false);
  assert.equal(isMpesaReceiptMissing({ ...paid, paymentStatus: 'pending', payments: [] }), false);
  assert.equal(isMpesaReceiptMissing({ ...paid, paymentMethod: 'cash_on_delivery', payments: [] }), false);
});

test('the admin order view includes the M-Pesa receipt of a paid order', async (t) => {
  const orderId = '550e8400-e29b-41d4-a716-446655440000';
  const originals = {
    find: orderRepository.findByIdWithCustomer,
    receipt: paymentRepository.findSucceededForOrder,
  };
  t.after(() => {
    orderRepository.findByIdWithCustomer = originals.find;
    paymentRepository.findSucceededForOrder = originals.receipt;
  });
  orderRepository.findByIdWithCustomer = async () => ({ id: orderId, paymentMethod: 'mpesa', paymentStatus: 'paid' });
  paymentRepository.findSucceededForOrder = async () => ({ mpesaReceiptNumber: null, amountMinor: 1000 });

  const order = await getOrderForAdmin(orderId);

  assert.deepEqual(order.payment, { mpesaReceiptNumber: null, amountMinor: 1000 });
});
