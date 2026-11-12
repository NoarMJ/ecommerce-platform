const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSignupFields } = require('../../utils/userValidation');
const { normaliseKenyanPhone } = require('../../utils/phone');
const { isUuid } = require('../../utils/ids');

test('signup validation trims names and normalizes email', () => {
  assert.deepEqual(validateSignupFields({
    firstName: ' Ada ', lastName: ' Lovelace ', email: ' ADA@EXAMPLE.COM ',
    password: 'long-password', phoneNumber: ' 0712 345 678 ',
  }), {
    firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',
    password: 'long-password', phoneNumber: '0712 345 678',
  });
});

test('signup validation rejects missing, malformed and unsafe passwords', () => {
  for (const input of [
    {},
    { firstName: 'Ada', lastName: 'L', email: 'bad', password: 'long-password' },
    { firstName: 'Ada', lastName: 'L', email: 'a@b.co', password: 'short' },
    { firstName: 'Ada', lastName: 'L', email: 'a@b.co', password: '😀'.repeat(19) },
  ]) assert.throws(() => validateSignupFields(input), { statusCode: 400 });
});

test('Kenyan phone numbers normalize supported local and international forms', () => {
  assert.equal(normaliseKenyanPhone('0712 345 678'), '+254712345678');
  assert.equal(normaliseKenyanPhone('+254-712-345-678'), '+254712345678');
  assert.equal(normaliseKenyanPhone('254112345678'), '+254112345678');
  assert.equal(normaliseKenyanPhone('12345'), null);
});

test('UUID validation accepts UUID strings and rejects malformed IDs', () => {
  assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isUuid('not-a-uuid'), false);
  assert.equal(isUuid(null), false);
});
