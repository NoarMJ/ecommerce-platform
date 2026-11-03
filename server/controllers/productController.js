const Product = require('../models/product');
const Category = require('../models/category');

const {
  uploadImage,
  deleteImage,
} = require('../services/cloudinaryService');

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const CATEGORY_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'categories', select: 'name slug' },
];

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Accept categories as either an array or a JSON-encoded array.
// This is useful because Multer receives multipart form-data fields as strings.
const normalizeCategoriesInput = (categories) => {
  if (categories === undefined || categories === null || categories === '') {
    return undefined;
  }

  if (Array.isArray(categories)) {
    return categories;
  }

  if (typeof categories === 'string') {
    try {
      const parsed = JSON.parse(categories);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not JSON. Accept a comma-separated list as a fallback.
      return categories.split(',').map((id) => id.trim()).filter(Boolean);
    }
  }

  return categories;
};

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

const collectCategoryIds = (category, categories) => {
  const ids = [];

  if (category !== undefined && category !== null && category !== '') {
    ids.push(category);
  }

  const normalizedCategories = normalizeCategoriesInput(categories);

  if (normalizedCategories !== undefined) {
    if (!Array.isArray(normalizedCategories)) {
      return { error: 'categories must be an array of category IDs.' };
    }

    ids.push(...normalizedCategories);
  }

  const normalized = [];

  for (const id of ids) {
    if (typeof id !== 'string' || !OBJECT_ID_PATTERN.test(id)) {
      return { error: 'Invalid category ID.' };
    }

    normalized.push(id.toLowerCase());
  }

  return { ids: [...new Set(normalized)] };
};

const allCategoriesActive = async (ids) => {
  const count = await Category.countDocuments({
    _id: { $in: ids },
    isActive: true,
  });

  return count === ids.length;
};

// Upload multiple Multer files to Cloudinary.
// Returns objects containing { url, publicId }.
const uploadProductImages = async (files = []) => {
  const uploadedImages = [];

  try {
    for (const file of files) {
      const image = await uploadImage(
        file.buffer,
        'ecommerce/products'
      );

      uploadedImages.push(image);
    }

    return uploadedImages;
  } catch (error) {
    // Remove images already uploaded if a later upload fails.
    await Promise.allSettled(
      uploadedImages.map((image) => deleteImage(image.publicId))
    );

    throw error;
  }
};

// Remove uploaded Cloudinary images.
// This is used when the database operation fails.
const deleteProductImages = async (images = []) => {
  return Promise.allSettled(
    images
      .filter((image) => image?.publicId)
      .map((image) => deleteImage(image.publicId))
  );
};

// -----------------------------------------------------------------------------
// GET /api/products
// Public product listing
// -----------------------------------------------------------------------------

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

    // Search by product name.
    const search = req.query.search?.trim();

    if (search) {
      filter.name = {
        $regex: escapeRegex(search),
        $options: 'i',
      };
    }

    // Filter by one or more category slugs.
    const categorySlugs = parseCategorySlugs(req.query);

    if (categorySlugs.length > 0) {
      const matchingCategories = await Category.find({
        slug: { $in: categorySlugs },
        isActive: true,
      }).select('_id');

      const categoryIds = matchingCategories.map(
        (item) => item._id
      );

      if (categoryIds.length === 0) {
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

      // Support both the primary category and additional categories.
      filter.$or = [
        { categories: { $in: categoryIds } },
        { category: { $in: categoryIds } },
      ];
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate(CATEGORY_POPULATE)
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
    console.error('Error fetching products:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products.',
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/products/:id
// Public product lookup by ID
// -----------------------------------------------------------------------------

const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate(CATEGORY_POPULATE);

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

    console.error('Error fetching product:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product.',
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/products/slug/:slug
// Public product lookup by slug
// -----------------------------------------------------------------------------

const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: String(req.params.slug).toLowerCase(),
      isActive: true,
    }).populate(CATEGORY_POPULATE);

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
    console.error('Error fetching product by slug:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product.',
    });
  }
};

// -----------------------------------------------------------------------------
// POST /api/products
// Admin product creation
// -----------------------------------------------------------------------------

const createProduct = async (req, res, next) => {
  let uploadedImages = [];

  try {
    const {
      name,
      slug,
      description,
      category,
      categories,
      priceMinor,
      stock,
      sku,
    } = req.body;

    const collected = collectCategoryIds(category, categories);

    if (collected.error) {
      return res.status(400).json({
        status: 'error',
        message: collected.error,
      });
    }

    const categoryIds = collected.ids;

    // Validate required fields.
    if (
      !name?.trim() ||
      !slug?.trim() ||
      !description?.trim() ||
      categoryIds.length === 0 ||
      priceMinor === undefined ||
      priceMinor === '' ||
      !sku?.trim()
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required product fields.',
      });
    }

    const parsedPrice = Number(priceMinor);
    const parsedStock = stock === undefined || stock === ''
      ? 0
      : Number(stock);

    if (
      !Number.isSafeInteger(parsedPrice) ||
      parsedPrice < 0
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'priceMinor must be a valid non-negative integer.',
      });
    }

    if (
      !Number.isSafeInteger(parsedStock) ||
      parsedStock < 0
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'stock must be a valid non-negative integer.',
      });
    }

    if (!(await allCategoriesActive(categoryIds))) {
      return res.status(400).json({
        status: 'error',
        message: 'One or more selected categories do not exist or are inactive.',
      });
    }

    // Upload images only after validating the product fields and categories.
    uploadedImages = await uploadProductImages(req.files || []);

    const product = await Product.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      category: categoryIds[0],
      categories: categoryIds,
      priceMinor: parsedPrice,
      images: uploadedImages,
      stock: parsedStock,
      sku: sku.trim().toUpperCase(),
    });

    await product.populate(CATEGORY_POPULATE);

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    // If saving the product fails, remove its newly uploaded images.
    await deleteProductImages(uploadedImages);

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

