const express = require('express');
const requireAuth = require('../middleware/requireAuth.js');
const requireApprovedSeller = require('../middleware/requireApprovedSeller.js');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
  adjustStock,
  getStockHistory,
} = require('../controllers/sellerProductController.js');

const router = express.Router();

router.use(requireAuth, requireApprovedSeller);

router.get('/', listProducts);                       // ?isActive=&search=&page=&limit=
router.post('/', createProduct);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);                   // full replace of editable fields (not stock)
router.post('/:id/stock', adjustStock);              // { type, change, reason } -> atomic +/- stock
router.get('/:id/stock-history', getStockHistory);   // ?page=&limit=
router.post('/:id/deactivate', deactivateProduct);   // soft delete
router.post('/:id/activate', activateProduct);

module.exports = router;
