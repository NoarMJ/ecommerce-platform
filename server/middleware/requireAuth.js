const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  try {
    const payload = jwt.verify(req.cookies.access, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.sub; // a UUID string, so no Number() conversion is needed
    next();
  } catch {
    // Missing, expired or tampered token.
    return res.status(401).json({
      message: 'Authentication required. Please log in.',
    });
  }
};

module.exports = requireAuth;