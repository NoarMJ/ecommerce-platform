const prisma = require('../config/prisma');

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

// categoryIds[0] is the primary category; the whole list is linked as categories
const create = ({ categoryIds, ...data }) =>
  prisma.product.create({
    data: {
      ...data,
      categoryId: categoryIds[0],
      categories: { connect: categoryIds.map((id) => ({ id })) },
    },
    include: includeCategories,
  });

// If categoryIds is given, the product's category list is replaced with it
const update = (id, { categoryIds, ...data }) =>
  prisma.product.update({
    where: { id },
    data: {
      ...data,
      ...(categoryIds
        ? { categories: { set: categoryIds.map((categoryId) => ({ id: categoryId })) } }
        : {}),
    },
    include: includeCategories,
  });

  const findByIds = (ids) =>
  prisma.product.findMany({ where: { id: { in: ids } } });

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