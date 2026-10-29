
const Category = require('../models/category');
const Product = require('../models/product');

// GET /api/categories
// Public: return active categories only.
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({
      isActive: true,
    }).sort({ name: 1 });

    return res.status(200).json({
      status: 'success',
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories/admin
// Admin: return active and inactive categories.
const getAdminCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({})
      .sort({ name: 1 });

    return res.status(200).json({
      status: 'success',
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image } = req.body;

    if (!name?.trim() || !slug?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Category name and slug are required.',
      });
    }

    const category = await Category.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description,
      image,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Category created successfully.',
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'A category with this slug already exists.',
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

// PATCH /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'slug', 'description', 'image'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Provide at least one field to update.',
      });
    }

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || !updates.name.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Category name cannot be empty.',
        });
      }

      updates.name = updates.name.trim();
    }

    if (updates.slug !== undefined) {
      if (typeof updates.slug !== 'string' || !updates.slug.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Category slug cannot be empty.',
        });
      }

      updates.slug = updates.slug.trim().toLowerCase();
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Category updated successfully.',
      data: category,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID.',
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'A category with this slug already exists.',
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

// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || !category.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Active category not found.',
      });
    }

    const hasActiveProducts = await Product.exists({
      category: category._id,
      isActive: true,
    });

    if (hasActiveProducts) {
      return res.status(409).json({
        status: 'error',
        message: 'Cannot deactivate a category that has active products.',
      });
    }

    category.isActive = false;
    await category.save();

    return res.status(200).json({
      status: 'success',
      message: 'Category deactivated successfully.',
      data: category,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID.',
      });
    }

    next(error);
  }
};

// PATCH /api/categories/:id/activate
const activateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: true } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Category activated successfully.',
      data: category,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID.',
      });
    }

    next(error);
  }
};

module.exports = {
  getCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  activateCategory,
};
