const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const { getCart ,addCartItem , updateCartItemQuantity, removeCartItemFromCart  , clearCartContents} =  require('../controllers/cartController');

const router = express.Router();

router.use(optionalAuth);




router.get('/' ,  getCart);
router.post('/items' , addCartItem);

router.patch('/items/:productId' , updateCartItemQuantity);

router.delete('/items/:productId' , removeCartItemFromCart);

router.delete('/', clearCartContents);

module.exports = router;
