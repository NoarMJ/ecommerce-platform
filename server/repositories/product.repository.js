
const prisma = require('../config/prisma');
const {
  withPublicVisibility,
  SELLER_BADGE_INCLUDE,
} = require('../utils/sellerVisibility');

const categorySummary = {
  select: { id: true, name: true, slug: true },
};

const includeCategories = {
  category: categorySummary,
  categories: categorySummary,
};

// Public product responses also include the approved-seller information
// needed to construct the public seller badge.
const publicInclude = {
  ...includeCategories,
  ...SELLER_BADGE_INCLUDE,
};

const buildListWhere = ({
  isActive,
  search,
  searchSku = false,
  categorySlugs = [],
  onlyActiveCategories = false,
  publicOnly = false,
}) => {
  const and = [];

  if (isActive !== undefined) {
    and.push({ isActive });
  }

  if (search) {
    const nameMatch = {
      name: { contains: search, mode: 'insensitive' },
    };

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
      ...(onlyActiveCategories ? { isActive: true, approvalStatus: 'approved' } : {}),
    };

    and.push({
      OR: [
        { category: categoryMatch },
        { categories: { some: categoryMatch } },
      ],
    });
  }

  const where = and.length > 0 ? { AND: and } : {};

  // Buyers only see platform products and products of approved sellers.
  if (!publicOnly) return where;
  const categoryVisibility = {
    category: { approvalStatus: 'approved', isActive: true },
  };
  return withPublicVisibility({
    AND: [
      ...(where.AND || []),
      categoryVisibility,
    ],
  });
};

const findPage = async ({
  page,
  limit,
  publicOnly = false,
  ...filters
}) => {
  const where = buildListWhere({
    ...filters,
    publicOnly,
  });

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: publicOnly ? publicInclude : includeCategories,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { total, products };
};

// Existing repository method: used by admin and other internal operations.
const findById = (id) =>
  prisma.product.findUnique({
    where: { id },
    include: includeCategories,
  });

// Public product detail: only active products from platform or approved sellers.
const findActiveById = (id) =>
  prisma.product.findFirst({
    where: withPublicVisibility({
      id,
      isActive: true,
      category: { approvalStatus: 'approved', isActive: true },
    }),
    include: publicInclude,
  });

const findActiveBySlug = (slug) =>
  prisma.product.findFirst({
    where: withPublicVisibility({
      slug,
      isActive: true,
      category: { approvalStatus: 'approved', isActive: true },
    }),
    include: publicInclude,
  });

const existsActiveInCategory = async (categoryId) => {
  const count = await prisma.product.count({
    where: {
      categoryId,
      isActive: true,
    },
  });

  return count > 0;
};

// categoryIds[0] is the primary category; the whole list is linked as categories.
const create = ({ categoryIds, ...data }) =>
  prisma.product.create({
    data: {
      ...data,
      categoryId: categoryIds[0],
      categories: {
        connect: categoryIds.map((id) => ({ id })),
      },
    },
    include: includeCategories,
  });

// If categoryIds is given, the product's category list is replaced with it.
const update = (id, { categoryIds, ...data }) =>
  prisma.product.update({
    where: { id },
    data: {
      ...data,
      ...(categoryIds
        ? {
            categories: {
              set: categoryIds.map((categoryId) => ({ id: categoryId })),
            },
          }
        : {}),
    },
    include: includeCategories,
  });

// Existing method retained for callers that only need product records.
const findByIds = (ids) =>
  prisma.product.findMany({
    where: { id: { in: ids } },
  });

// Checkout needs seller details to validate seller approval and create
// seller snapshots on order items.
const findByIdsWithSeller = (ids) =>
  prisma.product.findMany({
    where: {
      id: { in: ids },
    },
    include: {
      seller: {
        select: {
          id: true,
          shopName: true,
          status: true,
        },
      },
    },
  });

module.exports = {
  buildListWhere,
  findPage,
  findById,
  findActiveById,
  findActiveBySlug,
  existsActiveInCategory,
  create,
  update,
  findByIds,
  findByIdsWithSeller,
};
