const prisma = require('../config/prisma');
const TX_OPTIONS = require('../utils/transactionOptions');

// An order item belongs to a seller if it was stamped with their id at
// checkout, OR it has no stamp and the product is theirs. So a sale of a
// seller's product always shows on their pages, even if a stamp is missing.
const ownItem = (sellerId) => ({
  OR: [{ sellerId }, { sellerId: null, product: { sellerId } }],
});

// Data minimisation: only what a seller needs to fulfil their own items.
// No user id/email, no payment records, no totals of the whole order.
const orderSelect = (sellerId) => ({
  id: true,
  orderNumber: true,
  orderStatus: true,
  paymentStatus: true,
  paymentMethod: true,
  shipFullName: true,
  shipPhone: true,
  shipAddressLine1: true,
  shipAddressLine2: true,
  shipCity: true,
  shipCounty: true,
  shipPostalCode: true,
  customerNote: true,
  createdAt: true,
  items: {
    where: ownItem(sellerId), // other sellers' items in the same order are never returned
    orderBy: { position: 'asc' },
    select: {
      id: true,
      productId: true,
      name: true,
      sku: true,
      image: true,
      unitPriceMinor: true,
      quantity: true,
      lineTotalMinor: true,
    },
  },
  // This seller's own fulfilment of the order (never other sellers')
  fulfilments: {
    where: { sellerId },
    take: 1,
    select: {
      id: true,
      status: true,
      courier: true,
      trackingNumber: true,
      shippedAt: true,
      deliveredAt: true,
      history: {
        orderBy: { changedAt: 'asc' },
        select: { status: true, note: true, changedAt: true },
      },
    },
  },
});

// Orders with at least one of this seller's items.
const sellerOrdersWhere = (sellerId) => ({ items: { some: ownItem(sellerId) } });

// `status` filters by the seller's own fulfilment status. An order with no
// fulfilment row yet counts as pending, so it is never hidden by the filter.
const statusWhere = (sellerId, status) =>
  status === 'pending'
    ? {
        OR: [
          { fulfilments: { some: { sellerId, status: 'pending' } } },
          { fulfilments: { none: { sellerId } } },
        ],
      }
    : { fulfilments: { some: { sellerId, status } } };

const listForSeller = ({ sellerId, orderStatus, skip, take }) => {
  const where = orderStatus
    ? { AND: [sellerOrdersWhere(sellerId), statusWhere(sellerId, orderStatus)] }
    : sellerOrdersWhere(sellerId);

  return prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: orderSelect(sellerId),
    }),
    prisma.order.count({ where }),
  ]);
};

const findOneForSeller = (orderId, sellerId) =>
  prisma.order.findFirst({
    where: { id: orderId, ...sellerOrdersWhere(sellerId) },
    select: orderSelect(sellerId),
  });

// Creates the seller's fulfilment row for an order if it's missing, so the
// seller can always act on an order containing their products.
const ensureFulfilment = (orderId, sellerId) =>
  prisma.sellerFulfilment.upsert({
    where: { orderId_sellerId: { orderId, sellerId } },
    update: {},
    create: {
      orderId,
      sellerId,
      history: { create: { status: 'pending', note: 'Seller tracking started' } },
    },
  });

