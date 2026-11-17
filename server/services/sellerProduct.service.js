const crypto = require('crypto');
const sellerProductRepository = require('../repositories/sellerProduct.repository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKU_PATTERN = /^[A-Za-z0-9._-]{3,64}$/;
const MAX_IMAGES = 8;
const MAX_EXTRA_CATEGORIES = 5;

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);

function validationError(details) {
  const error = new AppError('Validation failed.', 400);
  error.details = details;
  return error;
}

// A malformed or foreign id is simply "not found" (404, never 403).
function assertProductId(id) {
  if (!isUuid(id)) throw new AppError('Product not found.', 404);
}

function slugify(name) {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'product';

  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

function validateProduct(input, { withSku }) {
  const body = isObject(input) ? input : {};
  const data = {};
  const errors = {};

  const name = text(body.name);
  if (name.length < 2 || name.length > 150) {
    errors.name = 'Name must be 2-150 characters.';
  } else {
    data.name = name;
  }

  const description = text(body.description);
  if (description.length < 1 || description.length > 5000) {
    errors.description = 'Description must be 1-5000 characters.';
  } else {
    data.description = description;
  }

  if (
    !Number.isInteger(body.priceMinor) ||
    body.priceMinor < 1 ||
    body.priceMinor > 100000000
  ) {
    errors.priceMinor =
      'Price must be a whole number in minor units (for example cents), from 1 to 100000000.';
  } else {
    data.priceMinor = body.priceMinor;
  }

  if (
    !Number.isInteger(body.stock) ||
    body.stock < 0 ||
    body.stock > 1000000
  ) {
    errors.stock = 'Stock must be a whole number from 0 to 1000000.';
  } else {
    data.stock = body.stock;
  }

  const rawImages = body.images === undefined ? [] : body.images;
  if (
    !Array.isArray(rawImages) ||
    rawImages.length > MAX_IMAGES ||
    rawImages.some(
      (url) =>
        typeof url !== 'string' ||
        !/^https:\/\//i.test(url.trim()) ||
        url.trim().length > 500
    )
  ) {
    errors.images = `Images must be an array of up to ${MAX_IMAGES} https URLs.`;
  } else {
    data.images = rawImages.map((url) => url.trim());
  }

  if (!isUuid(body.categoryId)) {
    errors.categoryId = 'Choose a valid category.';
  } else {
    data.categoryId = body.categoryId;
  }

  let extraCategoryIds = [];
  if (body.categoryIds !== undefined) {
    if (
      !Array.isArray(body.categoryIds) ||
      body.categoryIds.length > MAX_EXTRA_CATEGORIES ||
      !body.categoryIds.every(isUuid)
    ) {
      errors.categoryIds = `categoryIds must be an array of up to ${MAX_EXTRA_CATEGORIES} valid category ids.`;
    } else {
      extraCategoryIds = [...new Set(body.categoryIds)].filter(
        (id) => id !== body.categoryId
      );
    }
  }

  if (withSku) {
    const sku = text(body.sku);
    if (!sku) {
      data.sku = `SLR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    } else if (!SKU_PATTERN.test(sku)) {
      errors.sku = 'SKU must be 3-64 characters: letters, numbers, dot, dash or underscore.';
    } else {
      data.sku = sku;
    }
  }

  if (Object.keys(errors).length > 0) throw validationError(errors);

  return { data, extraCategoryIds };
}

async function assertCategoriesUsable(ids) {
  const count = await sellerProductRepository.countActiveCategories(ids);
  if (count !== ids.length) {
    throw validationError({
      categoryId: 'One or more categories are invalid or inactive.',
    });
  }
}

function toSellerProductView(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceMinor: product.priceMinor,
    images: product.images,
    stock: product.stock,
    sku: product.sku,
    isActive: product.isActive,
    category: product.category,
    categories: product.categories,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function listMyProducts(sellerId, query = {}) {
  const isActive =
    query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;
  const search = text(query.search).slice(0, 100) || undefined;
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [rows, total] = await sellerProductRepository.listBySeller({
    sellerId,
    isActive,
    search,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    products: rows.map(toSellerProductView),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getMyProduct(sellerId, id) {
  assertProductId(id);
  const product = await sellerProductRepository.findOwned(id, sellerId);
  if (!product) throw new AppError('Product not found.', 404);
  return toSellerProductView(product);
}

async function createMyProduct(sellerId, input) {
  const { data, extraCategoryIds } = validateProduct(input, { withSku: true });
  await assertCategoriesUsable([data.categoryId, ...extraCategoryIds]);

  try {
    const product = await sellerProductRepository.create({
      ...data,
      slug: slugify(data.name),
      isActive: true,
      sellerId, // always from the approved seller profile, never from the body
      categories: { connect: extraCategoryIds.map((id) => ({ id })) },
    });

    return toSellerProductView(product);
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('That SKU is already in use. Choose another.', 409);
    }
    throw error;
  }
}

async function updateMyProduct(sellerId, id, input) {
  assertProductId(id);

  const existing = await sellerProductRepository.findOwned(id, sellerId);
  if (!existing) throw new AppError('Product not found.', 404);

  // SKU and slug stay fixed after creation.
  const { data, extraCategoryIds } = validateProduct(input, { withSku: false });
  await assertCategoriesUsable([data.categoryId, ...extraCategoryIds]);

  const updated = await sellerProductRepository.update(id, {
    ...data,
    categories: { set: extraCategoryIds.map((categoryId) => ({ id: categoryId })) },
  });

  return toSellerProductView(updated);
}

async function setMyProductActive(sellerId, id, isActive) {
  assertProductId(id);

  const existing = await sellerProductRepository.findOwned(id, sellerId);
  if (!existing) throw new AppError('Product not found.', 404);

  const updated = await sellerProductRepository.update(id, { isActive });
  return toSellerProductView(updated);
}

module.exports = {
  listMyProducts,
  getMyProduct,
  createMyProduct,
  updateMyProduct,
  setMyProductActive,
};