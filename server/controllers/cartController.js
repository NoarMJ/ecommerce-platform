
const Cart = require('../models/cart');
const Product = require('../models/product');
const {
  getOrCreateGuestCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../services/cartService');

// GET /api/cart
// Return the current user's cart or the visitor's guest cart.
async function getCart(req, res, next) {
  try {
    let cart;

    if (req.session.userId) {
      // Logged-in visitors use the cart linked to their account.
      cart = await Cart.findOne({
        user: req.session.userId,
      });
    } else {
      // Guests are identified using a token stored in a cookie.
      const guestToken = req.cookies?.guestCartToken;

      const result = await getOrCreateGuestCart(guestToken);
      cart = result.cart;

      // Only send a new cookie when a new guest token was created.
      if (result.guestToken) {
        res.cookie('guestCartToken', result.guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      }
    }

    if (!cart) {
      return res.status(200).json({
        items: [],
        totalMinor: 0,
      });
    }

    // Load current product details for the cart's items.
    await cart.populate({
      path: 'items.product',
      select: 'name slug priceMinor images stock isActive',
    });

    // Hide products that no longer exist or are inactive.
    const items = cart.items
      .filter((item) => item.product && item.product.isActive)
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        lineTotalMinor: item.product.priceMinor * item.quantity,
      }));

    const totalMinor = items.reduce(
      (total, item) => total + item.lineTotalMinor,
      0
    );

    return res.status(200).json({
      items,
      totalMinor,
    });
  } catch (error) {
    next(error);
  }
}


async function addCartItem(req, res, next) {
  try {
    // The client must provide a product ID and quantity.
    const { productId, quantity } = req.body;

    if (
      typeof productId !== 'string' ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        message:
          'Provide a valid productId and a positive integer quantity.',
      });
    }

    let cart;

    if (req.session.userId) {
      // Find the cart belonging to the logged-in customer.
      cart = await Cart.findOne({
        user: req.session.userId,
      });

      // Create an account cart if one does not exist.
      if (!cart) {
        cart = await Cart.create({
          user: req.session.userId,
          items: [],
        });
      }
    } else {
      // Find or create the guest cart using its cookie.
      const guestToken = req.cookies?.guestCartToken;
      const result = await getOrCreateGuestCart(guestToken);

      cart = result.cart;

      // Send the cookie only when a new guest token is created.
      if (result.guestToken) {
        res.cookie('guestCartToken', result.guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      }
    }

    // The service enforces product, quantity, and stock rules.
    await addItemToCart(cart, productId, quantity);

    // Recalculate the response using current database prices.
    const items = cart.items
      .filter((item) => item.product && item.product.isActive)
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        lineTotalMinor:
          item.product.priceMinor * item.quantity,
      }));

    const totalMinor = items.reduce(
      (total, item) => total + item.lineTotalMinor,
      0
    );

    return res.status(200).json({
      message: 'Product added to cart successfully.',
      items,
      totalMinor,
    });
  } catch (error) {
    next(error);
  }
}


async function updateCartItemQuantity(req, res, next) {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: 'Quantity must be a positive integer.',
      });
    }

    let cart;

    if (req.session.userId) {
      cart = await Cart.findOne({
        user: req.session.userId,
      });

      if (!cart) {
        return res.status(404).json({
          message: 'Cart not found.',
        });
      }
    } else {
      const guestToken = req.cookies?.guestCartToken;
      const result = await getOrCreateGuestCart(guestToken);

      cart = result.cart;

      if (result.guestToken) {
        res.cookie('guestCartToken', result.guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      }
    }

    await updateCartItem(cart, productId, quantity);

    const items = cart.items
      .filter(
        (item) => item.product && item.product.isActive
      )
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        lineTotalMinor:
          item.product.priceMinor * item.quantity,
      }));

    const totalMinor = items.reduce(
      (total, item) => total + item.lineTotalMinor,
      0
    );

    return res.status(200).json({
      message: 'Cart item quantity updated successfully.',
      items,
      totalMinor,
    });
  } catch (error) {
    next(error);
  }
}



async function removeCartItemFromCart(req, res, next) {
    console.log('URL : ' , req.originalUrl);
    console.log('params' , req.params);
  try {
    const { productId } = req.params;
    let cart;

    if (req.session.userId) {
      cart = await Cart.findOne({
        user: req.session.userId,
      });

      if (!cart) {
        return res.status(404).json({
          message: 'Cart not found.',
        });
      }
    } else {
      const guestToken = req.cookies?.guestCartToken;

      const result = await getOrCreateGuestCart(guestToken);
      cart = result.cart;

      if (result.guestToken) {
        res.cookie('guestCartToken', result.guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      }
    }
        console.log('Delete productID ', req.params.productId);
    console.log(' delete product id length' ,  req.params.productId?.length);

    await removeCartItem(cart, productId);
    


    const items = cart.items
      .filter(
        (item) => item.product && item.product.isActive
      )
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        lineTotalMinor:
          item.product.priceMinor * item.quantity,
      }));

    const totalMinor = items.reduce(
      (total, item) => total + item.lineTotalMinor,
      0
    );

    return res.status(200).json({
      message: 'Cart item removed successfully.',
      items,
      totalMinor,
    });
  } catch (error) {
    next(error);
  }
}

async function clearCartContents ( req, res, next) {
    try {
        let cart;

        if (req.session.userId) {
            cart = await Cart.findOne({
                user: req.session.userId,
            });

        if (!cart) {
            return res.status(200).json({
                message: " the cart is already empty ",
                items: [],
                totalMinor: 0,
            });
        }
        else{ 
            const guestToken = req.cookies?.guestCartToken;
      const result = await getOrCreateGuestCart(guestToken);

      cart = result.cart;

      if (result.guestToken) {
        res.cookie('guestCartToken', result.guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        });
        }
        }

        await clearCart(cart);

        return res.status(200).json({
            message: "Cart is cleared succesfully",
            items:[],
            totalMinor: 0,
        });
        } 
    } catch (error) {
        next(error);
    }
}


module.exports = {
  getCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItemFromCart,
  clearCartContents,
};
