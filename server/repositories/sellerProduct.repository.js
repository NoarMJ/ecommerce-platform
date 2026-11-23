const prisma = require('../config/prisma');
const TX_OPTIONS = require('../utils/transactionOptions');

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  categories: { select: { id: true, name: true, slug: true } },
};

// Every read/write below is scoped by sellerId, so a seller can never reach
// another seller's product, even if they guess its id.

const listBySeller = ({ sellerId, isActive, search, skip, take }) => {
  const where = { sellerId };

  if (typeof isActive === 'boolean') where.isActive = isActive;

  if (search) {
    const contains = { contains: search, mode: 'insensitive' };
    where.OR = [{ name: contains }, { sku: contains }];
  }

  return prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: PRODUCT_INCLUDE,
    }),
    prisma.product.count({ where }),
  ]);
};

const findOwned = (id, sellerId) =>
  prisma.product.findFirst({
    where: { id, sellerId },
    include: PRODUCT_INCLUDE,
  });

// Creates the product and records its starting stock in the history.
const create = (data, actorId) =>
  prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data, include: PRODUCT_INCLUDE });

    await tx.inventoryMovement.create({
      data: {
        productId: product.id,
        sellerId: product.sellerId,
        type: 'initial',
        quantityChange: product.stock,
        stockBefore: 0,
        stockAfter: product.stock,
        reason: 'Initial stock',
        createdById: actorId,
      },
    });

    return product;
  }, TX_OPTIONS);

// Changes stock by `change` (+ or -) in one atomic step, so units already
// taken by customer orders are never overwritten. Returns:
//   { product }                 on success
//   { notFound: true }          product isn't this seller's
//   { insufficient: true, stock } removing more than is in stock
//   { overLimit: true, stock }    adding past maxStock
const adjustStock = ({ productId, sellerId, change, type, reason, actorId, maxStock }) =>
  prisma.$transaction(async (tx) => {
    const where = { id: productId, sellerId };
    if (change < 0) where.stock = { gte: -change };
    else where.stock = { lte: maxStock - change };

    const result = await tx.product.updateMany({
      where,
      data: { stock: { increment: change } },
    });

    if (result.count !== 1) {
      const current = await tx.product.findFirst({
        where: { id: productId, sellerId },
        select: { stock: true },
      });
      if (!current) return { notFound: true };
      return change < 0
        ? { insufficient: true, stock: current.stock }
        : { overLimit: true, stock: current.stock };
    }

    // Row is locked by the update above, so this is the exact new value.
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: PRODUCT_INCLUDE,
    });

    await tx.inventoryMovement.create({
      data: {
        productId,
        sellerId,
        type,
        quantityChange: change,
        stockBefore: product.stock - change,
        stockAfter: product.stock,
        reason,
        createdById: actorId,
      },
    });

    return { product };
  }, TX_OPTIONS);

// Newest first. Only fields a seller needs: no customer or admin identities.
const listMovements = ({ productId, sellerId, skip, take }) => {
  const where = { productId, sellerId };

  return prisma.$transaction([
    prisma.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        type: true,
        quantityChange: true,
        stockBefore: true,
        stockAfter: true,
        reason: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);
};

// Call only after findOwned succeeded. sellerId is never writable, so
// ownership cannot change between the check and this update.
const update = (id, data) =>
  prisma.product.update({ where: { id }, data, include: PRODUCT_INCLUDE });

const countActiveCategories = (ids) =>
  prisma.category.count({ where: { id: { in: ids }, isActive: true } });

module.exports = {
  listBySeller,
  findOwned,
  create,
  update,
  adjustStock,
  listMovements,
  countActiveCategories,
};
