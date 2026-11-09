const productService = require('../services/product.service');

// Temporary bridge: the frontend still reads _id
const legacyCategory = (category) =>
  category ? { ...category, _id: category.id } : category;

const withLegacyId = (product) => ({
  ...product,
  _id: product.id,
  category: legacyCategory(product.category),
  categories: (product.categories || []).map(legacyCategory),
});

const sendError = (error, res, next) => {
  if (error.isAppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
  }
  return next(error);
};

// GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { products, pagination } = await productService.getPublicProducts(
      req.query
    );

    return res.status(200).json({
      status: 'success',
      results: products.length,
      pagination,
      data: products.map(withLegacyId),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);

    return res.status(200).json({
      status: 'success',
      data: withLegacyId(product),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// GET /api/products/slug/:slug
const getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);

    return res.status(200).json({
      status: 'success',
      data: withLegacyId(product),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// POST /api/products (admin)
const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully.',
      data: withLegacyId(product),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// PATCH /api/products/:id (admin)
const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      status: 'success',
      message: 'Product updated successfully.',
      data: withLegacyId(product),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// DELETE /api/products/:id (admin) - deactivates instead of deleting
const deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.deactivateProduct(req.params.id);

    return res.status(200).json({
      status: 'success',
      message: 'Product deactivated successfully.',
      data: withLegacyId(product),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// GET /api/products/admin
const getAdminProducts = async (req, res, next) => {
  try {
    const { products, pagination } = await productService.getAdminProducts(
      req.query
    );

    return res.status(200).json({
      status: 'success',
      results: products.length,
      pagination,
      data: products.map(withLegacyId),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
};