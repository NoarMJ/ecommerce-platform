
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      // requireAdmin must run before this middleware.
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required.',
        });
      }

      // The primary administrator can perform all admin actions.
      if (user.isPrimaryAdmin) {
        return next();
      }

      // Regular administrators need the specific permission.
      if (!user.permissions || !user.permissions.includes(permission)) {
        return res.status(403).json({
          status: 'error',
          message: `Permission denied. Required permission: ${permission}`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = requirePermission;
