const productService = require('../services/product.service');
const { Readable } = require('node:stream');
const cloudinary = require('../config/cloudinary');

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

function uploadImageBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: '2valid/products',
        resource_type: 'image',
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    Readable.from([buffer]).pipe(stream);
  });
}

// POST /api/products/images (admin)
const uploadProductImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Choose an image file to upload.' });
  }

  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    return res.status(503).json({ message: 'Product image uploads are not configured.' });
  }

  try {
    const result = await uploadImageBuffer(req.file.buffer);
    return res.status(201).json({
      status: 'success',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error('Product image upload failed:', error.message);
    return res.status(502).json({
      message: 'Could not upload the image right now. Please try again.',
    });
  }
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
  uploadProductImage,
};
