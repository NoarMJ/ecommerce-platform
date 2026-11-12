const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { app, server } = require('../../server');

test('health endpoint responds over HTTP with the API status payload', async (t) => {
  server.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'success', message: 'E-commerce API is running',
  });
  assert.equal(app.get('trust proxy'), 1);
});
