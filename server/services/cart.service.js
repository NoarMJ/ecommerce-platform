const crypto = require('crypto');
const cartRepository = require('../repositories/cart.repository');
const productRepository = require('../repositories/product.repository');
const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/ids');

const GUEST_CART_TTL_DAYS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Convert the raw guest token into a hash for database lookup.
const hashGuestToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Generate a cryptographically secure guest token.
const createGuestToken = () => crypto.randomBytes(32).toString('hex');

// Turn a cart row into the response shape the frontend expects.
// Inactive products are hidden, like before.
const buildView = (cart) => {
  const items = (cart?.items || [])
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

  return { items, totalMinor };
};

// Finds the visitor's cart without creating one.
// identity is { userId, guestToken }: userId is set for logged-in customers.
const findExistingCart = async ({ userId, guestToken }) => {
  if (userId) return cartRepository.findByUserId(userId);

  if (typeof guestToken === 'string' && guestToken) {
    return cartRepository.findActiveGuestCart(hashGuestToken(guestToken));
  }

  return null;
};

const assertQuantity = (quantity) => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError('Quantity must be a positive integer.', 400);
  }
};

const assertProductId = (productId) => {
  if (!isUuid(productId)) throw new AppError('Invalid product ID.', 400);
};

const loadActiveProduct = async (productId) => {
  const product = await productRepository.findActiveById(productId);

  if (!product) {
    throw new AppError('Product not found or is no longer available.', 404);
  }

  return product;
};

// ---------------------------------------------------------------------------
// Cart actions
// ---------------------------------------------------------------------------

const getCart = async (identity) =>
  buildView(await findExistingCart(identity));

const addItem = async (identity, productId, quantity) => {
  assertQuantity(quantity);
  assertProductId(productId);

  const product = await loadActiveProduct(productId);

  let cart = await findExistingCart(identity);
  let newGuestToken = null;

  if (!cart) {
    if (identity.userId) {
      try {
        cart = await cartRepository.createForUser(identity.userId);
      } catch (error) {
        // Two requests at once can both try to create the cart
        if (error.code !== 'P2002') throw error;
        cart = await cartRepository.findByUserId(identity.userId);
      }
    } else {
      newGuestToken = createGuestToken();

      cart = await cartRepository.createForGuest(
        hashGuestToken(newGuestToken),
        new Date(Date.now() + GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000)
      );
    }
  }

  const existingItem = cart.items.find((item) => item.productId === productId);
  const newQuantity = (existingItem?.quantity || 0) + quantity;

  // The combined quantity must not exceed stock.
  if (newQuantity > product.stock) {
    throw new AppError(
      `Only ${product.stock} units are currently in stock.`,
      400
    );
  }

  await cartRepository.setItemQuantity(cart.id, productId, newQuantity);

  const updated = await cartRepository.findById(cart.id);
  return { view: buildView(updated), newGuestToken };
};

const updateItem = async (identity, productId, quantity) => {
  assertQuantity(quantity);
  assertProductId(productId);

  const product = await loadActiveProduct(productId);

  if (quantity > product.stock) {
    throw new AppError(
      `Only ${product.stock} units are currently in stock.`,
      400
    );
  }

  const cart = await findExistingCart(identity);
  if (!cart) throw new AppError('Cart not found.', 404);

  const existingItem = cart.items.find((item) => item.productId === productId);
  if (!existingItem) {
    throw new AppError('This product is not in the cart.', 404);
  }

  await cartRepository.setItemQuantity(cart.id, productId, quantity);

  return buildView(await cartRepository.findById(cart.id));
};

const removeItem = async (identity, productId) => {
  assertProductId(productId);

  const cart = await findExistingCart(identity);
  if (!cart) throw new AppError('Cart not found.', 404);

  const existingItem = cart.items.find((item) => item.productId === productId);
  if (!existingItem) {
    throw new AppError('This product is not in the cart.', 404);
  }

  await cartRepository.deleteItem(cart.id, productId);

  return buildView(await cartRepository.findById(cart.id));
};

// Returns true if there was a cart to clear
const clearCart = async (identity) => {
  const cart = await findExistingCart(identity);
  if (!cart) return false;

  await cartRepository.clearItems(cart.id);
  return true;
};

// ---------------------------------------------------------------------------
// Guest cart merge (called at login)
// ---------------------------------------------------------------------------

const mergeGuestCartIntoUserCart = async (userId, guestToken) => {
  // No guest token means there is nothing to merge.
  if (typeof guestToken !== 'string' || !guestToken) {
    return { merged: false, reason: 'no_guest_token' };
  }

  const guestCart = await cartRepository.findActiveGuestCart(
    hashGuestToken(guestToken)
  );

  if (!guestCart) {
    return { merged: false, reason: 'no_guest_cart' };
  }

  const userCart = await cartRepository.findByUserId(userId);

  // Validate everything before changing either cart.
  for (const guestItem of guestCart.items) {
    const product = guestItem.product;

    if (!product.isActive) {
      throw new AppError(
        'A product in your guest cart is no longer available.',
        409
      );
    }

    const accountItem = userCart?.items.find(
      (item) => item.productId === guestItem.productId
    );

    const combinedQuantity =
      guestItem.quantity + (accountItem?.quantity || 0);

    if (combinedQuantity > product.stock) {
      throw new AppError(
        `${product.name}: only ${product.stock} units are currently in stock. Please update your cart before merging.`,
        409
      );
    }
  }

  if (!userCart) {
    // The customer has no account cart: transfer ownership of the guest cart
    await cartRepository.transferGuestCartToUser(guestCart.id, userId);
  } else {
    await cartRepository.mergeIntoUserCart(
      userCart.id,
      guestCart.id,
      guestCart.items
    );
  }

  return { merged: true };
};

module.exports = {
  hashGuestToken,
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeGuestCartIntoUserCart,
};