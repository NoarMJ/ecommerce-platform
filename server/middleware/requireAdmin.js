
const User = require('../models/user');

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Your session is no longer valid.',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Administrator access required.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireAdmin;
