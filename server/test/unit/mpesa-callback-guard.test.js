const test = require('node:test');
const assert = require('node:assert/strict');
const {
  callbackRateLimit,
  callbackSecretMatches,
  requireCallbackSecret,
  _resetRateLimit,
} = require('../../middleware/mpesaCallbackGuard');
const { maskReceipt, describeError } = require('../../utils/logSafe');

const fakeRes = () => {
  const res = { statusCode: 200, headers: {}, ended: false };
  res.status = (code) => { res.statusCode = code; return res; };
  res.end = () => { res.ended = true; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.set = (name, value) => { res.headers[name] = value; return res; };
  return res;
};

test('the callback secret must match exactly', () => {
  const secret = 'test-callback-secret-value';
  assert.equal(callbackSecretMatches(secret, secret), true);
  assert.equal(callbackSecretMatches('test-callback-secret-valuE', secret), false);
  assert.equal(callbackSecretMatches('short', secret), false);
  assert.equal(callbackSecretMatches(undefined, secret), false);
  assert.equal(callbackSecretMatches(secret, ''), false);
  assert.equal(callbackSecretMatches(secret, undefined), false);
});

test('a wrong secret gets 404 and never reaches the handler', (t) => {
  const original = process.env.MPESA_CALLBACK_SECRET;
  process.env.MPESA_CALLBACK_SECRET = 'test-callback-secret-value';
  t.after(() => { process.env.MPESA_CALLBACK_SECRET = original; });

  let reached = 0;
  const wrong = fakeRes();
  requireCallbackSecret({ params: { secret: 'guess' } }, wrong, () => { reached += 1; });
  assert.equal(wrong.statusCode, 404);
  assert.equal(reached, 0);

  requireCallbackSecret({ params: { secret: 'test-callback-secret-value' } }, fakeRes(), () => { reached += 1; });
  assert.equal(reached, 1);
});

test('callbacks are rate limited per address', () => {
  _resetRateLimit();
  let passed = 0;
  let last;
  for (let i = 0; i < 121; i += 1) {
    last = fakeRes();
    callbackRateLimit({ ip: '203.0.113.5' }, last, () => { passed += 1; });
  }
  assert.equal(passed, 120);
  assert.equal(last.statusCode, 429);
  assert.ok(Number(last.headers['Retry-After']) > 0);

  // Another address is not affected.
  callbackRateLimit({ ip: '203.0.113.6' }, fakeRes(), () => { passed += 1; });
  assert.equal(passed, 121);
  _resetRateLimit();
});

test('receipt codes are masked in logs', () => {
  assert.equal(maskReceipt('TEST000001'), 'TES*****01');
  assert.equal(maskReceipt('ab'), '*****');
  assert.equal(maskReceipt(null), '*****');
});

test('database errors are logged without the data they carried', () => {
  const prismaError = Object.assign(
    new Error('Invalid `prisma.payment.update()` invocation:\n{ data: { phone: "254700000000" } }'),
    { name: 'PrismaClientKnownRequestError', code: 'P2002', meta: { target: ['mpesaReceiptNumber'] } }
  );
  const line = describeError(prismaError);
  assert.equal(line, 'PrismaClientKnownRequestError P2002 on mpesaReceiptNumber');
  assert.doesNotMatch(line, /2547/);

  assert.match(describeError(new Error('Could not reach M-Pesa.')), /^Error: Could not reach M-Pesa\./);
});
