const crypto = require('crypto');
const mongoose = require('mongoose');

const Cart = require('../models/cart');
const Product = require('../models/product');
const Order = require('../models/order');
const { PAYMENT_METHODS } = require('../models/order');

// v1: flat delivery fee, calculated on the server. 0 = free delivery for now.
const FLAT_SHIPPING_FEE_MINOR = 0;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Accepts 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX.
// Returns +254XXXXXXXXX, or null if invalid.
function normaliseKenyanPhone(raw) {
  const cleaned = String(raw || '').replace(/[\s-]/g, '');
  const match = cleaned.match(/^(?:\+?254|0)([17]\d{8})$/);
  return match ? `+254${match[1]}` : null;
}

// Whitelist the fields we accept. Anything else the client sends is ignored.
function validateCheckoutData(data) {
  const address = data?.shippingAddress || {};

  const shippingAddress = {
    fullName: cleanString(address.fullName),
    phone: normaliseKenyanPhone(address.phone),
    addressLine1: cleanString(address.addressLine1),
    addressLine2: cleanString(address.addressLine2) || undefined,
    city: cleanString(address.city),
    county: cleanString(address.county),
    postalCode: cleanString(address.postalCode) || undefined,
  };

  const missing = ['fullName', 'addressLine1', 'city', 'county'].filter(
    (field) => !shippingAddress[field]
  );

  if (missing.length > 0) {
    throw httpError(400, `Missing required delivery details: ${missing.join(', ')}.`);
  }

  if (!shippingAddress.phone) {
    throw httpError(400, 'Please enter a valid Kenyan phone number.');
  }

  if (!PAYMENT_METHODS.includes(data?.paymentMethod)) {
    throw httpError(400, 'Unsupported payment method.');
  }

  const customerNote = cleanString(data?.customerNote).slice(0, 500) || undefined;

  return {
    shippingAddress,
    paymentMethod: data.paymentMethod,
    customerNote,
  };
}

