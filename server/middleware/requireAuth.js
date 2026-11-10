const { isUuid } = require('../utils/ids');

const requireAuth = (req, res, next) => {
  // Check whether the session identifies a logged-in user.
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Authentication required. Please log in.',
    });
  }

  // Sessions from before the Postgres migration hold old Mongo ids.
  if (!isUuid(req.session.userId)) {
    return res.status(401).json({
      message: 'Your session is no longer valid. Please log in again.',
    });
  }

  next();
};

module.exports = requireAuth;