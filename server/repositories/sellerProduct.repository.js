const prisma = require('../config/prisma');

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  categories: { select: { id: true, name: true, slug: true } },
  stockMovements: {
    take: 100,
    orderBy: { createdAt: 'desc' },
    select: { id: true, type: true, quantityDelta: true, note: true, createdAt: true },
  },
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

const create = (data) => prisma.product.create({ data, include: PRODUCT_INCLUDE });

// Call only after findOwned succeeded. sellerId is never writable, so
// ownership cannot change between the check and this update.
const update = (id, data) =>
  prisma.product.update({ where: { id }, data, include: PRODUCT_INCLUDE });

const updateWithStockMovement = ({ id, data, expectedStock, actorId }) =>
  prisma.$transaction(async (tx) => {
    const { categories, ...scalarData } = data;
    const result = await tx.product.updateMany({ where: { id, stock: expectedStock }, data: scalarData });
    if (result.count !== 1) return null;
    if (scalarData.stock !== expectedStock) {
      await tx.stockMovement.create({
        data: {
          productId: id,
          type: 'adjustment',
          quantityDelta: scalarData.stock - expectedStock,
          actorId,
          note: 'Seller inventory adjustment',
        },
      });
    }
    return tx.product.update({ where: { id }, data: categories ? { categories } : {}, include: PRODUCT_INCLUDE });
  });

const countActiveCategories = (ids) =>
  prisma.category.count({ where: { id: { in: ids }, isActive: true, approvalStatus: 'approved' } });

module.exports = {
  listBySeller,
  findOwned,
  create,
  update,
  updateWithStockMovement,
  countActiveCategories,
};
