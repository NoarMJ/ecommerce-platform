const adminCustomerRepository = require('../repositories/adminCustomer.repository');
const AppError = require('../utils/AppError');

const STATUS_FILTERS = ['active', 'inactive'];
const SELLER_FILTERS = ['yes', 'no'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const toCustomerView = (user, stats) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  isActive: user.isActive,
  createdAt: user.createdAt,
  // lets the admin see which customers also sell, and their seller status
  sellerStatus: user.sellerProfile ? user.sellerProfile.status : null,
  orderCount: stats ? stats.orderCount : 0,
  totalSpentMinor: stats ? stats.totalSpentMinor : 0,
  lastOrderAt: stats ? stats.lastOrderAt : null,
});

async function listCustomers(query = {}) {
  const status = text(query.status) || undefined;
  if (status && !STATUS_FILTERS.includes(status)) {
    throw new AppError('Status must be active or inactive.', 400);
  }

  const seller = text(query.seller) || undefined;
  if (seller && !SELLER_FILTERS.includes(seller)) {
    throw new AppError('Seller filter must be yes or no.', 400);
  }

  const search = text(query.search).slice(0, 100) || undefined;
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [rows, total] = await adminCustomerRepository.list({
    search,
    status,
    seller,
    skip: (page - 1) * limit,
    take: limit,
  });

  const stats = await adminCustomerRepository.getOrderStats(rows.map((row) => row.id));

  return {
    customers: rows.map((row) => toCustomerView(row, stats[row.id])),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { listCustomers };
