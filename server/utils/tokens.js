const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === 'production';

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax', // cross-site in production, same as your old session cookie
};

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_PATH = '/api/auth/refresh';

// sub must be a string. Your ids are UUIDs, so String() changes nothing.
const signAccess = (userId) =>
  jwt.sign({ sub: String(userId) }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

const signRefresh = (userId) =>
  jwt.sign({ sub: String(userId) }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

function setAuthCookies(res, userId) {
  res
    .cookie('access', signAccess(userId), { ...cookieOpts, maxAge: ACCESS_MS })
    .cookie('refresh', signRefresh(userId), { ...cookieOpts, maxAge: REFRESH_MS, path: REFRESH_PATH });
}

function clearAuthCookies(res) {
  res
    .clearCookie('access', cookieOpts)
    .clearCookie('refresh', { ...cookieOpts, path: REFRESH_PATH });
}

module.exports = { cookieOpts, ACCESS_MS, setAuthCookies, clearAuthCookies };