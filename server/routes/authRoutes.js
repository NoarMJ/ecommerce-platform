const express = require('express');
const jwt = require('jsonwebtoken');
const { register, login, getMe, logout } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const { cookieOpts, ACCESS_MS } = require('../utils/tokens');

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh: issues a new access token from the refresh cookie
router.post('/refresh', (req, res) => {
  try {
    const payload = jwt.verify(req.cookies.refresh, process.env.JWT_REFRESH_SECRET);
    const access = jwt.sign({ sub: payload.sub }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '15m',
    });
    res.cookie('access', access, { ...cookieOpts, maxAge: ACCESS_MS }).json({ ok: true });
  } catch {
    res.status(401).json({ message: 'Please log in again.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, getMe);

// POST /api/auth/logout
router.post('/logout', logout);

module.exports = router;