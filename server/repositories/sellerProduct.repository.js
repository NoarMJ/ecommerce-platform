const prisma = require('../config/prisma');

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

const create = (data) => prisma.product.create({ data, include: PRODUCT_INCLUDE });

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
  countActiveCategories,
};
