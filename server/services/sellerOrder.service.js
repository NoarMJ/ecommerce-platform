const sellerOrderRepository = require('../repositories/sellerOrder.repository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

function toSellerOrderView(order) {
  const sellerSubtotalMinor = order.items.reduce(
    (sum, item) => sum + item.lineTotalMinor,
    0
  );

  const addressReleased = order.paymentStatus === 'paid' ||
    (order.paymentMethod === 'cash_on_delivery' && order.orderStatus !== 'pending');
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    // Cash on delivery can be fulfilled straight away; M-Pesa only once paid.
    readyToFulfil:
      order.orderStatus !== 'cancelled' &&
      (order.paymentStatus === 'paid' || (order.paymentMethod === 'cash_on_delivery' && order.orderStatus !== 'pending')),
    ...(addressReleased ? {
      shipping: {
        fullName: order.shipFullName,
        phone: order.shipPhone,
        addressLine1: order.shipAddressLine1,
        addressLine2: order.shipAddressLine2,
        city: order.shipCity,
        county: order.shipCounty,
        postalCode: order.shipPostalCode,
      },
      customerNote: order.customerNote,
    } : { shipping: null, customerNote: null }),
    items: order.items,
    sellerSubtotalMinor,
  };
}

async function advanceMyItem(sellerId, itemId, action) {
  const steps = {
    approve: ['awaiting_payment', 'approved', 'approvedAt'],
    process: ['approved', 'processed', 'processedAt'],
    dispatch: ['processed', 'dispatched', 'dispatchedAt'],
    deliver: ['dispatched', 'delivered', 'deliveredAt'],
  };
  const step = steps[action];
  if (!step) throw new AppError('Invalid fulfilment action.', 400);
  const updated = await sellerOrderRepository.advanceItem({
    itemId, sellerId, from: step[0], to: step[1], timestamp: step[2],
  });
  if (!updated) throw new AppError('This item cannot move to that status. Check payment and current status.', 409);
  return updated;
}

async function requestMyItemCancellation(sellerId, itemId, reason) {
  const cleanReason = text(reason).slice(0, 500);
  if (cleanReason.length < 3) throw new AppError('Give a short reason for the cancellation request.', 400);
  const result = await sellerOrderRepository.requestItemCancellation({ itemId, sellerId, reason: cleanReason });
  if (result.count !== 1) throw new AppError('This item cannot be submitted for cancellation.', 409);
  return { requested: true };
}

async function adminCancelItem(adminId, itemId) {
  const updated = await sellerOrderRepository.adminCancelItem({ itemId, adminId });
  if (!updated) throw new AppError('This item cannot be cancelled.', 409);
  return updated;
}

const getDashboardOverview = (sellerId) => sellerOrderRepository.getDashboardOverview(sellerId);

async function listMyOrders(sellerId, query = {}) {
  const orderStatus = text(query.status) || undefined;
  if (orderStatus && !ORDER_STATUSES.includes(orderStatus)) {
    throw new AppError('Invalid status filter.', 400);
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [rows, total] = await sellerOrderRepository.listForSeller({
    sellerId,
    orderStatus,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    orders: rows.map(toSellerOrderView),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getMyOrder(sellerId, orderId) {
  if (!UUID_PATTERN.test(String(orderId))) {
    throw new AppError('Order not found.', 404);
  }

  const order = await sellerOrderRepository.findOneForSeller(orderId, sellerId);
  if (!order) throw new AppError('Order not found.', 404);

  return toSellerOrderView(order);
}

module.exports = { listMyOrders, getMyOrder, advanceMyItem, requestMyItemCancellation, adminCancelItem, getDashboardOverview, toSellerOrderView };
