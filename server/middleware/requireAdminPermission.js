const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

// Server-side twin of the permission checks in AdminDashboard.jsx.
//
// Use it AFTER requireAuth:
//   requireAdminPermission('customers.read')
//   requireAdminPermission('sellers.read', 'sellers.update')   -> ANY one of them is enough
//
// The primary administrator always passes. The user is read fresh from the database on every
// request, so a permission change takes effect immediately, whatever requireAuth attaches.
module.exports = (...required) =>
  async function requireAdminPermission(req, res, next) {
    try {
      // Works whether requireAuth sets req.user.id or req.userId.
      const userId = req.user?.id ?? req.userId;

      if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Please sign in.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true, isPrimaryAdmin: true, permissions: true },
      });

      const allowed =
        Boolean(user) &&
        user.isActive &&
        user.role === 'admin' &&
        (user.isPrimaryAdmin ||
          required.some((permission) => (user.permissions || []).includes(permission)));

      if (!allowed) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to do this.',
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
