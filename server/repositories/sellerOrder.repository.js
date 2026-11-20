const prisma = require('../config/prisma');

// Data minimisation: only what a seller needs to fulfil their own items.
// No user id/email, no payment records, no totals of the whole order.
const orderSelect = (sellerId) => ({
  id: true,
  orderNumber: true,
  orderStatus: true,
  paymentStatus: true,
  paymentMethod: true,
  createdAt: true,
  items: {
    where: { sellerId }, // other sellers' items in the same order are never returned
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
      fulfilmentStatus: true,
      approvedAt: true,
      processedAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      cancellationRequestedAt: true,
      cancellationRequestReason: true,
    },
  },
  // Delivery details are selected separately by the service only after payment
  // confirmation, or after an administrator has released a COD order to fulfilment.
  shipFullName: true,
  shipPhone: true,
  shipAddressLine1: true,
  shipAddressLine2: true,
  shipCity: true,
  shipCounty: true,
  shipPostalCode: true,
  customerNote: true,
});

const listForSeller = ({ sellerId, orderStatus, skip, take }) => {
  const where = { items: { some: { sellerId } } };
  if (orderStatus) where.orderStatus = orderStatus;

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
    where: { id: orderId, items: { some: { sellerId } } },
    select: orderSelect(sellerId),
  });

const updateItemStatus = (tx, { itemId, sellerId, from, to, timestamp }) =>
  tx.orderItem.updateMany({
    where: { id: itemId, sellerId, fulfilmentStatus: from },
    data: { fulfilmentStatus: to, [timestamp]: new Date() },
  });

const findOwnedItem = (itemId, sellerId) =>
  prisma.orderItem.findFirst({
    where: { id: itemId, sellerId },
    include: { order: { select: { paymentMethod: true, paymentStatus: true, orderStatus: true } } },
  });

const requestItemCancellation = ({ itemId, sellerId, reason }) =>
  prisma.orderItem.updateMany({
    where: { id: itemId, sellerId, fulfilmentStatus: { in: ['awaiting_payment', 'approved', 'processed'] } },
    data: { fulfilmentStatus: 'cancellation_requested', cancellationRequestedAt: new Date(), cancellationRequestReason: reason },
  });

const adminCancelItem = ({ itemId, adminId }) => prisma.$transaction(async (tx) => {
  const item = await tx.orderItem.findUnique({ where: { id: itemId }, include: { reservation: true, order: true } });
  if (!item || ['cancelled', 'delivered'].includes(item.order.orderStatus) || ['delivered', 'cancelled'].includes(item.fulfilmentStatus)) return null;
  if (item.order.paymentMethod === 'mpesa' && item.order.paymentStatus !== 'paid') return null;
  await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  if (item.reservation?.status === 'active') {
    await tx.stockReservation.update({ where: { id: item.reservation.id }, data: { status: 'released', releasedAt: new Date() } });
  } else if (item.reservation?.status === 'committed') {
    await tx.stockReservation.update({ where: { id: item.reservation.id }, data: { status: 'released', releasedAt: new Date() } });
    await tx.stockMovement.create({ data: { productId: item.productId, orderId: item.orderId, orderItemId: item.id, type: 'return', quantityDelta: item.quantity, actorId: adminId, note: 'Item cancelled by an administrator' } });
  }
  await tx.orderItem.update({ where: { id: itemId }, data: { fulfilmentStatus: 'cancelled' } });
  await tx.order.update({
    where: { id: item.orderId },
    data: { subtotalMinor: { decrement: item.lineTotalMinor }, totalMinor: { decrement: item.lineTotalMinor } },
  });
  if (item.order.paymentStatus === 'paid' && item.order.paymentMethod === 'mpesa') {
    await tx.payment.updateMany({
      where: { orderId: item.orderId, status: 'succeeded' },
      data: { status: 'needs_review', resultDesc: `An order item was cancelled; review a manual partial refund of ${item.lineTotalMinor} minor units.` },
    });
  }
  const remaining = await tx.orderItem.count({ where: { orderId: item.orderId, fulfilmentStatus: { not: 'cancelled' } } });
  if (remaining === 0) await tx.order.update({ where: { id: item.orderId }, data: { orderStatus: 'cancelled', cancelledAt: new Date(), cancelReason: 'admin_cancelled' } });
  return tx.orderItem.findUnique({ where: { id: itemId } });
});

const advanceItem = ({ itemId, sellerId, from, to, timestamp }) =>
  prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findFirst({
      where: { id: itemId, sellerId },
      include: { order: true },
    });
    if (!item) return null;
    if (item.order.orderStatus === 'cancelled') return null;
    if (item.order.paymentMethod === 'mpesa' && item.order.paymentStatus !== 'paid') return null;
    if (item.order.paymentMethod === 'cash_on_delivery' && item.order.orderStatus === 'pending') return null;
    const result = await updateItemStatus(tx, { itemId, sellerId, from, to, timestamp });
    if (result.count !== 1) return null;
    const siblings = await tx.orderItem.findMany({ where: { orderId: item.orderId }, select: { fulfilmentStatus: true } });
    const statuses = siblings.map((row) => row.fulfilmentStatus);
    let orderStatus = 'processing';
    if (statuses.every((status) => status === 'delivered' || status === 'cancelled')) orderStatus = 'delivered';
    else if (statuses.every((status) => ['dispatched', 'delivered', 'cancelled'].includes(status)) && statuses.some((status) => status === 'dispatched')) orderStatus = 'shipped';
    await tx.order.update({ where: { id: item.orderId }, data: {
      orderStatus,
      ...(orderStatus === 'delivered' && item.order.paymentMethod === 'cash_on_delivery'
        ? { paymentStatus: 'paid' }
        : {}),
    } });
    return tx.orderItem.findUnique({ where: { id: itemId } });
  });

const getDashboardOverview = async (sellerId) => {
  const [products, revenue, paidOrders, items, pendingItems] = await Promise.all([
    prisma.product.findMany({ where: { sellerId }, select: { id: true, stock: true, lowStockThreshold: true } }),
    prisma.orderItem.aggregate({ where: { sellerId, order: { paymentStatus: 'paid' } }, _sum: { lineTotalMinor: true } }),
    prisma.orderItem.groupBy({ by: ['orderId'], where: { sellerId, order: { paymentStatus: 'paid' } } }),
    prisma.orderItem.findMany({ where: { sellerId, order: { paymentStatus: 'paid' } }, include: { order: { select: { createdAt: true } } }, orderBy: { order: { createdAt: 'desc' } }, take: 8 }),
    prisma.orderItem.count({ where: { sellerId, fulfilmentStatus: { in: ['awaiting_payment', 'approved', 'processed'] }, order: { orderStatus: { not: 'cancelled' } } } }),
  ]);
  const lowStockCount = products.filter((product) => product.stock <= product.lowStockThreshold).length;
  return { revenueMinor: revenue._sum.lineTotalMinor || 0, paidOrderCount: paidOrders.length, pendingItems, lowStockCount, recentItems: items };
};

module.exports = { listForSeller, findOneForSeller, findOwnedItem, advanceItem, requestItemCancellation, adminCancelItem, getDashboardOverview };
