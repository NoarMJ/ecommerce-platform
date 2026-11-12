const prisma = require('../config/prisma');

const orderInclude = {
  items: { orderBy: { position: 'asc' } },
  statusHistory: { orderBy: { changedAt: 'asc' } },
};

// Admin views also include basic customer details
const withCustomer = {
  ...orderInclude,
  user: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

const findById = (id) =>
  prisma.order.findUnique({ where: { id }, include: orderInclude });

const findByIdForUser = (id, userId) =>
  prisma.order.findFirst({ where: { id, userId }, include: orderInclude });

const findByIdWithCustomer = (id) =>
  prisma.order.findUnique({ where: { id }, include: withCustomer });

const findByIdempotencyKey = (userId, idempotencyKey) =>
  prisma.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    include: orderInclude,
  });

const findAllForUser = (userId) =>
  prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });

const exists = async (id) => (await prisma.order.count({ where: { id } })) > 0;

// Admin list with optional status filter and search
const findPage = async ({ status, search, page, limit }) => {
  const where = {
    ...(status ? { orderStatus: status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { shipFullName: { contains: search, mode: 'insensitive' } },
            { shipPhone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: withCustomer,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { total, orders };
};

// { pending: 3, shipped: 1, ... } across all orders
const countByStatus = async () => {
  const rows = await prisma.order.groupBy({
    by: ['orderStatus'],
    _count: { _all: true },
  });

  return Object.fromEntries(rows.map((row) => [row.orderStatus, row._count._all]));
};

const getDashboardOverview = async () => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6);
  since.setUTCHours(0, 0, 0, 0);

  const [paidTotals, weeklyPaidOrders, recentOrders, counts, totalOrders, topItems] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: 'paid' }, _sum: { totalMinor: true }, _count: { _all: true } }),
    prisma.order.findMany({ where: { paymentStatus: 'paid', createdAt: { gte: since } }, select: { createdAt: true, totalMinor: true } }),
    prisma.order.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: withCustomer }),
    countByStatus(),
    prisma.order.count(),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { paymentStatus: 'paid' } },
      _sum: { quantity: true, lineTotalMinor: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  const productIds = topItems.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, images: true, priceMinor: true, stock: true } });
  const productById = new Map(products.map((product) => [product.id, product]));
  const topProducts = topItems.map((item) => ({
    ...productById.get(item.productId),
    image: productById.get(item.productId)?.images?.[0],
    unitsSold: item._sum.quantity || 0,
    revenueMinor: item._sum.lineTotalMinor || 0,
  })).filter((product) => product.id);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, salesMinor: 0, paidOrders: 0 };
  });
  const dayMap = new Map(days.map((day) => [day.date, day]));
  for (const order of weeklyPaidOrders) {
    const day = dayMap.get(order.createdAt.toISOString().slice(0, 10));
    if (day) {
      day.salesMinor += order.totalMinor;
      day.paidOrders += 1;
    }
  }

  return {
    summary: {
      paidSalesMinor: paidTotals._sum.totalMinor || 0,
      paidOrderCount: paidTotals._count._all || 0,
      totalOrders,
      weeklySalesMinor: days.reduce((sum, day) => sum + day.salesMinor, 0),
      weeklyPaidOrderCount: days.reduce((sum, day) => sum + day.paidOrders, 0),
    },
    weeklySales: days,
    counts,
    recentOrders,
    topProducts,
  };
};

// Takes stock, creates the order and empties the cart as ONE transaction.
// If anything fails, nothing is changed.
const createWithStockReservation = ({ orderData, lines, cartId }) =>
  prisma.$transaction(
    async (tx) => {
      // Always process products in the same order, so two checkouts
      // at the same moment can never block each other forever.
      const byProduct = [...lines].sort((a, b) =>
        a.productId.localeCompare(b.productId)
      );

      for (const line of byProduct) {
        // "Reduce stock, but only if enough is left" in one step
        const result = await tx.product.updateMany({
          where: {
            id: line.productId,
            isActive: true,
            stock: { gte: line.quantity },
          },
          data: { stock: { decrement: line.quantity } },
        });

        if (result.count !== 1) {
          const error = new Error('Out of stock');
          error.code = 'OUT_OF_STOCK';
          error.productName = line.name;
          throw error;
        }
      }

      const order = await tx.order.create({
        data: {
          ...orderData,
          items: {
            create: lines.map((line, index) => ({
              productId: line.productId,
              name: line.name,
              sku: line.sku,
              image: line.image,
              unitPriceMinor: line.unitPriceMinor,
              quantity: line.quantity,
              lineTotalMinor: line.lineTotalMinor,
              position: index,
            })),
          },
          statusHistory: {
            create: [{ status: 'pending', changedById: orderData.userId }],
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({ where: { cartId } });

      return order;
    },
    { maxWait: 5000, timeout: 15000 }
  );

// Moves an order from one status to the next. Returns null if the order
// is no longer in the expected status (someone else changed it first).
const advanceStatus = ({ orderId, from, to, adminId, markPaid }) =>
  prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, orderStatus: from },
      data: {
        orderStatus: to,
        ...(markPaid ? { paymentStatus: 'paid' } : {}),
      },
    });

    if (result.count !== 1) return null;

    await tx.orderStatusHistory.create({
      data: { orderId, status: to, changedById: adminId },
    });

    return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
  });

// Cancels a pending or processing order and puts its stock back.
// Returns null if the order can't be cancelled.
const cancel = ({ orderId, adminId }) =>
  prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, orderStatus: { in: ['pending', 'processing'] } },
      data: { orderStatus: 'cancelled', cancelledAt: new Date() },
    });

    if (result.count !== 1) return null;

    await tx.orderStatusHistory.create({
      data: { orderId, status: 'cancelled', changedById: adminId },
    });

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    if (order.paymentStatus === 'paid') {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'refunded' },
      });
    }

    return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
  });

  // Only the fields the payment page needs
const statusSelect = {
  id: true,
  paymentMethod: true,
  paymentStatus: true,
  orderStatus: true,
};

const findStatusById = (id) =>
  prisma.order.findUnique({ where: { id }, select: statusSelect });

const findStatusByIdForUser = (id, userId) =>
  prisma.order.findFirst({ where: { id, userId }, select: statusSelect });

module.exports = {
  findById,
  findByIdForUser,
  findByIdWithCustomer,
  findByIdempotencyKey,
  findAllForUser,
  exists,
  findPage,
  countByStatus,
  getDashboardOverview,
  createWithStockReservation,
  advanceStatus,
  cancel,
    findStatusById,
    findStatusByIdForUser,
};
