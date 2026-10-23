const express = require('express');

const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/' , getProducts);
router.get('/:id' , getProductById);


router.post('/', requireAuth, requireAdmin ,createProduct);

router.patch('/:id' , requireAuth , requireAdmin , updateProduct);

router.delete('/:id' , requireAuth  , requireAdmin , deleteProduct);

module.exports= router;