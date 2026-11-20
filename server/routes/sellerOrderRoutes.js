const express = require('express');
const requireAuth = require('../middleware/requireAuth.js');
const requireSellerOrderAccess = require('../middleware/requireSellerOrderAccess.js');
const { listOrders, getOrder } = require('../controllers/sellerOrderController.js');

const router = express.Router();

router.use(requireAuth, requireSellerOrderAccess);

router.get('/', listOrders);   // ?status=&page=&limit=
router.get('/:id', getOrder);

module.exports = router;
