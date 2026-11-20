const crypto = require('crypto');

// Guards the public routes Safaricom calls (STK and transaction status
// callbacks). Daraja does not sign callbacks, so the secret in the URL is the
// main protection; these two checks make it harder to attack.

const RATE_WINDOW_MS = 60 * 1000;
// Generous: Safaricom sends one callback per prompt, from a few addresses.
const RATE_LIMIT = Number(process.env.MPESA_CALLBACK_RATE_LIMIT) || 120;

const hits = new Map(); // ip -> { count, windowStart }

// Fixed one-minute window per client address. Memory only, per server process.
function callbackRateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || 'unknown';

  // Drop finished windows so the map cannot grow without limit.
  if (hits.size > 10000) {
    for (const [key, entry] of hits) {
      if (now - entry.windowStart >= RATE_WINDOW_MS) hits.delete(key);
    }
  }

  let entry = hits.get(ip);
  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    hits.set(ip, entry);
  }
  entry.count += 1;

  if (entry.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ ResultCode: 1, ResultDesc: 'Too many requests.' });
  }
  return next();
}

const digest = (value) => crypto.createHash('sha256').update(value).digest();

// Constant-time comparison. Hashing first gives both sides the same length,
// so neither the content nor the length of the secret leaks through timing.
function callbackSecretMatches(given, expected = process.env.MPESA_CALLBACK_SECRET) {
  if (typeof given !== 'string' || typeof expected !== 'string' || !expected) return false;
  return crypto.timingSafeEqual(digest(given), digest(expected));
}

// A wrong secret gets 404, so the routes look like they do not exist.
function requireCallbackSecret(req, res, next) {
  if (!callbackSecretMatches(req.params.secret)) return res.status(404).end();
  return next();
}

// Warns once at startup if the secret is short enough to be worth replacing.
function warnIfWeakCallbackSecret(secret = process.env.MPESA_CALLBACK_SECRET) {
  if (secret && secret.length < 32) {
    console.warn(
      'MPESA_CALLBACK_SECRET is shorter than 32 characters. Use a long random value ' +
        '(change it only when no M-Pesa prompts are waiting for a result).'
    );
  }
}

module.exports = {
  callbackRateLimit,
  callbackSecretMatches,
  requireCallbackSecret,
  warnIfWeakCallbackSecret,
  _resetRateLimit: () => hits.clear(),
};
