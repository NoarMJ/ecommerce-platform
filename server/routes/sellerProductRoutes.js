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
} = require('../controllers/sellerProductController.js');

const router = express.Router();

router.use(requireAuth, requireApprovedSeller);

router.get('/', listProducts);                       // ?isActive=&search=&page=&limit=
router.post('/', createProduct);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);                   // full replace of editable fields
router.post('/:id/deactivate', deactivateProduct);   // soft delete
router.post('/:id/activate', activateProduct);

module.exports = router;
