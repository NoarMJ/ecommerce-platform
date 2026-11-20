const express = require('express');
const requireAuth = require('../middleware/requireAuth.js');
const requireSellerOrderAccess = require('../middleware/requireSellerOrderAccess.js');
const { listOrders, getOrder, advanceItem, dashboard, requestCancellation } = require('../controllers/sellerOrderController.js');

const router = express.Router();

router.use(requireAuth, requireSellerOrderAccess);

router.get('/dashboard/overview', dashboard);
router.get('/', listOrders);   // ?status=&page=&limit=
router.get('/:id', getOrder);
router.post('/items/:itemId/fulfilment', advanceItem);
router.post('/items/:itemId/cancellation-request', requestCancellation);

module.exports = router;
