
const express = require('express');

const {
  getCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  activateCategory,
} = require('../controllers/categoryController');

const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

// Public route
router.get('/', getCategories);

router.get(
  '/admin',
  requireAuth,
  requireAdmin,
  requirePermission('categories.update'),
  getAdminCategories
);

router.patch(
  '/:id/activate',
  requireAuth,
  requireAdmin,
  requirePermission('categories.update'),
  activateCategory
);

// Admin-only routes
router.post('/', requireAuth, requireAdmin,requirePermission('categories.create'), createCategory);
router.patch('/:id', requireAuth, requireAdmin, requirePermission('categories.update'), updateCategory);
router.delete('/:id', requireAuth, requireAdmin, requirePermission('categories.deactivate') ,deleteCategory);

module.exports = router;
