const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const optionalAuth = require('../../middleware/optionalAuth');

test('optional auth attaches the user from a valid access cookie', () => {
  process.env.JWT_ACCESS_SECRET = 'test-secret';
  const req = { cookies: { access: jwt.sign({ sub: 'user-123' }, 'test-secret') } };
  let continued = false;

  optionalAuth(req, {}, () => { continued = true; });

  assert.equal(req.userId, 'user-123');
  assert.equal(continued, true);
});

test('optional auth continues as a guest when the access cookie is invalid', () => {
  process.env.JWT_ACCESS_SECRET = 'test-secret';
  const req = { cookies: { access: 'invalid-token' } };
  let continued = false;

  optionalAuth(req, {}, () => { continued = true; });

  assert.equal(req.userId, undefined);
  assert.equal(continued, true);
});
