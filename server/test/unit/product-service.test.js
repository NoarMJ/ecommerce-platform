const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../../repositories/product.repository');
const service = require('../../services/product.service');

test('public product query clamps pagination and normalizes category filters', async (t) => {
  const original = repository.findPage;
  t.after(() => { repository.findPage = original; });
  let options;
  repository.findPage = async (value) => { options = value; return { total: 2, products: [{ id: 'p1' }] }; };

  const result = await service.getPublicProducts({ page: '-3', limit: '500', search: '  phone ', categories: [' Mobile,accessories ', 'mobile'] });

  assert.deepEqual(options, {
    page: 1, limit: 50, isActive: true, search: 'phone',
    categorySlugs: ['mobile', 'accessories'], onlyActiveCategories: true,
  });
  assert.deepEqual(result.pagination, { page: 1, limit: 50, total: 2, totalPages: 1 });
});

test('admin product query validates status and supports all statuses', async (t) => {
  const original = repository.findPage;
  t.after(() => { repository.findPage = original; });
  let options;
  repository.findPage = async (value) => { options = value; return { total: 0, products: [] }; };

  await assert.rejects(service.getAdminProducts({ status: 'deleted' }), { statusCode: 400 });
  await service.getAdminProducts({ status: 'all' });
  assert.equal(options.isActive, undefined);
  assert.equal(options.searchSku, true);
});

test('product lookup validates IDs before querying and reports missing products', async (t) => {
  const original = repository.findActiveById;
  t.after(() => { repository.findActiveById = original; });
  let calls = 0;
  repository.findActiveById = async () => { calls += 1; return null; };

  await assert.rejects(service.getProductById('bad-id'), { statusCode: 400 });
  await assert.rejects(service.getProductById('550e8400-e29b-41d4-a716-446655440000'), { statusCode: 404 });
  assert.equal(calls, 1);
});
