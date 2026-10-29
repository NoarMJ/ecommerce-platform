
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    // requireAdmin should run before this middleware.
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication is required.',
      });
    }

    // The primary administrator can access all protected admin features.
    if (req.user.isPrimaryAdmin) {
      return next();
    }

    const userPermissions = req.user.permissions || [];

    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view product management.',
        requiredAnyOf: permissions,
      });
    }

    next();
  };
};

module.exports = requireAnyPermission;