// e.g. ORD-261028-A1B2C3
function generateOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${date}-${random}`;
}

// Atomically take stock. The conditional update means two customers can never
// both buy the last unit. If any line fails, everything already taken is put back.
async function reserveStock(lines) {
  const reserved = [];

  try {
    for (const line of lines) {
      const result = await Product.updateOne(
        { _id: line.product, isActive: true, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } }
      );

      if (result.modifiedCount !== 1) {
        throw httpError(
          409,
          `${line.name} no longer has enough stock. Please review your cart.`
        );
      }

      reserved.push(line);
    }
  } catch (error) {
    await releaseStock(reserved);
    throw error;
  }
}

async function releaseStock(lines) {
  await Promise.all(
    lines.map((line) =>
      Product.updateOne({ _id: line.product }, { $inc: { stock: line.quantity } })
    )
  );
}

// Retries if the random order number collides with an existing one.
async function insertOrder(orderData) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Order.create({
        ...orderData,
        orderNumber: generateOrderNumber(),
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.orderNumber) continue;
      throw error;
    }
  }

  throw httpError(500, 'Could not generate an order number. Please try again.');
}

async function createOrder({ userId, idempotencyKey, checkoutData }) {
  // 1. Idempotency: a retry or double-click returns the original order.
  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 100
  ) {
    throw httpError(400, 'A valid idempotency key is required.');
  }

  const existingOrder = await Order.findOne({ user: userId, idempotencyKey });
  if (existingOrder) {
    return { order: existingOrder, created: false };
  }

  // 2. Validate the checkout form.
  const checkout = validateCheckoutData(checkoutData);

  // 3. Read the cart from the server. Never from the request body.
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw httpError(400, 'Your cart is empty.');
  }

  // 4. Load current product data from the database.
  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.product) },
    isActive: true,
  });
  const productsById = new Map(products.map((p) => [p._id.toString(), p]));

  // 5. Build order lines using database prices.
  const lines = cart.items.map((item) => {
    const product = productsById.get(item.product.toString());

    if (!product) {
      throw httpError(409, 'A product in your cart is no longer available.');
    }

    if (item.quantity > product.stock) {
      throw httpError(
        409,
        `${product.name}: only ${product.stock} units are currently in stock.`
      );
    }

    return {
      product: product._id,
      name: product.name,
      sku: product.sku,
      image: product.images?.[0],
      unitPriceMinor: product.priceMinor,
      quantity: item.quantity,
      lineTotalMinor: product.priceMinor * item.quantity,
    };
  });

  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const shippingFeeMinor = FLAT_SHIPPING_FEE_MINOR;
  const totalMinor = subtotalMinor + shippingFeeMinor;

  // 6. Take the stock. Throws 409 if anything sold out in the meantime.
  await reserveStock(lines);

  // 7. Create the order. If this fails, put the stock back.
  let order;
  try {
    order = await insertOrder({
      user: userId,
      idempotencyKey,
      items: lines,
      shippingAddress: checkout.shippingAddress,
      customerNote: checkout.customerNote,
      paymentMethod: checkout.paymentMethod,
      paymentStatus: 'pending', // COD: never "paid" at checkout
      orderStatus: 'pending',
      statusHistory: [{ status: 'pending', changedBy: userId }],
      subtotalMinor,
      shippingFeeMinor,
      totalMinor,
    });
  } catch (error) {
    await releaseStock(lines);

    // Two identical requests raced: the other one won, so return its order.
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const winner = await Order.findOne({ user: userId, idempotencyKey });
      if (winner) return { order: winner, created: false };
    }

    throw error;
  }

  // 8. Clear the cart. The order already exists, so don't fail the request if this errors.
  try {
    cart.items = [];
    await cart.save();
  } catch (error) {
    console.error('Order created but cart could not be cleared:', error);
  }

  return { order, created: true };
}

async function getUserOrders(userId) {
  return Order.find({ user: userId }).sort({ createdAt: -1 });
}

// Returns 404 (not 403) for other people's orders so IDs can't be probed.
async function getOrderForUser(userId, orderId, isAdmin = false) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw httpError(404, 'Order not found.');
  }

  const filter = isAdmin ? { _id: orderId } : { _id: orderId, user: userId };
  const order = await Order.findOne(filter);

  if (!order) {
    throw httpError(404, 'Order not found.');
  }

  return order;
}

const { ORDER_STATUSES } = require('../models/order');

// Orders move forward one step at a time. Cancelling is a separate action.
const NEXT_STATUS = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

const CANCELLABLE_STATUSES = ['pending', 'processing'];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Admin: paginated list with optional status filter and search.
async function listOrders({ status, search, page = 1, limit = 20 }) {
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const filter = {};

  if (status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw httpError(400, 'Invalid status filter.');
    }
    filter.orderStatus = status;
  }

  if (typeof search === 'string' && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim().slice(0, 50)), 'i');
    filter.$or = [
      { orderNumber: pattern },
      { 'shippingAddress.fullName': pattern },
      { 'shippingAddress.phone': pattern },
    ];
  }

  const [orders, total, statusCounts] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate('user', 'name firstName lastName email'),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(statusCounts.map((row) => [row._id, row.count]));

  return {
    orders,
    total,
    page: pageNumber,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
    counts,
  };
}

// Admin: any order, with customer details.
async function getOrderForAdmin(orderId) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw httpError(404, 'Order not found.');
  }

  const order = await Order.findById(orderId).populate(
    'user',
    'name firstName lastName email'
  );

  if (!order) throw httpError(404, 'Order not found.');
  return order;
}

// Admin: move an order to its next status.
async function updateOrderStatus({ orderId, status, adminId }) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw httpError(404, 'Order not found.');
  }

  const order = await Order.findById(orderId);
  if (!order) throw httpError(404, 'Order not found.');

  if (NEXT_STATUS[order.orderStatus] !== status) {
    throw httpError(
      409,
      `An order that is ${order.orderStatus} cannot be moved to ${status}.`
    );
  }

  if (
  order.paymentMethod === 'mpesa' &&
  order.paymentStatus !== 'paid' &&
  status === 'processing'
) {
  throw httpError(409, 'This M-Pesa order has not been paid yet.');
}

  const set = { orderStatus: status };

  // Cash on delivery is paid when the cash is handed over.
  if (status === 'delivered' && order.paymentMethod === 'cash_on_delivery') {
    set.paymentStatus = 'paid';
  }

  // The orderStatus condition stops two admins from both applying the same change.
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, orderStatus: order.orderStatus },
    {
      $set: set,
      $push: { statusHistory: { status, changedAt: new Date(), changedBy: adminId } },
    },
    { new: true }
  );

  if (!updated) {
    throw httpError(409, 'This order was just changed by someone else. Refresh and try again.');
  }

  return updated;
}

// Admin: cancel an order that has not shipped and put its stock back.
async function cancelOrder({ orderId, adminId }) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw httpError(404, 'Order not found.');
  }

  const cancelled = await Order.findOneAndUpdate(
    { _id: orderId, orderStatus: { $in: CANCELLABLE_STATUSES } },
    {
      $set: { orderStatus: 'cancelled', cancelledAt: new Date() },
      $push: {
        statusHistory: { status: 'cancelled', changedAt: new Date(), changedBy: adminId },
      },
    },
    { new: true }
  );

  if (!cancelled) {
    const exists = await Order.exists({ _id: orderId });
    if (!exists) throw httpError(404, 'Order not found.');
    throw httpError(409, 'Only pending or processing orders can be cancelled.');
  }

  try {
    await releaseStock(cancelled.items);

    if (cancelled.paymentStatus === 'paid') {
      await Order.updateOne({ _id: orderId }, { $set: { paymentStatus: 'refunded' } });
      cancelled.paymentStatus = 'refunded';
    }
  } catch (error) {
    // The order is already cancelled. Log it so stock can be corrected by hand.
    console.error(`Order ${cancelled.orderNumber} cancelled but stock restore failed:`, error);
  }

  return cancelled;
}

module.exports = {
  createOrder,
  getUserOrders,
  getOrderForUser,
  listOrders,
  getOrderForAdmin,
  updateOrderStatus,
  cancelOrder,
  normaliseKenyanPhone,
};