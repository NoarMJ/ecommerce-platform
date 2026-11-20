const categoryService = require('../services/category.service');

// Temporary bridge: the frontend still reads _id
const withLegacyId = (category) => ({ ...category, _id: category.id });

const sendError = (error, res, next) => {
  if (error.isAppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
  }
  return next(error);
};

// GET /api/categories
// Public: return active categories only.
const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getPublicCategories();

    return res.status(200).json({
      status: 'success',
      results: categories.length,
      data: categories.map(withLegacyId),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// GET /api/categories/admin
// Admin: return active and inactive categories.
const getAdminCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAdminCategories();

    return res.status(200).json({
      status: 'success',
      results: categories.length,
      data: categories.map(withLegacyId),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);

    return res.status(201).json({
      status: 'success',
      message: 'Category created successfully.',
      data: withLegacyId(category),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// PATCH /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      status: 'success',
      message: 'Category updated successfully.',
      data: withLegacyId(category),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const category = await categoryService.deactivateCategory(req.params.id);

    return res.status(200).json({
      status: 'success',
      message: 'Category deactivated successfully.',
      data: withLegacyId(category),
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// PATCH /api/categories/:id/activate
const activateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.activateCategory(req.params.id);

    return res.status(200).json({
      status: 'success',
      message: 'Category activated successfully.',
      data: withLegacyId(category),
    });
  } catch (error) {
    return sendError(error, res, next);
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