
const crypto = require('crypto');
const mongoose = require('mongoose');

const Cart = require('../models/cart');
const Product = require('../models/product');

const GUEST_CART_TTL_DAYS = 30;

// Convert the raw guest token into a hash for database lookup.
function hashGuestToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

// Generate a cryptographically secure guest token.
function createGuestToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Find an existing guest cart or create a new one.
async function getOrCreateGuestCart(token) {
  if (typeof token === 'string' && token.length > 0) {
    const existingCart = await Cart.findOne({
      guestTokenHash: hashGuestToken(token),
      expiresAt: { $gt: new Date() },
    });

    if (existingCart) {
      return {
        cart: existingCart,
        guestToken: null,
      };
    }
  }

  const guestToken = createGuestToken();

  const expiresAt = new Date(
    Date.now() +
      GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const cart = await Cart.create({
    guestTokenHash: hashGuestToken(guestToken),
    expiresAt,
    items: [],
  });

  return {
    cart,
    guestToken,
  };
}

// Add a product to a guest or registered customer's cart.
async function addItemToCart(cart, productId, quantity) {
  // Rule 1: Quantity must be a positive integer.
  if (!Number.isInteger(quantity) || quantity < 1) {
    const error = new Error(
      'Quantity must be a positive integer.'
    );
    error.status = 400;
    throw error;
  }

  // Rule 2: The product ID must be a valid MongoDB ObjectId.
  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error('Invalid product ID.');
    error.status = 400;
    throw error;
  }

  // Rule 3: The product must exist and be active.
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    const error = new Error(
      'Product not found or is no longer available.'
    );
    error.status = 404;
    throw error;
  }

  // Find the product in the existing cart, if present.
  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  const currentQuantity = existingItem
    ? existingItem.quantity
    : 0;

  const newQuantity = currentQuantity + quantity;

  // Rule 4: The combined quantity must not exceed stock.
  if (newQuantity > product.stock) {
    const error = new Error(
      `Only ${product.stock} units are currently in stock.`
    );
    error.status = 400;
    throw error;
  }

  // Update the existing line or add a new one.
  if (existingItem) {
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      product: product._id,
      quantity,
    });
  }

  await cart.save();

  // Return the updated cart and the current product information.
  await cart.populate({
    path: 'items.product',
    select: 'name slug priceMinor images stock isActive',
  });

  return cart;
}



async function updateCartItem(cart, productId, quantity) {
    console.log('Update quantity:', quantity);
console.log('Quantity type:', typeof quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    const error = new Error(
      'Quantity must be a positive integer.'
    );
    error.status = 400;
    throw error;
  }

  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error('Invalid product ID.');
    error.status = 400;
    throw error;
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    const error = new Error(
      'Product not found or is no longer available.'
    );
    error.status = 404;
    throw error;
  }

  if (quantity > product.stock) {
    const error = new Error(
      `Only ${product.stock} units are currently in stock.`
    );
    error.status = 400;
    throw error;
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (!existingItem) {
    const error = new Error(
      'This product is not in the cart.'
    );
    error.status = 404;
    
    throw error;
  }

  existingItem.quantity = quantity;

  await cart.save();

  await cart.populate({
    path: 'items.product',
    select: 'name slug priceMinor images stock isActive',
  });

  return cart;
}

// removing one singular item on the cart 

async function removeCartItem(cart, productId) {
  // 1. Validate the product ID.
  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error('Invalid product ID.');
    error.status = 400;
    throw error;
  }

  // 2. Find the product's line in the cart.
  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  // 3. Stop if the product is not in the cart.
  if (itemIndex === -1) {
    const error = new Error(
      'This product is not in the cart.'
    );
    error.status = 404;
    throw error;
  }

  // 4. Remove only this item and save the cart.
  cart.items.splice(itemIndex, 1);

  await cart.save();

  // 5. Populate product details for the response.
  await cart.populate({
    path: 'items.product',
    select: 'name slug priceMinor images stock isActive',
  });

  return cart;
}
// removing all the items from the cart 

async function clearCart(cart) {
    cart.items = [];

    await cart.save();

    return cart;
}
// lookup, validte, transfer ownership merge and persist

async function mergeGuestCartIntoUserCart(userId, guestToken) {
  // No guest token means there is nothing to merge.
  if (typeof guestToken !== 'string' || !guestToken) {
    return { merged: false, reason: 'no_guest_token' };
  }

  // Find the guest cart using the hash of its cookie token.
  const guestCart = await Cart.findOne({
    guestTokenHash: hashGuestToken(guestToken),
    expiresAt: { $gt: new Date() },
  });

  if (!guestCart) {
    return { merged: false, reason: 'no_guest_cart' };
  }

  // Find the customer's existing account cart.
  const userCart = await Cart.findOne({ user: userId });

  // Validate the guest products before changing either cart.
  const guestProductIds = guestCart.items.map(
    (item) => item.product.toString()
  );

  const products = await Product.find({
    _id: { $in: guestProductIds },
    isActive: true,
  });

  const productsById = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  for (const guestItem of guestCart.items) {
    const productId = guestItem.product.toString();
    const product = productsById.get(productId);

    if (!product) {
      const error = new Error(
        'A product in your guest cart is no longer available.'
      );
      error.status = 409;
      throw error;
    }

    const accountItem = userCart?.items.find(
      (item) => item.product.toString() === productId
    );

    const combinedQuantity =
      guestItem.quantity + (accountItem?.quantity || 0);

    if (combinedQuantity > product.stock) {
      const error = new Error(
        `${product.name}: only ${product.stock} units are currently in stock. Please update your cart before merging.`
      );
      error.status = 409;
      throw error;
    }
  }

  // If the customer has no account cart, transfer ownership
  // of the guest cart instead of creating a duplicate cart.
  if (!userCart) {
    guestCart.user = userId;
    guestCart.guestTokenHash = undefined;
    guestCart.expiresAt = undefined;

    await guestCart.save();

    return { merged: true };
  }

  // Combine guest quantities into the existing account cart.
  for (const guestItem of guestCart.items) {
    const productId = guestItem.product.toString();

    const accountItem = userCart.items.find(
      (item) => item.product.toString() === productId
    );

    if (accountItem) {
      accountItem.quantity += guestItem.quantity;
    } else {
      userCart.items.push({
        product: guestItem.product,
        quantity: guestItem.quantity,
      });
    }
  }

  // Save the account cart before deleting the guest cart.
  await userCart.save();
  await Cart.deleteOne({ _id: guestCart._id });

  return { merged: true };
}





module.exports = {
  getOrCreateGuestCart,
  hashGuestToken,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeGuestCartIntoUserCart
};
