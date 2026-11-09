const productRepository = require('../repositories/product.repository');
const categoryRepository = require('../repositories/category.repository');
const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/ids');

const MAX_INT = 2147483647; // largest value a Postgres Int can hold

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cleanText = (value) =>
  typeof value === 'string' ? value.trim() : undefined;

const assertProductId = (id) => {
  if (!isUuid(id)) throw new AppError('Invalid product ID.', 400);
};

const parsePaging = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requested = Number.parseInt(query.limit, 10) || 10;
  const limit = Math.min(50, Math.max(1, requested));
  return { page, limit };
};

const buildPagination = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

// Supports ?category=gaming, ?categories=gaming,electronics
// and ?categories=gaming&categories=electronics
const parseCategorySlugs = (query) => {
  const raw = [query.category, query.categories]
    .flat()
    .filter((value) => value !== undefined);

  return [
    ...new Set(
      raw
        .flatMap((value) => String(value).split(','))
        .map((slug) => slug.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
};

// Combine the primary category and the categories list into one list of
// unique, valid IDs. The primary category (if given) is always first.
const collectCategoryIds = (category, categories) => {
  const ids = [];

  if (category !== undefined && category !== null && category !== '') {
    ids.push(category);
  }

  if (categories !== undefined) {
    if (!Array.isArray(categories)) {
      throw new AppError('categories must be an array of category IDs.', 400);
    }
    ids.push(...categories);
  }

  const normalized = [];
  for (const id of ids) {
    if (!isUuid(id)) throw new AppError('Invalid category ID.', 400);
    normalized.push(id.toLowerCase());
  }

  return [...new Set(normalized)];
};

const assertCategoriesActive = async (ids) => {
  const count = await categoryRepository.countActiveByIds(ids);
  if (count !== ids.length) {
    throw new AppError(
      'One or more selected categories do not exist or are inactive.',
      400
    );
  }
};

const assertWholeNumber = (value, label) => {
  if (!Number.isInteger(value) || value < 0 || value > MAX_INT) {
    throw new AppError(
      `${label} must be a whole number between 0 and ${MAX_INT}.`,
      400
    );
  }
};

const assertImages = (images) => {
  if (!Array.isArray(images) || images.some((item) => typeof item !== 'string')) {
    throw new AppError('Images must be an array of text values.', 400);
  }
};

// Turn Prisma's database errors into errors our API understands
const translateDbError = (error) => {
  if (error.code === 'P2002') {
    throw new AppError('A product with this slug or SKU already exists.', 409);
  }
  if (error.code === 'P2025') {
    throw new AppError('Product not found.', 404);
  }
  throw error;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const getPublicProducts = async (query) => {
  const { page, limit } = parsePaging(query);

  const { total, products } = await productRepository.findPage({
    page,
    limit,
    isActive: true,
    search: cleanText(query.search),
    categorySlugs: parseCategorySlugs(query),
    onlyActiveCategories: true,
  });

  return { products, pagination: buildPagination({ page, limit, total }) };
};

const getAdminProducts = async (query) => {
  const { page, limit } = parsePaging(query);

  const status = query.status || 'active';
  if (!['active', 'inactive', 'all'].includes(status)) {
    throw new AppError('Status must be active, inactive, or all.', 400);
  }

  const { total, products } = await productRepository.findPage({
    page,
    limit,
    isActive: status === 'all' ? undefined : status === 'active',
    search: cleanText(query.search),
    searchSku: true,
    categorySlugs: parseCategorySlugs(query),
  });

  return { products, pagination: buildPagination({ page, limit, total }) };
};

const getProductById = async (id) => {
  assertProductId(id);

  const product = await productRepository.findActiveById(id);
  if (!product) throw new AppError('Product not found.', 404);

  return product;
};

const getProductBySlug = async (slug) => {
  const product = await productRepository.findActiveBySlug(
    String(slug).toLowerCase()
  );
  if (!product) throw new AppError('Product not found.', 404);

  return product;
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

const createProduct = async (body = {}) => {
  const { name, slug, description, category, categories, priceMinor, images, stock, sku } = body;

  const categoryIds = collectCategoryIds(category, categories);

  const cleanName = cleanText(name);
  const cleanSlug = cleanText(slug)?.toLowerCase();
  const cleanDescription = cleanText(description);
  const cleanSku = cleanText(sku)?.toUpperCase();

  if (
    !cleanName ||
    !cleanSlug ||
    !cleanDescription ||
    categoryIds.length === 0 ||
    priceMinor === undefined ||
    !cleanSku
  ) {
    throw new AppError('Please provide all required product fields.', 400);
  }

  if (cleanName.length > 150) {
    throw new AppError('Product name cannot exceed 150 characters.', 400);
  }

  assertWholeNumber(priceMinor, 'Product price');

  const finalStock = stock ?? 0;
  assertWholeNumber(finalStock, 'Stock');

  const finalImages = images ?? [];
  assertImages(finalImages);

  await assertCategoriesActive(categoryIds);

  try {
    return await productRepository.create({
      name: cleanName,
      slug: cleanSlug,
      description: cleanDescription,
      priceMinor,
      images: finalImages,
      stock: finalStock,
      sku: cleanSku,
      categoryIds,
    });
  } catch (error) {
    return translateDbError(error);
  }
};

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'slug',
  'description',
  'category',
  'categories',
  'priceMinor',
  'images',
  'stock',
  'sku',
];

const updateProduct = async (id, body = {}) => {
  assertProductId(id);

  const updates = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (Object.hasOwn(body, field)) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('Provide at least one valid field to update.', 400);
  }

  const data = {};

  for (const field of ['name', 'slug', 'description', 'sku']) {
    if (updates[field] !== undefined) {
      const value = cleanText(updates[field]);
      if (!value) throw new AppError(`Product ${field} cannot be empty.`, 400);

      if (field === 'slug') data.slug = value.toLowerCase();
      else if (field === 'sku') data.sku = value.toUpperCase();
      else data[field] = value;
    }
  }

  if (data.name && data.name.length > 150) {
    throw new AppError('Product name cannot exceed 150 characters.', 400);
  }

  if (updates.priceMinor !== undefined) {
    assertWholeNumber(updates.priceMinor, 'Product price');
    data.priceMinor = updates.priceMinor;
  }

  if (updates.stock !== undefined) {
    assertWholeNumber(updates.stock, 'Stock');
    data.stock = updates.stock;
  }

  if (updates.images !== undefined) {
    assertImages(updates.images);
    data.images = updates.images;
  }

  // Category changes
  const hasCategory = updates.category !== undefined;
  const hasCategories = updates.categories !== undefined;

  if (hasCategory || hasCategories) {
    const ids = collectCategoryIds(updates.category, updates.categories);

    if (ids.length === 0) {
      throw new AppError('A product must have at least one category.', 400);
    }

    await assertCategoriesActive(ids);

    const existing = await productRepository.findById(id);
    if (!existing) throw new AppError('Product not found.', 404);

    if (hasCategories) {
      // Replace the full list. Keep the current primary if it is still in it.
      data.categoryIds = ids;
      data.categoryId = hasCategory
        ? ids[0]
        : ids.includes(existing.categoryId)
        ? existing.categoryId
        : ids[0];
    } else {
      // Only the primary changed: keep the current list and add the new primary
      const existingIds = existing.categories.map((item) => item.id);
      data.categoryId = ids[0];
      data.categoryIds = [...new Set([...existingIds, ids[0]])];
    }
  }

  try {
    return await productRepository.update(id, data);
  } catch (error) {
    return translateDbError(error);
  }
};

// "Delete" only deactivates the product
const deactivateProduct = async (id) => {
  assertProductId(id);

  try {
    return await productRepository.update(id, { isActive: false });
  } catch (error) {
    return translateDbError(error);
  }
};

module.exports = {
  getPublicProducts,
  getAdminProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deactivateProduct,
};