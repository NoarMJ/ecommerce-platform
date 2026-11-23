const express = require('express');
const requireAuth = require('../middleware/requireAuth.js');
const requireSellerOrderAccess = require('../middleware/requireSellerOrderAccess.js');
const { listOrders, getOrder, getOverview, updateFulfilment } = require('../controllers/sellerOrderController.js');

const router = express.Router();

router.use(requireAuth, requireSellerOrderAccess);

router.get('/', listOrders);   // ?status=&page=&limit=
router.get('/overview', getOverview); // dashboard figures; must stay above '/:id'
router.get('/:id', getOrder);
router.post('/:id/fulfilment', updateFulfilment); // { status: processing|shipped, courier?, trackingNumber?, note? }

module.exports = router;
