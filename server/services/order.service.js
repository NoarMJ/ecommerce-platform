const crypto = require('crypto');
const orderRepository = require('../repositories/order.repository');
const cartRepository = require('../repositories/cart.repository');
const productRepository = require('../repositories/product.repository');
const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/ids');
const { normaliseKenyanPhone } = require('../utils/phone');

// v1: flat delivery fee, calculated on the server. 0 = free delivery for now.
const FLAT_SHIPPING_FEE_MINOR = 0;

const MAX_INT = 2147483647; // largest value a Postgres Int can hold

const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];
const PAYMENT_METHODS = ['cash_on_delivery', 'mpesa'];

// Orders move forward one step at a time. Cancelling is a separate action.
const NEXT_STATUS = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

// Whitelist the fields we accept. Anything else the client sends is ignored.
const validateCheckoutData = (data) => {
  const address = data?.shippingAddress || {};

  const fullName = cleanString(address.fullName);
  const phone = normaliseKenyanPhone(address.phone);
  const addressLine1 = cleanString(address.addressLine1);
  const addressLine2 = cleanString(address.addressLine2) || undefined;
  const city = cleanString(address.city);
  const county = cleanString(address.county);
  const postalCode = cleanString(address.postalCode) || undefined;

  const missing = [
    ['fullName', fullName],
    ['addressLine1', addressLine1],
    ['city', city],
    ['county', county],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new AppError(
      `Missing required delivery details: ${missing.join(', ')}.`,
      400
    );
  }

  if (!phone) {
    throw new AppError('Please enter a valid Kenyan phone number.', 400);
  }

  if (!PAYMENT_METHODS.includes(data?.paymentMethod)) {
    throw new AppError('Unsupported payment method.', 400);
  }

  return {
    shipFullName: fullName,
    shipPhone: phone,
    shipAddressLine1: addressLine1,
    shipAddressLine2: addressLine2,
    shipCity: city,
    shipCounty: county,
    shipPostalCode: postalCode,
    paymentMethod: data.paymentMethod,
    customerNote: cleanString(data?.customerNote).slice(0, 500) || undefined,
  };
};