// -----------------------------------------------------------------------------
// PATCH /api/products/:id
// Admin product update
// -----------------------------------------------------------------------------

const updateProduct = async (req, res, next) => {
  let uploadedImages = [];

  try {
    const allowedFields = [
      'name',
      'slug',
      'description',
      'category',
      'categories',
      'priceMinor',
      'stock',
      'sku',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

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

    if (updates.priceMinor !== undefined) {
      updates.priceMinor = Number(updates.priceMinor);

      if (
        !Number.isSafeInteger(updates.priceMinor) ||
        updates.priceMinor < 0
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'priceMinor must be a valid non-negative integer.',
        });
      }
    }

    if (updates.stock !== undefined) {
      updates.stock = Number(updates.stock);

      if (
        !Number.isSafeInteger(updates.stock) ||
        updates.stock < 0
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'stock must be a valid non-negative integer.',
        });
      }
    }

    const hasCategory = updates.category !== undefined;
    const hasCategories = updates.categories !== undefined;

    if (hasCategory || hasCategories) {
      const collected = collectCategoryIds(
        updates.category,
        updates.categories
      );

      if (collected.error) {
        return res.status(400).json({
          status: 'error',
          message: collected.error,
        });
      }

      const categoryIds = collected.ids;

      if (categoryIds.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'A product must have at least one category.',
        });
      }

      if (!(await allCategoriesActive(categoryIds))) {
        return res.status(400).json({
          status: 'error',
          message: 'One or more selected categories do not exist or are inactive.',
        });
      }

      if (hasCategories) {
        updates.categories = categoryIds;

        if (hasCategory) {
          updates.category = categoryIds[0];
        } else {
          const existing = await Product.findById(req.params.id)
            .select('category');

          if (!existing) {
            return res.status(404).json({
              status: 'error',
              message: 'Product not found.',
            });
          }

          updates.category = categoryIds.includes(
            String(existing.category)
          )
            ? existing.category
            : categoryIds[0];
        }
      } else {
        // When only the primary category changes, preserve the other categories.
        updates.category = categoryIds[0];

        const existing = await Product.findById(req.params.id)
          .select('categories');

        if (!existing) {
          return res.status(404).json({
            status: 'error',
            message: 'Product not found.',
          });
        }

        const existingCategoryIds = (existing.categories || []).map(
          (id) => String(id)
        );

        updates.categories = [
          ...new Set([
            ...existingCategoryIds,
            ...categoryIds,
          ]),
        ];
      }
    }

    const existingProduct = await Product.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found.',
      });
    }

    // Upload any newly selected images.
    uploadedImages = await uploadProductImages(req.files || []);

    const update = {};

    if (Object.keys(updates).length > 0) {
      update.$set = updates;
    }

    // Append new images without replacing existing images.
    if (uploadedImages.length > 0) {
      update.$push = {
        images: {
          $each: uploadedImages,
        },
      };
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid product fields or images were provided.',
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      update,
      {
        returnDocument: 'after',
        runValidators: true,
      }
    ).populate(CATEGORY_POPULATE);

    if (!product) {
      await deleteProductImages(uploadedImages);

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
    // Remove only the images uploaded during this failed update.
    await deleteProductImages(uploadedImages);

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

// -----------------------------------------------------------------------------
// DELETE /api/products/:id
// Admin product deactivation (soft delete)
// -----------------------------------------------------------------------------

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { returnDocument: 'after' }
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

// -----------------------------------------------------------------------------
// GET /api/products/admin
// Admin product listing
// -----------------------------------------------------------------------------

const getAdminProducts = async (req, res, next) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const requestedLimit =
      Number.parseInt(req.query.limit, 10) || 10;

    const limit = Math.min(50, Math.max(1, requestedLimit));

    const filter = {};

    // Search by product name or SKU.
    if (req.query.search?.trim()) {
      const escapedSearch = escapeRegex(req.query.search.trim());
      const searchRegex = new RegExp(escapedSearch, 'i');

      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
      ];
    }

    // Filter by active status.
    const status = req.query.status || 'active';

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    } else if (status !== 'all') {
      return res.status(400).json({
        status: 'error',
        message: 'Status must be active, inactive, or all.',
      });
    }

    // Filter by one or more category slugs.
    const categoryInput = [
      ...(req.query.category ? [req.query.category] : []),
      ...(req.query.categories
        ? Array.isArray(req.query.categories)
          ? req.query.categories
          : [req.query.categories]
        : []),
    ];

    const categorySlugs = [
      ...new Set(
        categoryInput
          .flatMap((value) => String(value).split(','))
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    if (categorySlugs.length > 0) {
      const matchingCategories = await Category.find({
        slug: { $in: categorySlugs },
      }).select('_id');

      const categoryIds = matchingCategories.map(
        (category) => category._id
      );

      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { category: { $in: categoryIds } },
            { categories: { $in: categoryIds } },
          ],
        },
      ];
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate(CATEGORY_POPULATE)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
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
    next(error);
  }
};

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
};