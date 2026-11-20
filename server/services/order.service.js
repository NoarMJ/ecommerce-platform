
const crypto = require('crypto');

const orderRepository = require('../repositories/order.repository');
const paymentRepository = require('../repositories/payment.repository');
const cartRepository = require('../repositories/cart.repository');

const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/ids');
const { normaliseKenyanPhone } = require('../utils/phone');

const {
  sellerSnapshotFields,
  stripSellerFields,
} = require('../utils/orderSellerSnapshot');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// v1: Flat delivery fee. 0 means free delivery for now.
const FLAT_SHIPPING_FEE_MINOR = 0;

// Largest value a PostgreSQL Int can hold.
const MAX_INT = 2147483647;

// Unpaid stock reservation periods.
const HOLD_MPESA_MINUTES = Number(process.env.MPESA_HOLD_MINUTES) || 15;
const HOLD_COD_HOURS = Number(process.env.COD_HOLD_HOURS) || 24;

const holdUntilFor = (paymentMethod) => {
  const duration =
    paymentMethod === 'mpesa'
      ? HOLD_MPESA_MINUTES * 60 * 1000
      : HOLD_COD_HOURS * 60 * 60 * 1000;

  return new Date(Date.now() + duration);
};

// ---------------------------------------------------------------------------
// Order configuration
// ---------------------------------------------------------------------------

const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_METHODS = ['cash_on_delivery', 'mpesa'];

// Orders move forward one step at a time.
// Cancellation is handled separately.
const NEXT_STATUS = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const cleanString = (value) =>
  typeof value === 'string' ? value.trim() : '';

// Customers must never see seller-specific information.
const toCustomerOrder = (order) =>
  order && {
    ...order,
    items: (order.items || []).map(stripSellerFields),
  };

// Whitelist the fields accepted during checkout.
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
    throw new AppError(
      'Please enter a valid Kenyan phone number.',
      400
    );
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

// e.g. ORD-261118-A1B2C3
const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `ORD-${date}-${random}`;
};

// ---------------------------------------------------------------------------
// CUSTOMER
// ---------------------------------------------------------------------------

// Create an order using the authenticated customer's server-side cart.
const createOrder = async ({ userId, idempotencyKey, checkoutData }) => {
  // 1. Validate idempotency key.
  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 100
  ) {
    throw new AppError('A valid idempotency key is required.', 400);
  }

  // 2. Return an existing order when the same request is repeated.
  const existingOrder = await orderRepository.findByIdempotencyKey(
    userId,
    idempotencyKey
  );

  if (existingOrder) {
    return {
      order: toCustomerOrder(existingOrder),
      created: false,
    };
  }

  // 3. Validate checkout information.
  const checkout = validateCheckoutData(checkoutData);

  // 4. Get the cart from the database.
  // Never trust product IDs, prices or quantities from the checkout body.
  const cart = await cartRepository.findByUserIdForCheckout(userId);

  if (!cart || cart.items.length === 0) {
    throw new AppError('Your cart is empty.', 400);
  }

  // Product and seller details are included in the checkout cart query.
  const productsById = new Map(
    cart.items
      .filter((item) => item.product)
      .map((item) => [item.productId, item.product])
  );

  // 6. Build order lines using current database information.
  const lines = cart.items.map((item) => {
    const product = productsById.get(item.productId);

    // Platform products do not have a seller.
    // Marketplace products require an approved seller.
    const sellerAllowed =
      !product?.sellerId ||
      product.seller?.status === 'approved';

    if (!product || !product.isActive || !sellerAllowed) {
      throw new AppError(
        'A product in your cart is no longer available.',
        409
      );
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

      // Preserve seller information at purchase time.
      sellerId: sellerSnapshotFields(product).sellerId,
      sellerShopNameAtPurchase:
        sellerSnapshotFields(product).sellerShopNameAtPurchase,
    };
  });

  // 7. Calculate order totals on the server.
  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.lineTotalMinor,
    0
  );

  const shippingFeeMinor = FLAT_SHIPPING_FEE_MINOR;
  const totalMinor = subtotalMinor + shippingFeeMinor;

  if (
    !Number.isSafeInteger(subtotalMinor) ||
    !Number.isSafeInteger(totalMinor) ||
    totalMinor > MAX_INT
  ) {
    throw new AppError('This order total is too large.', 400);
  }

  // 8. Prepare order data.
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
    paymentStatus: 'pending',
    orderStatus: 'pending',

    subtotalMinor,
    shippingFeeMinor,
    totalMinor,
  };

  // Calculate reservation expiry.
  const holdUntil = holdUntilFor(checkout.paymentMethod);

  // 9. Reserve stock, create order and clear cart transactionally.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await orderRepository.createWithStockReservation({
        orderData: {
          ...orderData,
          orderNumber: generateOrderNumber(),
        },
        lines,
        cartId: cart.id,
        holdUntil,
      });

      return {
        order: toCustomerOrder(order),
        created: true,
      };
    } catch (error) {
      // Stock changed between validation and reservation.
      if (error.code === 'OUT_OF_STOCK') {
        throw new AppError(
          `${error.productName} is no longer available in that quantity. Please review your cart.`,
          409
        );
      }

      // Handle duplicate idempotency keys and order-number collisions.
      if (error.code === 'P2002') {
        const winner = await orderRepository.findByIdempotencyKey(
          userId,
          idempotencyKey
        );

        if (winner) {
          return {
            order: toCustomerOrder(winner),
            created: false,
          };
        }

        // A random order-number collision occurred.
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    'Could not generate an order number. Please try again.',
    500
  );
};

