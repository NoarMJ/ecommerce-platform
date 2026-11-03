
const express = require('express');

const {
  getProducts,
  getProductById,
  getProductBySlug,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const requirePermission = require('../middleware/requirePermission');
const requireAnyPermission = require('../middleware/requireAnyPermission');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', getProducts);

router.get('/slug/:slug', getProductBySlug);

router.get(
  '/admin',
  requireAuth,
  requireAdmin,
  requireAnyPermission([
    'products.create',
    'products.update',
    'products.deactivate',
  ]),
  getAdminProducts
);

router.get('/:id', getProductById);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  requirePermission('products.create'),
  upload.array('images', 5),
  createProduct
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  requirePermission('products.update'),
  upload.array('images', 5),
  updateProduct
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  requirePermission('products.deactivate'),
  deleteProduct
);

module.exports = router;
