
const express = require('express');

const {
  getAdmins,
  createAdmin,
  updateAdminPermissions,
} = require('../controllers/adminController');

const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

// All routes require a logged-in administrator.
router.use(requireAuth, requireAdmin);

// GET /api/admins
router.get(
  '/',
  requirePermission('admins.create'),
  getAdmins
);

// POST /api/admins
router.post(
  '/',
  requirePermission('admins.create'),
  createAdmin
);

// PATCH /api/admins/:id/permissions
// The controller additionally requires the primary admin.
router.patch(
  '/:id/permissions',
  updateAdminPermissions
);

module.exports = router;