// What the customer can do about paying an M-Pesa order right now. Mirrors the
// checks in payment.service startMpesaPayment, so the list never offers a
// "Pay now" that the server would refuse.
//   pay     -> a new prompt can be sent
//   check   -> the last prompt has no result yet; no new prompt until it does
//   review  -> money may have arrived; a person is checking it
//   expired -> the stock hold ran out; the order is about to be cancelled
//   null    -> nothing to pay (paid, cancelled, or not M-Pesa)
const getPaymentAction = (order, now = new Date()) => {
  if (
    order.paymentMethod !== 'mpesa' ||
    order.paymentStatus !== 'pending' ||
    order.orderStatus !== 'pending'
  ) {
    return null;
  }

  const latest = order.payments?.[0]?.status;
  if (latest === 'needs_review') return 'review';
  if (latest === 'initiated') return 'check';

  const holdActive = (order.stockReservations || []).some(
    (hold) => hold.status === 'active' && new Date(hold.expiresAt) > now
  );
  return holdActive ? 'pay' : 'expired';
};

// Get all orders belonging to a customer.
const getUserOrders = async (userId) => {
  const orders = await orderRepository.findAllForUser(userId);
  const now = new Date();

  return orders.map((order) =>
    toCustomerOrder({ ...order, paymentAction: getPaymentAction(order, now) })
  );
};

// Get one order belonging to a customer.
// Return 404 instead of 403 to prevent order-ID enumeration.
const getOrderForUser = async (userId, orderId) => {
  if (!isUuid(orderId)) {
    throw new AppError('Order not found.', 404);
  }

  const order = await orderRepository.findByIdForUser(orderId, userId);

  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  // Receipt details for the confirmation page.
  const payment =
    order.paymentMethod === 'mpesa' && order.paymentStatus === 'paid'
      ? await paymentRepository.findSucceededForOrder(order.id)
      : null;

  return { ...toCustomerOrder(order), payment };
};

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

// Paid by M-Pesa, confirmed by Safaricom's status query, but the callback with
// the receipt code never came. Staff can find the code on the M-Pesa statement.
const isMpesaReceiptMissing = (order) =>
  order.paymentMethod === 'mpesa' &&
  order.paymentStatus === 'paid' &&
  !order.payments?.[0]?.mpesaReceiptNumber;