// Dashboard figures for ONE seller, mirroring the admin overview.
// Money is always the sum of this seller's own line totals, never the
// order total: an order can contain items from several sellers, and the
// shipping fee does not belong to any of them.
const getOverviewForSeller = async (sellerId) => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6);
  since.setUTCHours(0, 0, 0, 0);

  const sellerOrders = sellerOrdersWhere(sellerId);
  const paidItems = { AND: [ownItem(sellerId), { order: { paymentStatus: 'paid' } }] };

  const [paidTotals, paidOrderCount, totalOrders, statusRows, untrackedOrders, weeklyItems, recentOrders, topItems] =
    await Promise.all([
      prisma.orderItem.aggregate({ where: paidItems, _sum: { lineTotalMinor: true } }),
      prisma.order.count({ where: { ...sellerOrders, paymentStatus: 'paid' } }),
      prisma.order.count({ where: sellerOrders }),
      prisma.sellerFulfilment.groupBy({ by: ['status'], where: { sellerId }, _count: { _all: true } }),
      // Orders with this seller's items but no fulfilment row yet: count as pending
      prisma.order.count({
        where: { ...sellerOrders, orderStatus: { not: 'cancelled' }, fulfilments: { none: { sellerId } } },
      }),
      prisma.orderItem.findMany({
        where: {
          AND: [ownItem(sellerId), { order: { paymentStatus: 'paid', createdAt: { gte: since } } }],
        },
        select: { orderId: true, lineTotalMinor: true, order: { select: { createdAt: true } } },
      }),
      prisma.order.findMany({
        where: sellerOrders,
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: orderSelect(sellerId),
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: paidItems,
        _sum: { quantity: true, lineTotalMinor: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

  const products = await prisma.product.findMany({
    where: { id: { in: topItems.map((item) => item.productId) }, sellerId },
    select: { id: true, name: true, images: true, priceMinor: true, stock: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const topProducts = topItems
    .filter((item) => productById.has(item.productId))
    .map((item) => {
      const product = productById.get(item.productId);
      return {
        ...product,
        image: product.images?.[0],
        unitsSold: item._sum.quantity || 0,
        revenueMinor: item._sum.lineTotalMinor || 0,
      };
    });

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    return { date: date.toISOString().slice(0, 10), salesMinor: 0, paidOrders: 0, orderIds: new Set() };
  });
  const dayMap = new Map(days.map((day) => [day.date, day]));
  for (const item of weeklyItems) {
    const day = dayMap.get(item.order.createdAt.toISOString().slice(0, 10));
    if (day) {
      day.salesMinor += item.lineTotalMinor;
      day.orderIds.add(item.orderId); // several items can share one order
    }
  }
  const weeklySales = days.map(({ orderIds, ...day }) => ({ ...day, paidOrders: orderIds.size }));

  return {
    summary: {
      paidSalesMinor: paidTotals._sum.lineTotalMinor || 0,
      paidOrderCount,
      totalOrders,
      weeklySalesMinor: weeklySales.reduce((sum, day) => sum + day.salesMinor, 0),
      weeklyPaidOrderCount: weeklySales.reduce((sum, day) => sum + day.paidOrders, 0),
    },
    weeklySales,
    // Counts by this seller's own fulfilment status
    counts: (() => {
      const counts = Object.fromEntries(statusRows.map((row) => [row.status, row._count._all]));
      if (untrackedOrders) counts.pending = (counts.pending ?? 0) + untrackedOrders;
      return counts;
    })(),
    recentOrders,
    topProducts,
  };
};

// Moves this seller's fulfilment from `from` to `to`, then moves the whole
// order forward when it's safe:
//   - pending -> processing as soon as any seller accepts;
//   - processing -> shipped only when EVERY seller has shipped and the order
//     has no platform-sold items (those are shipped by the admin).
// Returns null if the fulfilment was no longer in `from` (changed meanwhile).
const advanceFulfilment = ({ orderId, sellerId, from, to, courier, trackingNumber, note, actorId }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const result = await tx.sellerFulfilment.updateMany({
      where: { orderId, sellerId, status: from },
      data: {
        status: to,
        ...(to === 'shipped'
          ? { shippedAt: now, courier: courier || null, trackingNumber: trackingNumber || null }
          : {}),
      },
    });
    if (result.count !== 1) return null;

    const fulfilment = await tx.sellerFulfilment.findUnique({
      where: { orderId_sellerId: { orderId, sellerId } },
      select: { id: true },
    });
    await tx.sellerFulfilmentHistory.create({
      data: { fulfilmentId: fulfilment.id, status: to, note: note || null, changedById: actorId },
    });

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        orderStatus: true,
        fulfilments: { select: { sellerId: true, status: true } },
        items: { select: { sellerId: true, product: { select: { sellerId: true } } } },
      },
    });

    // Work from the items themselves, so a seller without a fulfilment row
    // (or an item sold by 2 Valid itself) can never be skipped.
    const itemSellers = order.items.map((item) => item.sellerId ?? item.product?.sellerId ?? null);
    const hasPlatformItems = itemSellers.some((id) => !id); // shipped by the admin
    const statusBySeller = new Map(order.fulfilments.map((f) => [f.sellerId, f.status]));
    const everySellerShipped = [...new Set(itemSellers.filter(Boolean))].every((id) =>
      ['shipped', 'delivered'].includes(statusBySeller.get(id))
    );

    let orderTo = null;
    if (to === 'processing' && order.orderStatus === 'pending') {
      orderTo = 'processing';
    } else if (
      to === 'shipped' &&
      order.orderStatus === 'processing' &&
      !hasPlatformItems &&
      everySellerShipped
    ) {
      orderTo = 'shipped';
    }

    if (orderTo) {
      // Conditional, so an admin change at the same moment wins cleanly.
      const moved = await tx.order.updateMany({
        where: { id: orderId, orderStatus: order.orderStatus },
        data: { orderStatus: orderTo },
      });
      if (moved.count === 1) {
        await tx.orderStatusHistory.create({
          data: { orderId, status: orderTo, changedById: actorId },
        });
      }
    }

    return tx.order.findFirst({ where: { id: orderId }, select: orderSelect(sellerId) });
  }, TX_OPTIONS);

module.exports = {
  listForSeller,
  findOneForSeller,
  ensureFulfilment,
  getOverviewForSeller,
  advanceFulfilment,
};
