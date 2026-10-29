const orderService = require('../services/orderService');

function handleError(res, error, label) {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }

  console.error(`${label}:`, error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}

// POST /api/orders
async function placeOrder(req, res) {
  try {
    const { order, created } = await orderService.createOrder({
      userId: req.session.userId,
      idempotencyKey: req.get('Idempotency-Key'),
      checkoutData: req.body,
    });

    // 201 for a new order, 200 if this was a retry of an order already placed.
    return res.status(created ? 201 : 200).json({ order });
  } catch (error) {
    return handleError(res, error, 'placeOrder');
  }
}

// GET /api/orders/my-orders
async function getMyOrders(req, res) {
  try {
    const orders = await orderService.getUserOrders(req.session.userId);
    return res.json({ orders });
  } catch (error) {
    return handleError(res, error, 'getMyOrders');
  }
}

// GET /api/orders/:id
async function getOrderById(req, res) {
  try {
    // Admin access comes later with roles. For now only the owner can view an order.
    const order = await orderService.getOrderForUser(
      req.session.userId,
      req.params.id,
      false
    );
    return res.json({ order });
  } catch (error) {
    return handleError(res, error, 'getOrderById');
  }
}

// GET /api/orders
async function adminListOrders(req, res) {
  try {
    const result = await orderService.listOrders(req.query);
    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'adminListOrders');
  }
}

// GET /api/orders/admin/:id
async function adminGetOrder(req, res) {
  try {
    const order = await orderService.getOrderForAdmin(req.params.id);
    return res.json({ order });
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
      adminId: req.session.userId,
    });
    return res.json({ order });
  } catch (error) {
    return handleError(res, error, 'adminUpdateStatus');
  }
}

// PATCH /api/orders/:id/cancel
async function adminCancelOrder(req, res) {
  try {
    const order = await orderService.cancelOrder({
      orderId: req.params.id,
      adminId: req.session.userId,
    });
    return res.json({ order });
  } catch (error) {
    return handleError(res, error, 'adminCancelOrder');
  }
}

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  adminListOrders,
  adminGetOrder,
  adminUpdateStatus,
  adminCancelOrder,
};
