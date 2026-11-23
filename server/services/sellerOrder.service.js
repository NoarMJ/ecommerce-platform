const sellerOrderRepository = require('../repositories/sellerOrder.repository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// What a seller may do next with their part of an order.
const SELLER_NEXT_STATUS = { pending: 'processing', processing: 'shipped' };

function isReadyToFulfil(order) {
  // Cash on delivery can be fulfilled straight away; M-Pesa only once paid.
  return (
    order.orderStatus !== 'cancelled' &&
    (order.paymentMethod === 'cash_on_delivery' || order.paymentStatus === 'paid')
  );
}

function toSellerOrderView(order) {
  const sellerSubtotalMinor = order.items.reduce(
    (sum, item) => sum + item.lineTotalMinor,
    0
  );
  const readyToFulfil = isReadyToFulfil(order);
  // No row yet (shouldn't happen, but never hide the order): treat as pending,
  // or cancelled if the whole order was cancelled. Acting on it creates the row.
  const fulfilment = order.fulfilments?.[0] ?? {
    status: order.orderStatus === 'cancelled' ? 'cancelled' : 'pending',
    courier: null,
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null,
    history: [],
  };

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    readyToFulfil,
    // This seller's progress, separate from the overall orderStatus
    fulfilment: fulfilment && {
      status: fulfilment.status,
      courier: fulfilment.courier,
      trackingNumber: fulfilment.trackingNumber,
      shippedAt: fulfilment.shippedAt,
      deliveredAt: fulfilment.deliveredAt,
      history: fulfilment.history,
    },
    // 'processing' (accept), 'shipped' (mark shipped) or null
    nextStatus:
      fulfilment && readyToFulfil ? SELLER_NEXT_STATUS[fulfilment.status] ?? null : null,
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
    items: order.items,
    sellerSubtotalMinor,
  };
}

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

// Body: { status: 'processing' | 'shipped', courier?, trackingNumber?, note? }
async function updateMyFulfilment(sellerId, orderId, input, actorId) {
  if (!UUID_PATTERN.test(String(orderId))) {
    throw new AppError('Order not found.', 404);
  }
  const body = input && typeof input === 'object' ? input : {};
  const status = text(body.status);
  const courier = text(body.courier);
  const trackingNumber = text(body.trackingNumber);
  const note = text(body.note);

  const errors = {};
  if (!['processing', 'shipped'].includes(status)) {
    errors.status = 'Status must be processing or shipped.';
  }
  if (courier.length > 80) errors.courier = 'Courier must be 80 characters or fewer.';
  if (trackingNumber.length > 80) errors.trackingNumber = 'Tracking number must be 80 characters or fewer.';
  if (note.length > 200) errors.note = 'Note must be 200 characters or fewer.';
  if (Object.keys(errors).length > 0) {
    const error = new AppError('Validation failed.', 400);
    error.details = errors;
    throw error;
  }

  let order = await sellerOrderRepository.findOneForSeller(orderId, sellerId);
  if (!order) throw new AppError('Order not found.', 404);

  // The order contains this seller's products, so they must always be able
  // to act on it: create their fulfilment row if it's missing.
  if (!order.fulfilments?.[0]) {
    await sellerOrderRepository.ensureFulfilment(orderId, sellerId);
    order = await sellerOrderRepository.findOneForSeller(orderId, sellerId);
  }
  const fulfilment = order.fulfilments[0];
  if (order.orderStatus === 'cancelled' || fulfilment.status === 'cancelled') {
    throw new AppError('This order was cancelled.', 409);
  }
  if (!isReadyToFulfil(order)) {
    throw new AppError('This M-Pesa order has not been paid yet.', 409);
  }
  if (SELLER_NEXT_STATUS[fulfilment.status] !== status) {
    throw new AppError(
      `Your part of this order is ${fulfilment.status} and can't be moved to ${status}.`,
      409
    );
  }

  const updated = await sellerOrderRepository.advanceFulfilment({
    orderId,
    sellerId,
    from: fulfilment.status,
    to: status,
    courier,
    trackingNumber,
    note,
    actorId,
  });
  if (!updated) {
    throw new AppError('This order was just updated. Refresh and try again.', 409);
  }

  return toSellerOrderView(updated);
}

async function getMyOverview(sellerId) {
  const overview = await sellerOrderRepository.getOverviewForSeller(sellerId);
  return { ...overview, recentOrders: overview.recentOrders.map(toSellerOrderView) };
}

module.exports = { listMyOrders, getMyOrder, getMyOverview, updateMyFulfilment, toSellerOrderView };
