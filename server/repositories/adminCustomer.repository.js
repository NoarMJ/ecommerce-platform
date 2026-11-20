const prisma = require('../config/prisma');

// Never select passwordHash or permissions.
const SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  isActive: true,
  createdAt: true,
  sellerProfile: { select: { status: true } },
};

const buildWhere = ({ search, status, seller }) => {
  // Customers only. Administrator accounts are managed on their own page.
  const where = { role: 'customer' };

  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;

  if (seller === 'yes') where.sellerProfile = { isNot: null };
  if (seller === 'no') where.sellerProfile = { is: null };

  // "john doe" must match first name john AND last name doe, so each word is checked separately.
  if (search) {
    const words = search.split(/\s+/).filter(Boolean).slice(0, 4);
    where.AND = words.map((word) => {
      const contains = { contains: word, mode: 'insensitive' };
      return {
        OR: [
          { firstName: contains },
          { lastName: contains },
          { email: contains },
          { phoneNumber: contains },
        ],
      };
    });
  }

  return where;
};

const list = ({ search, status, seller, skip, take }) => {
  const where = buildWhere({ search, status, seller });

  return prisma.$transaction([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: SELECT }),
    prisma.user.count({ where }),
  ]);
};

// Order numbers and spend for the customers on the current page (two small grouped queries).
// Returns { [userId]: { orderCount, lastOrderAt, totalSpentMinor } }. Spend counts paid orders only.
const getOrderStats = async (userIds) => {
  if (userIds.length === 0) return {};

  const [allOrders, paidOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, paymentStatus: 'paid' },
      _sum: { totalMinor: true },
    }),
  ]);

  const stats = {};
  for (const row of allOrders) {
    stats[row.userId] = {
      orderCount: row._count._all,
      lastOrderAt: row._max.createdAt,
      totalSpentMinor: 0,
    };
  }
  for (const row of paidOrders) {
    if (stats[row.userId]) stats[row.userId].totalSpentMinor = row._sum.totalMinor || 0;
  }

  return stats;
};

module.exports = { list, getOrderStats };
