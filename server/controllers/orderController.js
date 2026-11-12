const orderService = require('../services/order.service');

function handleError(res, error, label) {
  if (error.isAppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(`${label}:`, error);
  return res
    .status(500)
    .json({ message: 'Something went wrong. Please try again.' });
}

// Rebuilds the shape the frontend already expects.
// _id is a temporary bridge, and undefined fields are simply left out.
const toOrderResponse = (order) => ({
  _id: order.id,
  id: order.id,
  orderNumber: order.orderNumber,
  idempotencyKey: order.idempotencyKey,
  user: order.user ? { ...order.user, _id: order.user.id } : order.userId,
  items: order.items.map((item) => ({
    product: item.productId,
    name: item.name,
    sku: item.sku ?? undefined,
    image: item.image ?? undefined,
    unitPriceMinor: item.unitPriceMinor,
    quantity: item.quantity,
    lineTotalMinor: item.lineTotalMinor,
  })),
  shippingAddress: {
    fullName: order.shipFullName,
    phone: order.shipPhone,
    addressLine1: order.shipAddressLine1,
    addressLine2: order.shipAddressLine2 ?? undefined,
    city: order.shipCity,
    county: order.shipCounty,
    postalCode: order.shipPostalCode ?? undefined,
  },
  customerNote: order.customerNote ?? undefined,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  statusHistory: order.statusHistory.map((entry) => ({
    status: entry.status,
    changedAt: entry.changedAt,
    changedBy: entry.changedById ?? undefined,
  })),
  subtotalMinor: order.subtotalMinor,
  shippingFeeMinor: order.shippingFeeMinor,
  totalMinor: order.totalMinor,
  cancelledAt: order.cancelledAt ?? undefined,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

// POST /api/orders
async function placeOrder(req, res) {
  try {
    const { order, created } = await orderService.createOrder({
      userId: req.userId,
      idempotencyKey: req.get('Idempotency-Key'),
      checkoutData: req.body,
    });

    // 201 for a new order, 200 if this was a retry of an order already placed.
    return res.status(created ? 201 : 200).json({ order: toOrderResponse(order) });
  } catch (error) {
    return handleError(res, error, 'placeOrder');
  }
}

// GET /api/orders/my-orders
async function getMyOrders(req, res) {
  try {
    const orders = await orderService.getUserOrders(req.userId);
    return res.json({ orders: orders.map(toOrderResponse) });
  } catch (error) {
    return handleError(res, error, 'getMyOrders');
  }
}

// GET /api/orders/:id
async function getOrderById(req, res) {
  try {
    // Admin access comes later with roles. For now only the owner can view an order.
    const order = await orderService.getOrderForUser(
      req.userId,
      req.params.id
    );
    return res.json({ order: toOrderResponse(order) });
  } catch (error) {
    return handleError(res, error, 'getOrderById');
  }
}

// GET /api/orders
async function adminListOrders(req, res) {
  try {
    const result = await orderService.listOrders(req.query);
    return res.json({ ...result, orders: result.orders.map(toOrderResponse) });
  } catch (error) {
    return handleError(res, error, 'adminListOrders');
  }
}

async function adminDashboardOverview(req, res) {
  try {
    const result = await orderService.getDashboardOverview();
    return res.json({
      ...result,
      recentOrders: result.recentOrders.map(toOrderResponse),
    });
  } catch (error) {
    return handleError(res, error, 'adminDashboardOverview');
  }
}

// GET /api/orders/admin/:id
async function adminGetOrder(req, res) {
  try {
    const order = await orderService.getOrderForAdmin(req.params.id);
    return res.json({ order: toOrderResponse(order) });
  } catch (error) {
    return handleError(res, error, 'adminGetOrder');
  }
}

// PATCH /api/orders/:id/status
async function adminUpdateStatus(req, res) {
  try {
    const order = await orderService.updateOrderStatus({
      orderId: req.params.id,
      status: req.body?.status,
      adminId: req.userId,
    });
    return res.json({ order: toOrderResponse(order) });
  } catch (error) {
    return handleError(res, error, 'adminUpdateStatus');
  }
}

// PATCH /api/orders/:id/cancel
async function adminCancelOrder(req, res) {
  try {
    const order = await orderService.cancelOrder({
      orderId: req.params.id,
      adminId: req.userId,
    });
    return res.json({ order: toOrderResponse(order) });
  } catch (error) {
    return handleError(res, error, 'adminCancelOrder');
  }
}

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  adminListOrders,
  adminDashboardOverview,
  adminGetOrder,
  adminUpdateStatus,
  adminCancelOrder,
};