// e.g. ORD-261028-A1B2C3
const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${date}-${random}`;
};

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

const createOrder = async ({ userId, idempotencyKey, checkoutData }) => {
  // 1. Idempotency: a retry or double-click returns the original order.
  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 100
  ) {
    throw new AppError('A valid idempotency key is required.', 400);
  }

  const existingOrder = await orderRepository.findByIdempotencyKey(
    userId,
    idempotencyKey
  );
  if (existingOrder) {
    return { order: existingOrder, created: false };
  }

  // 2. Validate the checkout form.
  const checkout = validateCheckoutData(checkoutData);

  // 3. Read the cart from the server. Never from the request body.
  const cart = await cartRepository.findByUserId(userId);
  if (!cart || cart.items.length === 0) {
    throw new AppError('Your cart is empty.', 400);
  }

  // 4. Load current product data from the database.
  const products = await productRepository.findByIds(
    cart.items.map((item) => item.productId)
  );
  const productsById = new Map(products.map((p) => [p.id, p]));

  // 5. Build order lines using database prices.
  const lines = cart.items.map((item) => {
    const product = productsById.get(item.productId);

    if (!product || !product.isActive) {
      throw new AppError('A product in your cart is no longer available.', 409);
    }

    if (item.quantity > product.stock) {
      throw new AppError(
        `${product.name}: only ${product.stock} units are currently in stock.`,
        409
      );
    }

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      image: product.images[0] ?? null,
      unitPriceMinor: product.priceMinor,
      quantity: item.quantity,
      lineTotalMinor: product.priceMinor * item.quantity,
    };
  });

  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const shippingFeeMinor = FLAT_SHIPPING_FEE_MINOR;
  const totalMinor = subtotalMinor + shippingFeeMinor;

  if (totalMinor > MAX_INT) {
    throw new AppError('This order total is too large.', 400);
  }

  const orderData = {
    userId,
    idempotencyKey,
    shipFullName: checkout.shipFullName,
    shipPhone: checkout.shipPhone,
    shipAddressLine1: checkout.shipAddressLine1,
    shipAddressLine2: checkout.shipAddressLine2,
    shipCity: checkout.shipCity,
    shipCounty: checkout.shipCounty,
    shipPostalCode: checkout.shipPostalCode,
    customerNote: checkout.customerNote,
    paymentMethod: checkout.paymentMethod,
    paymentStatus: 'pending', // COD: never "paid" at checkout
    orderStatus: 'pending',
    subtotalMinor,
    shippingFeeMinor,
    totalMinor,
  };

  // 6. Take the stock, create the order and empty the cart, all together.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await orderRepository.createWithStockReservation({
        orderData: { ...orderData, orderNumber: generateOrderNumber() },
        lines,
        cartId: cart.id,
      });

      return { order, created: true };
    } catch (error) {
      if (error.code === 'OUT_OF_STOCK') {
        throw new AppError(
          `${error.productName} no longer has enough stock. Please review your cart.`,
          409
        );
      }

      // A duplicate. Either an identical request won the race (same
      // idempotency key), or the random order number collided. Nothing was
      // saved either way, because the transaction was undone.
      if (error.code === 'P2002') {
        const winner = await orderRepository.findByIdempotencyKey(
          userId,
          idempotencyKey
        );
        if (winner) return { order: winner, created: false };
        continue;
      }

      throw error;
    }
  }

  throw new AppError('Could not generate an order number. Please try again.', 500);
};

const getUserOrders = (userId) => orderRepository.findAllForUser(userId);

// Returns 404 (not 403) for other people's orders so IDs can't be probed.
const getOrderForUser = async (userId, orderId) => {
  if (!isUuid(orderId)) throw new AppError('Order not found.', 404);

  const order = await orderRepository.findByIdForUser(orderId, userId);
  if (!order) throw new AppError('Order not found.', 404);

  return order;
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const listOrders = async ({ status, search, page = 1, limit = 20 } = {}) => {
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  if (status && !ORDER_STATUSES.includes(status)) {
    throw new AppError('Invalid status filter.', 400);
  }

  const searchText = typeof search === 'string' ? search.trim().slice(0, 50) : '';

  const [{ total, orders }, counts] = await Promise.all([
    orderRepository.findPage({
      status,
      search: searchText,
      page: pageNumber,
      limit: pageSize,
    }),
    orderRepository.countByStatus(),
  ]);

  return {
    orders,
    total,
    page: pageNumber,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
    counts,
  };
};

const getOrderForAdmin = async (orderId) => {
  if (!isUuid(orderId)) throw new AppError('Order not found.', 404);

  const order = await orderRepository.findByIdWithCustomer(orderId);
  if (!order) throw new AppError('Order not found.', 404);

  return order;
};

// Move an order to its next status.
const updateOrderStatus = async ({ orderId, status, adminId }) => {
  if (!isUuid(orderId)) throw new AppError('Order not found.', 404);

  const order = await orderRepository.findById(orderId);
  if (!order) throw new AppError('Order not found.', 404);

  if (NEXT_STATUS[order.orderStatus] !== status) {
    throw new AppError(
      `An order that is ${order.orderStatus} cannot be moved to ${status}.`,
      409
    );
  }

  if (
    order.paymentMethod === 'mpesa' &&
    order.paymentStatus !== 'paid' &&
    status === 'processing'
  ) {
    throw new AppError('This M-Pesa order has not been paid yet.', 409);
  }

  // Cash on delivery is paid when the cash is handed over.
  const markPaid =
    status === 'delivered' && order.paymentMethod === 'cash_on_delivery';

  // The "from" status stops two admins from both applying the same change.
  const updated = await orderRepository.advanceStatus({
    orderId,
    from: order.orderStatus,
    to: status,
    adminId,
    markPaid,
  });

  if (!updated) {
    throw new AppError(
      'This order was just changed by someone else. Refresh and try again.',
      409
    );
  }

  return updated;
};

// Cancel an order that has not shipped and put its stock back.
const cancelOrder = async ({ orderId, adminId }) => {
  if (!isUuid(orderId)) throw new AppError('Order not found.', 404);

  const cancelled = await orderRepository.cancel({ orderId, adminId });

  if (!cancelled) {
    if (!(await orderRepository.exists(orderId))) {
      throw new AppError('Order not found.', 404);
    }
    throw new AppError('Only pending or processing orders can be cancelled.', 409);
  }

  return cancelled;
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderForUser,
  listOrders,
  getOrderForAdmin,
  updateOrderStatus,
  cancelOrder,
};