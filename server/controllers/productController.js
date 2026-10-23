const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const requestedLimit =
      Number.parseInt(req.query.limit, 10) || 10;

    const limit = Math.min(50, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;

    const filter = {
      isActive: true,
    };

    // Search product names.
    const search = req.query.search?.trim();

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      filter.name = {
        $regex: escapedSearch,
        $options: 'i',
      };
    }

    // Filter by category slug.
    const categorySlug = req.query.category
      ?.trim()
      .toLowerCase();

    if (categorySlug) {
      const category = await Category.findOne({
        slug: categorySlug,
        isActive: true,
      });

      if (!category) {
        return res.status(200).json({
          status: 'success',
          results: 0,
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
          data: [],
        });
      }

      filter.category = category._id;
    }

    // Count matching products and retrieve the requested page.
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      status: 'success',
      results: products.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products.',
    });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: product,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID.',
      });
    }

    console.error('Error fetching product:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product.',
    });
  }
};



const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      description,
      category,
      priceMinor,
      images,
      stock,
      sku,
    } = req.body;

    // Check required fields.
    if (
      !name?.trim() ||
      !slug?.trim() ||
      !description?.trim() ||
      !category ||
      priceMinor === undefined ||
      !sku?.trim()
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required product fields.',
      });
    }

    // Validate the category ID and ensure the category is active.
    if (!require('mongoose').isValidObjectId(category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID.',
      });
    }

    const existingCategory = await Category.findOne({
      _id: category,
      isActive: true,
    });

    if (!existingCategory) {
      return res.status(400).json({
        status: 'error',
        message: 'The selected category does not exist or is inactive.',
      });
    }

    // Create the product.
    const product = await Product.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      category,
      priceMinor,
      images: images || [],
      stock: stock ?? 0,
      sku: sku.trim().toUpperCase(),
    });

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'A product with this slug or SKU already exists.',
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    next(error);
  }
};



const updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
      'name',
      'slug',
      'description',
      'category',
      'priceMinor',
      'images',
      'stock',
      'sku',
    ];

    const updates = {};

    // Only allow fields we intend to update.
    for (const field of allowedFields) {
      if (Object.hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Provide at least one valid field to update.',
      });
    }

    // Normalize selected string fields.
    if (typeof updates.name === 'string') {
      updates.name = updates.name.trim();
    }

    if (typeof updates.slug === 'string') {
      updates.slug = updates.slug.trim().toLowerCase();
    }

    if (typeof updates.description === 'string') {
      updates.description = updates.description.trim();
    }

    if (typeof updates.sku === 'string') {
      updates.sku = updates.sku.trim().toUpperCase();
    }

    // If a category is supplied, confirm it is valid and active.
    if (updates.category !== undefined) {
      if (!mongoose.isValidObjectId(updates.category)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid category ID.',
        });
      }

      const category = await Category.findOne({
        _id: updates.category,
        isActive: true,
      });

      if (!category) {
        return res.status(400).json({
          status: 'error',
          message: 'The selected category does not exist or is inactive.',
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    ).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Product updated successfully.',
      data: product,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID or field value.',
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'A product with this slug or SKU already exists.',
      });
    }

    next(error);
  }
};

//admin only delete endpint more of disabling 

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },//disable
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Product deactivated successfully.',
      data: product,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID.',
      });
    }

    next(error);
  }
};



module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
