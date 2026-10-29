const Product = require('../models/product');
const Category = require('../models/category');

// A MongoDB ObjectId is exactly 24 hex characters.
// (mongoose.isValidObjectId also accepts any 12-character string, so we avoid it.)
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Populate both the primary category and the full category list.
const CATEGORY_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'categories', select: 'name slug' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Read category slugs from the query string.
// Supports: ?category=gaming
//           ?categories=gaming,electronics
//           ?categories=gaming&categories=electronics
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

// Combine the primary `category` and the `categories` array from a request
// body into one list of unique, valid ID strings.
// The primary category (if supplied) is always first in the list.
const collectCategoryIds = (category, categories) => {
  const ids = [];

  if (category !== undefined && category !== null && category !== '') {
    ids.push(category);
  }

  if (categories !== undefined) {
    if (!Array.isArray(categories)) {
      return { error: 'categories must be an array of category IDs.' };
    }

    ids.push(...categories);
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

// Confirm that every ID belongs to an existing, active category.
const allCategoriesActive = async (ids) => {
  const count = await Category.countDocuments({
    _id: { $in: ids },
    isActive: true,
  });

  return count === ids.length;
};

// ---------------------------------------------------------------------------
// GET /api/products
// ---------------------------------------------------------------------------
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

    // Filter by one or multiple category slugs.
    const categorySlugs = parseCategorySlugs(req.query);

    if (categorySlugs.length > 0) {
      const matchingCategories = await Category.find({
        slug: { $in: categorySlugs },
        isActive: true,
      }).select('_id');

      const categoryIds = matchingCategories.map((item) => item._id);

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

      // Match the categories array or the older primary category field,
      // so products created before multi-category support still appear.
      filter.$or = [
        { categories: { $in: categoryIds } },
        { category: { $in: categoryIds } },
      ];
    }

    // Count matching products and retrieve the requested page.
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
    console.error('Error fetching products:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products.',
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/products/:id
// ---------------------------------------------------------------------------
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

    console.error('Error fetching product:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product.',
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/products/slug/:slug
// ---------------------------------------------------------------------------
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
    console.error('Error fetching product by slug:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product.',
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/products (admin)
// ---------------------------------------------------------------------------
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      description,
      category,
      categories,
      priceMinor,
      images,
      stock,
      sku,
    } = req.body;

    // Collect the primary category and any extra categories.
    const collected = collectCategoryIds(category, categories);

    if (collected.error) {
      return res.status(400).json({
        status: 'error',
        message: collected.error,
      });
    }

    const categoryIds = collected.ids;

    // Check required fields. At least one category is required.
    if (
      !name?.trim() ||
      !slug?.trim() ||
      !description?.trim() ||
      categoryIds.length === 0 ||
      priceMinor === undefined ||
      !sku?.trim()
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required product fields.',
      });
    }

    // Every selected category must exist and be active.
    if (!(await allCategoriesActive(categoryIds))) {
      return res.status(400).json({
        status: 'error',
        message:
          'One or more selected categories do not exist or are inactive.',
      });
    }

    // The primary category is `category` if supplied,
    // otherwise the first ID in `categories`.
    const product = await Product.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      category: categoryIds[0],
      categories: categoryIds,
      priceMinor,
      images: images || [],
      stock: stock ?? 0,
      sku: sku.trim().toUpperCase(),
    });

    await product.populate(CATEGORY_POPULATE);

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

// ---------------------------------------------------------------------------
// PATCH /api/products/:id (admin)
// ---------------------------------------------------------------------------
const updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
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

    // Handle category changes.
    const hasCategory = updates.category !== undefined;
    const hasCategories = updates.categories !== undefined;
    let addToSet;

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
          message:
            'One or more selected categories do not exist or are inactive.',
        });
      }

      if (hasCategories) {
        // Replace the full category list.
        updates.categories = categoryIds;

        if (hasCategory) {
          // The supplied primary category is first in the list.
          updates.category = categoryIds[0];
        } else {
          // Keep the existing primary category if it is still in the list,
          // otherwise use the first category from the new list.
          const existing = await Product.findById(req.params.id).select(
            'category'
          );

          if (!existing) {
            return res.status(404).json({
              status: 'error',
              message: 'Product not found.',
            });
          }

          updates.category = categoryIds.includes(String(existing.category))
            ? existing.category
            : categoryIds[0];
        }
      } else {
        // Only the primary category changed: set it and make sure
        // it is also part of the categories list.
        updates.category = categoryIds[0];
        addToSet = { categories: categoryIds[0] };
      }
    }

    const update = { $set: updates };

    if (addToSet) {
      update.$addToSet = addToSet;
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

// ---------------------------------------------------------------------------
// DELETE /api/products/:id (admin) - deactivates instead of deleting
// ---------------------------------------------------------------------------
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


const getAdminProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedLimit =
      Number.parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(50, Math.max(1, requestedLimit));

    const filter = {};

    // Search by product name or SKU.
    if (req.query.search?.trim()) {
      const escapedSearch = req.query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const searchRegex = new RegExp(escapedSearch, 'i');

      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
      ];
    }

    // Filter by active status. "all" leaves status unrestricted.
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

    // Accept one category slug or several comma-separated slugs.
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

      // Match either the primary category or an additional category.
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

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate(CATEGORY_POPULATE)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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


module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  
};
