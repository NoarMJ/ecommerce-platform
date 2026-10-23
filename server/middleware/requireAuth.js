
const requireAuth = (req, res, next) => {
  // Check whether the session identifies a logged-in user.
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Authentication required. Please log in.',
    });
  }

  // The request is authenticated. Continue to the next handler.
  next();
};

module.exports = requireAuth;
