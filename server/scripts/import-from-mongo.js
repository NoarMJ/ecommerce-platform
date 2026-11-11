require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');

const User = require('../models/user');
const Category = require('../models/category');
const Product = require('../models/product');
const Cart = require('../models/cart');
const Order = require('../models/order');
const Payment = require('../models/payment');

const DRY_RUN = process.argv.includes('--dry-run');
const WIPE = process.argv.includes('--wipe');

const MAX_INT = 2147483647;
const BATCH_SIZE = 500;
const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const ROLES = ['customer', 'admin'];
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const ORDER_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const PAYMENT_METHODS = ['cash_on_delivery', 'mpesa'];
const PAYMENT_STATUSES = ['initiated', 'succeeded', 'failed', 'cancelled', 'needs_review'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const problems = [];
const problem = (message) => problems.push(message);

const newId = () => crypto.randomUUID();
const idOf = (value) => (value ? String(value) : null);
const isCount = (value) =>
  Number.isInteger(value) && value >= 0 && value <= MAX_INT;
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const orNull = (value) => (value === undefined ? null : value);

// Turns Mongo-specific values (ObjectId, Date) into plain JSON
const toJson = (value) =>
  value === undefined || value === null
    ? undefined
    : JSON.parse(JSON.stringify(value));

const chunk = (list, size = BATCH_SIZE) => {
  const parts = [];
  for (let i = 0; i < list.length; i += size) {
    parts.push(list.slice(i, i + size));
  }
  return parts;
};

const insertAll = async (label, rows, insert) => {
  for (const part of chunk(rows)) {
    await insert(part);
  }
  console.log(`  ${label}: ${rows.length}`);
};

// ---------------------------------------------------------------------------
// Step 1: turn Mongo documents into Postgres rows (no database writes)
// ---------------------------------------------------------------------------

const buildCategories = (docs) => {
  const ids = new Map();

  const rows = docs.map((doc) => {
    const label = `Category ${doc.slug || doc._id}`;

    if (!isText(doc.name) || doc.name.length > 100) {
      problem(`${label}: name is missing or longer than 100 characters`);
    }
    if (!isText(doc.slug)) problem(`${label}: slug is missing`);

    const id = newId();
    ids.set(idOf(doc._id), id);

    return {
      id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description || '',
      image: doc.image || '',
      isActive: doc.isActive !== false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });

  return { rows, ids };
};

const buildUsers = (docs) => {
  const ids = new Map();
  const emails = new Set();

  const rows = docs.map((doc) => {
    const label = `User ${doc.email || doc._id}`;

    if (!isText(doc.email)) problem(`${label}: email is missing`);
    if (!isText(doc.password)) problem(`${label}: password hash is missing`);
    if (!ROLES.includes(doc.role)) problem(`${label}: unknown role "${doc.role}"`);
    if (!isText(doc.firstName) || doc.firstName.length > 50) {
      problem(`${label}: first name is missing or longer than 50 characters`);
    }
    if (!isText(doc.lastName) || doc.lastName.length > 50) {
      problem(`${label}: last name is missing or longer than 50 characters`);
    }

    const email = String(doc.email || '').trim().toLowerCase();
    if (emails.has(email)) problem(`${label}: duplicate email`);
    emails.add(email);

    const id = newId();
    ids.set(idOf(doc._id), id);

    return {
      id,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email,
      passwordHash: doc.password,
      phoneNumber: doc.phoneNumber || '',
      role: doc.role,
      permissions: Array.isArray(doc.permissions) ? doc.permissions : [],
      isPrimaryAdmin: Boolean(doc.isPrimaryAdmin),
      isActive: doc.isActive !== false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });

  return { rows, ids };
};

const buildProducts = (docs, categoryIds) => {
  const ids = new Map();

  const rows = docs.map((doc) => {
    const label = `Product ${doc.sku || doc._id}`;

    if (!isText(doc.name) || doc.name.length > 150) {
      problem(`${label}: name is missing or longer than 150 characters`);
    }
    if (!isText(doc.slug)) problem(`${label}: slug is missing`);
    if (!isText(doc.sku)) problem(`${label}: sku is missing`);
    if (!isText(doc.description)) problem(`${label}: description is missing`);
    if (!isCount(doc.priceMinor)) problem(`${label}: price is not a valid whole number`);
    if (!isCount(doc.stock)) problem(`${label}: stock is not a valid whole number`);

    const primaryId = categoryIds.get(idOf(doc.category));
    if (!primaryId) problem(`${label}: primary category not found`);

    // The primary category is also part of the extra categories list
    const extraIds = new Set(primaryId ? [primaryId] : []);
    for (const category of doc.categories || []) {
      const mapped = categoryIds.get(idOf(category));
      if (mapped) extraIds.add(mapped);
      else problem(`${label}: category ${idOf(category)} not found`);
    }

    const id = newId();
    ids.set(idOf(doc._id), id);

    return {
      id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      priceMinor: doc.priceMinor,
      images: Array.isArray(doc.images) ? doc.images : [],
      stock: doc.stock,
      sku: doc.sku,
      isActive: doc.isActive !== false,
      categoryId: primaryId,
      categoryIds: [...extraIds],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });

  return { rows, ids };
};

const buildCarts = (docs, userIds, productIds) => {
  const now = new Date();
  const cartRows = [];
  const itemRows = [];
  let skippedExpired = 0;

  for (const doc of docs) {
    const label = `Cart ${doc._id}`;
    const hasUser = Boolean(doc.user);
    const hasGuest = Boolean(doc.guestTokenHash);

    if (hasUser === hasGuest) {
      problem(`${label}: must belong to exactly one of a user or a guest`);
      continue;
    }

    // Expired guest carts would be cleaned up anyway
    if (hasGuest && doc.expiresAt && doc.expiresAt < now) {
      skippedExpired += 1;
      continue;
    }

    let userId = null;
    if (hasUser) {
      userId = userIds.get(idOf(doc.user));
      if (!userId) {
        problem(`${label}: user not found`);
        continue;
      }
    }

    const id = newId();

    cartRows.push({
      id,
      userId,
      guestTokenHash: hasGuest ? doc.guestTokenHash : null,
      expiresAt: hasGuest
        ? doc.expiresAt || new Date(Date.now() + GUEST_CART_TTL_MS)
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });

    // Merge duplicate lines for the same product
    const quantities = new Map();
    for (const item of doc.items || []) {
      const productId = productIds.get(idOf(item.product));
      if (!productId) {
        problem(`${label}: product ${idOf(item.product)} not found`);
        continue;
      }
      if (!isCount(item.quantity) || item.quantity < 1) {
        problem(`${label}: invalid quantity`);
        continue;
      }
      quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
    }

    // Items keep their original order through createdAt
    const base = doc.createdAt ? doc.createdAt.getTime() : Date.now();
    let index = 0;
    for (const [productId, quantity] of quantities) {
      itemRows.push({
        cartId: id,
        productId,
        quantity,
        createdAt: new Date(base + index),
      });
      index += 1;
    }
  }

  return { cartRows, itemRows, skippedExpired };
};

const buildOrders = (docs, userIds, productIds) => {
  const ids = new Map();
  const orderRows = [];
  const itemRows = [];
  const historyRows = [];

  for (const doc of docs) {
    const label = `Order ${doc.orderNumber || doc._id}`;
    const userId = userIds.get(idOf(doc.user));
    if (!userId) problem(`${label}: user not found`);

    if (!isText(doc.orderNumber)) problem(`${label}: order number is missing`);
    if (!isText(doc.idempotencyKey)) problem(`${label}: idempotency key is missing`);
    if (!ORDER_STATUSES.includes(doc.orderStatus)) {
      problem(`${label}: unknown order status "${doc.orderStatus}"`);
    }
    if (!ORDER_PAYMENT_STATUSES.includes(doc.paymentStatus)) {
      problem(`${label}: unknown payment status "${doc.paymentStatus}"`);
    }
    if (!PAYMENT_METHODS.includes(doc.paymentMethod)) {
      problem(`${label}: unknown payment method "${doc.paymentMethod}"`);
    }
    for (const field of ['subtotalMinor', 'shippingFeeMinor', 'totalMinor']) {
      if (!isCount(doc[field] ?? 0)) problem(`${label}: ${field} is not valid`);
    }
    if (doc.customerNote && doc.customerNote.length > 500) {
      problem(`${label}: customer note is longer than 500 characters`);
    }

    const address = doc.shippingAddress || {};
    for (const field of ['fullName', 'phone', 'addressLine1', 'city', 'county']) {
      if (!isText(address[field])) problem(`${label}: shipping ${field} is missing`);
    }

    const id = newId();
    ids.set(idOf(doc._id), id);

    orderRows.push({
      id,
      orderNumber: doc.orderNumber,
      idempotencyKey: doc.idempotencyKey,
      userId,
      shipFullName: address.fullName,
      shipPhone: address.phone,
      shipAddressLine1: address.addressLine1,
      shipAddressLine2: orNull(address.addressLine2),
      shipCity: address.city,
      shipCounty: address.county,
      shipPostalCode: orNull(address.postalCode),
      customerNote: orNull(doc.customerNote),
      paymentMethod: doc.paymentMethod,
      paymentStatus: doc.paymentStatus,
      orderStatus: doc.orderStatus,
      subtotalMinor: doc.subtotalMinor ?? 0,
      shippingFeeMinor: doc.shippingFeeMinor ?? 0,
      totalMinor: doc.totalMinor ?? 0,
      cancelledAt: orNull(doc.cancelledAt),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });

    (doc.items || []).forEach((item, index) => {
      const productId = productIds.get(idOf(item.product));
      if (!productId) problem(`${label}: product ${idOf(item.product)} not found`);
      if (!isText(item.name)) problem(`${label}: an item has no name`);
      if (!isCount(item.quantity) || item.quantity < 1) {
        problem(`${label}: an item has an invalid quantity`);
      }
      if (!isCount(item.unitPriceMinor) || !isCount(item.lineTotalMinor)) {
        problem(`${label}: an item has an invalid price`);
      }

      itemRows.push({
        orderId: id,
        productId,
        name: item.name,
        sku: orNull(item.sku),
        image: orNull(item.image),
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor: item.lineTotalMinor,
        position: index,
      });
    });

    for (const entry of doc.statusHistory || []) {
      if (!ORDER_STATUSES.includes(entry.status)) {
        problem(`${label}: unknown status "${entry.status}" in history`);
      }

      historyRows.push({
        orderId: id,
        status: entry.status,
        changedAt: entry.changedAt || doc.createdAt,
        changedById: userIds.get(idOf(entry.changedBy)) || null,
      });
    }
  }

  return { ids, orderRows, itemRows, historyRows };
};

const buildPayments = (docs, userIds, orderIds) => {
  const receipts = new Set();

  return docs.map((doc) => {
    const label = `Payment ${doc._id}`;
    const orderId = orderIds.get(idOf(doc.order));
    const userId = userIds.get(idOf(doc.user));

    if (!orderId) problem(`${label}: order not found`);
    if (!userId) problem(`${label}: user not found`);

    const method = doc.method || 'mpesa';
    if (!PAYMENT_METHODS.includes(method)) problem(`${label}: unknown method "${method}"`);
    if (!PAYMENT_STATUSES.includes(doc.status)) problem(`${label}: unknown status "${doc.status}"`);
    if (!isText(doc.phone)) problem(`${label}: phone is missing`);
    if (!isCount(doc.amountMinor)) problem(`${label}: amount is not valid`);

    if (doc.mpesaReceiptNumber) {
      if (receipts.has(doc.mpesaReceiptNumber)) {
        problem(`${label}: duplicate receipt ${doc.mpesaReceiptNumber}`);
      }
      receipts.add(doc.mpesaReceiptNumber);
    }

    return {
      id: newId(),
      orderId,
      userId,
      method,
      phone: doc.phone,
      amountMinor: doc.amountMinor,
      status: doc.status,
      merchantRequestId: orNull(doc.merchantRequestId),
      checkoutRequestId: orNull(doc.checkoutRequestId),
      mpesaReceiptNumber: orNull(doc.mpesaReceiptNumber),
      resultCode: Number.isInteger(doc.resultCode) ? doc.resultCode : null,
      resultDesc: orNull(doc.resultDesc),
      rawCallback: toJson(doc.rawCallback),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  for (const name of ['MONGODB_URI', 'DIRECT_URL']) {
    if (!process.env[name]) {
      console.error(`${name} is missing from .env`);
      process.exit(1);
    }
  }

  let host = 'unknown';
  try {
    host = new URL(process.env.DIRECT_URL).host;
  } catch (error) {
    // keep "unknown"
  }

  console.log(`Target Postgres host: ${host}`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (nothing will be written)' : 'Mode: REAL IMPORT');

  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Reading from MongoDB...');
  const [userDocs, categoryDocs, productDocs, cartDocs, orderDocs, paymentDocs] =
    await Promise.all([
      User.find().select('+password').lean(),
      Category.find().lean(),
      Product.find().lean(),
      Cart.find().lean(),
      Order.find().sort({ createdAt: 1 }).lean(),
      Payment.find().sort({ createdAt: 1 }).lean(),
    ]);

  const categories = buildCategories(categoryDocs);
  const users = buildUsers(userDocs);
  const products = buildProducts(productDocs, categories.ids);
  const carts = buildCarts(cartDocs, users.ids, products.ids);
  const orders = buildOrders(orderDocs, users.ids, products.ids);
  const paymentRows = buildPayments(paymentDocs, users.ids, orders.ids);

  if (problems.length > 0) {
    console.error(`\nFound ${problems.length} problem(s) in the data. Nothing was imported:`);
    problems.slice(0, 50).forEach((message) => console.error(` - ${message}`));
    if (problems.length > 50) console.error(` ...and ${problems.length - 50} more`);
    process.exit(1);
  }

  console.log('\nReady to import:');
  console.log(`  categories: ${categories.rows.length}`);
  console.log(`  users: ${users.rows.length}`);
  console.log(`  products: ${products.rows.length}`);
  console.log(`  carts: ${carts.cartRows.length} (${carts.skippedExpired} expired guest carts skipped)`);
  console.log(`  cart items: ${carts.itemRows.length}`);
  console.log(`  orders: ${orders.orderRows.length}`);
  console.log(`  order items: ${orders.itemRows.length}`);
  console.log(`  order status history: ${orders.historyRows.length}`);
  console.log(`  payments: ${paymentRows.length}`);

  if (DRY_RUN) {
    console.log('\nDry run complete. Nothing was written.');
    return;
  }

  // Bulk inserts use the direct connection, not the pooler
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

  try {
    const existing =
      (await prisma.user.count()) +
      (await prisma.category.count()) +
      (await prisma.product.count()) +
      (await prisma.order.count());

    if (existing > 0 && !WIPE) {
      console.error('\nThe Postgres tables are not empty. Run again with --wipe to empty them first.');
      process.exit(1);
    }

    if (WIPE) {
      if (process.env.NODE_ENV === 'production') {
        console.error('\nRefusing to wipe while NODE_ENV is "production".');
        process.exit(1);
      }

      console.log('\nWiping Postgres tables...');
      await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "payments", "order_status_history", "order_items", "orders", ' +
          '"cart_items", "carts", "_ExtraCategories", "products", "categories", "users" CASCADE'
      );
    }

    console.log('\nImporting...');

    await insertAll('categories', categories.rows, (data) =>
      prisma.category.createMany({ data })
    );

    await insertAll('users', users.rows, (data) => prisma.user.createMany({ data }));

    // Products are created in small groups so each can link its extra categories
    let productCount = 0;
    for (const group of chunk(products.rows, 25)) {
      await Promise.all(
        group.map(({ categoryIds, ...data }) =>
          prisma.product.create({
            data: {
              ...data,
              categories: { connect: categoryIds.map((id) => ({ id })) },
            },
          })
        )
      );
      productCount += group.length;
    }
    console.log(`  products: ${productCount}`);

    await insertAll('carts', carts.cartRows, (data) => prisma.cart.createMany({ data }));
    await insertAll('cart items', carts.itemRows, (data) =>
      prisma.cartItem.createMany({ data })
    );

    await insertAll('orders', orders.orderRows, (data) => prisma.order.createMany({ data }));
    await insertAll('order items', orders.itemRows, (data) =>
      prisma.orderItem.createMany({ data })
    );
    await insertAll('order status history', orders.historyRows, (data) =>
      prisma.orderStatusHistory.createMany({ data })
    );

    await insertAll('payments', paymentRows, (data) => prisma.payment.createMany({ data }));

    // -----------------------------------------------------------------------
    // Check the result
    // -----------------------------------------------------------------------
    const [orderSum, stockSum] = await Promise.all([
      prisma.order.aggregate({ _sum: { totalMinor: true } }),
      prisma.product.aggregate({ _sum: { stock: true } }),
    ]);

    const mongoOrderSum = orderDocs.reduce((sum, doc) => sum + (doc.totalMinor || 0), 0);
    const mongoStockSum = productDocs.reduce((sum, doc) => sum + (doc.stock || 0), 0);

    console.log('\nCheck (these pairs should match):');
    console.table([
      { what: 'categories', mongo: categoryDocs.length, postgres: await prisma.category.count() },
      { what: 'users', mongo: userDocs.length, postgres: await prisma.user.count() },
      { what: 'products', mongo: productDocs.length, postgres: await prisma.product.count() },
      { what: 'carts (without expired)', mongo: carts.cartRows.length, postgres: await prisma.cart.count() },
      { what: 'orders', mongo: orderDocs.length, postgres: await prisma.order.count() },
      { what: 'payments', mongo: paymentDocs.length, postgres: await prisma.payment.count() },
      { what: 'total of all orders (minor units)', mongo: mongoOrderSum, postgres: orderSum._sum.totalMinor || 0 },
      { what: 'total stock', mongo: mongoStockSum, postgres: stockSum._sum.stock || 0 },
    ]);

    console.log('\nDone. MongoDB was only read, never changed.');
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('\nImport failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());