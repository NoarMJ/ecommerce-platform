const express = require('express');

const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductBySlug
} = require('../controllers/productController');

const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const requirePermission = require('../middleware/requirePermission');
const { getAdminProducts } = require('../controllers/productController');
const requireAnyPermission = require('../middleware/requireAnyPermission');

const router = express.Router();

router.get('/' , getProducts);

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

router.get('/:id' , getProductById);



router.post(
  '/',
  requireAuth,
  requireAdmin,
  requirePermission('products.create'),
  createProduct
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  requirePermission('products.update'),
  updateProduct
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  requirePermission('products.deactivate'),
  deleteProduct
);


module.exports= router;