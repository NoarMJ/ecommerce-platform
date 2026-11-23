const prisma = require('../config/prisma');
const TX_OPTIONS = require('../utils/transactionOptions');

const categorySummary = { select: { id: true, name: true, slug: true } };

const includeCategories = {
  category: categorySummary,
  categories: categorySummary,
};

const buildListWhere = ({
  isActive,
  search,
  searchSku = false,
  categorySlugs = [],
  onlyActiveCategories = false,
}) => {
  const and = [];

  if (isActive !== undefined) {
    and.push({ isActive });
  }

  if (search) {
    const nameMatch = { name: { contains: search, mode: 'insensitive' } };

    and.push(
      searchSku
        ? {
            OR: [
              nameMatch,
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : nameMatch
    );
  }

  if (categorySlugs.length > 0) {
    const categoryMatch = {
      slug: { in: categorySlugs },
      ...(onlyActiveCategories ? { isActive: true } : {}),
    };

    and.push({
      OR: [{ category: categoryMatch }, { categories: { some: categoryMatch } }],
    });
  }

  return and.length > 0 ? { AND: and } : {};
};

const findPage = async ({ page, limit, ...filters }) => {
  const where = buildListWhere(filters);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: includeCategories,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { total, products };
};

const findById = (id) =>
  prisma.product.findUnique({
    where: { id },
    include: includeCategories,
  });

const findActiveById = (id) =>
  prisma.product.findFirst({
    where: { id, isActive: true },
    include: includeCategories,
  });

const findActiveBySlug = (slug) =>
  prisma.product.findFirst({
    where: { slug, isActive: true },
    include: includeCategories,
  });

const existsActiveInCategory = async (categoryId) => {
  const count = await prisma.product.count({
    where: { categoryId, isActive: true },
  });
  return count > 0;
};

// categoryIds[0] is the primary category; the whole list is linked as categories.
// The starting stock is recorded in the stock history.
const create = ({ categoryIds, ...data }, actorId = null) =>
  prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...data,
        categoryId: categoryIds[0],
        categories: { connect: categoryIds.map((id) => ({ id })) },
      },
      include: includeCategories,
    });

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

// If categoryIds is given, the product's category list is replaced with it.
// Admins may still set stock directly; any change is recorded as a correction.
const update = (id, { categoryIds, ...data }, actorId = null) =>
  prisma.$transaction(async (tx) => {
    // Lock the row so a checkout can't change stock between this read and the update.
    const before =
      data.stock === undefined
        ? null
        : (await tx.$queryRaw`SELECT "stock" FROM "products" WHERE "id" = ${id}::uuid FOR UPDATE`)[0] ?? null;

    const product = await tx.product.update({
      where: { id },
      data: {
        ...data,
        ...(categoryIds
          ? { categories: { set: categoryIds.map((categoryId) => ({ id: categoryId })) } }
          : {}),
      },
      include: includeCategories,
    });

    if (before && before.stock !== product.stock) {
      await tx.inventoryMovement.create({
        data: {
          productId: id,
          sellerId: product.sellerId,
          type: 'correction',
          quantityChange: product.stock - before.stock,
          stockBefore: before.stock,
          stockAfter: product.stock,
          reason: 'Stock set by admin',
          createdById: actorId,
        },
      });
    }

    return product;
  }, TX_OPTIONS);

  const findByIds = (ids) =>
  prisma.product.findMany({
    where: { id: { in: ids } },
    include: { seller: { select: { shopName: true } } },
  });

module.exports = {
  findPage,
  findById,
  findActiveById,
  findActiveBySlug,
  existsActiveInCategory,
  create,
  update,
  findByIds,
};