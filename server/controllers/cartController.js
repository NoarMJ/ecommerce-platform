const cartService = require('../services/cart.service');
const { isUuid } = require('../utils/ids');
const {
  GUEST_CART_COOKIE,
  guestCartCookieOptions,
} = require('../config/cookies');

const sendError = (error, res, next) => {
  if (error.isAppError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }
  return next(error);
};

// Who is asking? Old sessions hold Mongo ids, so only UUIDs count as logged in.
const getIdentity = (req) => ({
  userId: isUuid(req.userId) ? req.userId : null,
  guestToken: req.cookies?.[GUEST_CART_COOKIE],
});

// Temporary bridge: the frontend still reads product._id
const toResponse = (view) => ({
  items: view.items.map((item) => ({
    ...item,
    product: { ...item.product, _id: item.product.id },
  })),
  totalMinor: view.totalMinor,
});

// GET /api/cart
async function getCart(req, res, next) {
  try {
    const view = await cartService.getCart(getIdentity(req));

    return res.status(200).json(toResponse(view));
  } catch (error) {
    return sendError(error, res, next);
  }
}

// POST /api/cart/items
async function addCartItem(req, res, next) {
  try {
    const { productId, quantity } = req.body;

    if (
      typeof productId !== 'string' ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        message: 'Provide a valid productId and a positive integer quantity.',
      });
    }

    const { view, newGuestToken } = await cartService.addItem(
      getIdentity(req),
      productId,
      quantity
    );

    // Only send a cookie when a new guest cart was created.
    if (newGuestToken) {
      res.cookie(GUEST_CART_COOKIE, newGuestToken, guestCartCookieOptions);
    }

    return res.status(200).json({
      message: 'Product added to cart successfully.',
      ...toResponse(view),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
}

// PATCH /api/cart/items/:productId
async function updateCartItemQuantity(req, res, next) {
  try {
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: 'Quantity must be a positive integer.',
      });
    }

    const view = await cartService.updateItem(
      getIdentity(req),
      req.params.productId,
      quantity
    );

    return res.status(200).json({
      message: 'Cart item quantity updated successfully.',
      ...toResponse(view),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
}

// DELETE /api/cart/items/:productId
async function removeCartItemFromCart(req, res, next) {
  try {
    const view = await cartService.removeItem(
      getIdentity(req),
      req.params.productId
    );

    return res.status(200).json({
      message: 'Cart item removed successfully.',
      ...toResponse(view),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
}

// DELETE /api/cart
async function clearCartContents(req, res, next) {
  try {
    const hadCart = await cartService.clearCart(getIdentity(req));

    return res.status(200).json({
      message: hadCart
        ? 'Cart is cleared successfully.'
        : 'The cart is already empty.',
      items: [],
      totalMinor: 0,
    });
  } catch (error) {
    return sendError(error, res, next);
  }
}

module.exports = {
  getCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItemFromCart,
  clearCartContents,
};