// Paginated order listing with status filtering and search.
const listOrders = async ({
  status,
  search,
  page = 1,
  limit = 20,
} = {}) => {
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(limit, 10) || 20, 1),
    50
  );

  if (status && !ORDER_STATUSES.includes(status)) {
    throw new AppError('Invalid status filter.', 400);
  }

  const searchText =
    typeof search === 'string'
      ? search.trim().slice(0, 50)
      : '';

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
    orders: orders.map((order) => ({
      ...order,
      mpesaReceiptMissing: isMpesaReceiptMissing(order),
    })),
    total,
    page: pageNumber,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
    counts,
  };
};

// Admin dashboard statistics.
const getDashboardOverview = () =>
  orderRepository.getDashboardOverview();

// Get order details with customer information.
// Admins retain access to seller snapshots.
const getOrderForAdmin = async (orderId) => {
  if (!isUuid(orderId)) {
    throw new AppError('Order not found.', 404);
  }

  const order = await orderRepository.findByIdWithCustomer(orderId);

  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  // The M-Pesa receipt, so staff can match the order to the M-Pesa statement.
  const payment =
    order.paymentMethod === 'mpesa' && order.paymentStatus === 'paid'
      ? await paymentRepository.findSucceededForOrder(order.id)
      : null;

  return { ...order, payment };
};

// Move an order to its next permitted status.
const updateOrderStatus = async ({
  orderId,
  status,
  adminId,
}) => {
  if (!isUuid(orderId)) {
    throw new AppError('Order not found.', 404);
  }

  const order = await orderRepository.findById(orderId);

  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  // Enforce sequential status transitions.
  if (NEXT_STATUS[order.orderStatus] !== status) {
    throw new AppError(
      `An order that is ${order.orderStatus} cannot be moved to ${status}.`,
      409
    );
  }

  // M-Pesa orders cannot enter processing before successful payment.
  if (
    order.paymentMethod === 'mpesa' &&
    order.paymentStatus !== 'paid' &&
    status === 'processing'
  ) {
    throw new AppError(
      'This M-Pesa order has not been paid yet.',
      409
    );
  }

  // COD is paid when the customer receives the order and hands over cash.
  const markPaid =
    status === 'delivered' &&
    order.paymentMethod === 'cash_on_delivery';

  // COD stock reservation becomes a committed inventory sale
  // when the order is accepted for processing.
  const commitStock =
    status === 'processing' &&
    order.paymentMethod === 'cash_on_delivery';

  // Compare-and-update prevents two admins from applying
  // the same status transition simultaneously.
  const updated = await orderRepository.advanceStatus({
    orderId,
    from: order.orderStatus,
    to: status,
    adminId,
    markPaid,
    commitStock,
  });

  if (!updated) {
    throw new AppError(
      'This order was just changed by someone else. Refresh and try again.',
      409
    );
  }

  return updated;
};

// ---------------------------------------------------------------------------
// ORDER CANCELLATION
// ---------------------------------------------------------------------------

// Cancel an order that has not shipped and restore its stock.
const cancelOrder = async ({ orderId, adminId }) => {
  if (!isUuid(orderId)) {
    throw new AppError('Order not found.', 404);
  }

  const cancelled = await orderRepository.cancel({
    orderId,
    adminId,
  });

  if (!cancelled) {
    if (!(await orderRepository.exists(orderId))) {
      throw new AppError('Order not found.', 404);
    }

    throw new AppError(
      'Only pending or processing orders can be cancelled.',
      409
    );
  }

  return cancelled;
};

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = {
  createOrder,
  getUserOrders,
  getOrderForUser,
  getPaymentAction,
  isMpesaReceiptMissing,

  listOrders,
  getDashboardOverview,
  getOrderForAdmin,

  updateOrderStatus,
  cancelOrder,
};
