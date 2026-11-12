const test = require('node:test');
const assert = require('node:assert/strict');
const authService = require('../../services/auth.service');
const requireAdmin = require('../../middleware/requireAdmin');

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('requireAdmin resolves the authenticated JWT user and allows administrators', async (t) => {
  const original = authService.getActiveUser;
  t.after(() => { authService.getActiveUser = original; });
  const admin = { id: 'admin-id', role: 'admin' };
  authService.getActiveUser = async (id) => id === admin.id ? admin : null;

  const req = { userId: admin.id };
  const res = responseRecorder();
  let continued = false;

  await requireAdmin(req, res, () => { continued = true; });

  assert.equal(continued, true);
  assert.equal(req.user, admin);
});

test('requireAdmin rejects requests without an authenticated JWT user', async () => {
  const req = {};
  const res = responseRecorder();

  await requireAdmin(req, res, () => assert.fail('must not continue'));

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Authentication required. Please log in.');
});
