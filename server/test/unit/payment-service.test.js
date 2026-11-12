const test = require('node:test');
const assert = require('node:assert/strict');
const orderRepository = require('../../repositories/order.repository');
const paymentRepository = require('../../repositories/payment.repository');
const mpesaService = require('../../services/mpesaService');
const service = require('../../services/payment.service');

const orderId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '550e8400-e29b-41d4-a716-446655440001';
const order = {
  id: orderId,
  paymentMethod: 'mpesa',
  paymentStatus: 'pending',
  orderStatus: 'pending',
};

test('refuses another STK prompt while the earlier payment has no result', async (t) => {
  const originals = {
    findByIdForUser: orderRepository.findByIdForUser,
    findInitiatedForOrder: paymentRepository.findInitiatedForOrder,
    initiateStkPush: mpesaService.initiateStkPush,
  };
  t.after(() => {
    orderRepository.findByIdForUser = originals.findByIdForUser;
    paymentRepository.findInitiatedForOrder = originals.findInitiatedForOrder;
    mpesaService.initiateStkPush = originals.initiateStkPush;
  });

  orderRepository.findByIdForUser = async () => order;
  paymentRepository.findInitiatedForOrder = async () => ({ id: 'pending-payment' });
  let promptCount = 0;
  mpesaService.initiateStkPush = async () => { promptCount += 1; };

  await assert.rejects(
    service.startMpesaPayment({ orderId, userId, phone: '0712345678' }),
    { statusCode: 409 }
  );
  assert.equal(promptCount, 0);
});

test('allows a new STK prompt once the earlier attempt is terminal', async (t) => {
  const originals = {
    findByIdForUser: orderRepository.findByIdForUser,
    findInitiatedForOrder: paymentRepository.findInitiatedForOrder,
    initiateStkPush: mpesaService.initiateStkPush,
  };
  t.after(() => {
    orderRepository.findByIdForUser = originals.findByIdForUser;
    paymentRepository.findInitiatedForOrder = originals.findInitiatedForOrder;
    mpesaService.initiateStkPush = originals.initiateStkPush;
  });

  orderRepository.findByIdForUser = async () => order;
  paymentRepository.findInitiatedForOrder = async () => null;
  const expected = { id: 'new-payment' };
  mpesaService.initiateStkPush = async () => expected;

  assert.equal(
    await service.startMpesaPayment({ orderId, userId, phone: '0712345678' }),
    expected
  );
});
