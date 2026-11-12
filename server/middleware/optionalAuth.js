const jwt = require('jsonwebtoken');

// Attach the signed-in user when a valid access cookie is present, while still
// allowing guest requests such as guest-cart reads and updates.
const optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies?.access;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.userId = payload.sub;
    }
  } catch {
    // Expired or invalid cookies are treated as a guest session.
  }

  next();
};

module.exports = optionalAuth;
