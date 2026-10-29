const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const requirePermission = require('../middleware/requirePermission');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.use(requireAuth);

// ---- Customer ----
router.post('/', orderController.placeOrder);
router.get('/my-orders', orderController.getMyOrders);

// ---- Admin ----
router.get(
  '/',
  requireAdmin,
  requirePermission('orders.read'),
  orderController.adminListOrders
);

router.get(
  '/admin/:id',
  requireAdmin,
  requirePermission('orders.read'),
  orderController.adminGetOrder
);

router.patch(
  '/:id/status',
  requireAdmin,
  requirePermission('orders.update'),
  orderController.adminUpdateStatus
);

router.patch(
  '/:id/cancel',
  requireAdmin,
  requirePermission('orders.update'),
  orderController.adminCancelOrder
);

// ---- Customer: single order. Keep this last so it doesn't swallow the routes above ----
router.get('/:id', orderController.getOrderById);

module.exports = router;