const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const { AppError } = require('../utils/response');

const COOKIE_NAME = 'estatehub_token';

function cookieOptions() {
  return {
    httpOnly: true, // JavaScript in the browser cannot read this cookie
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Reads the cookie and loads the user from MySQL on EVERY request,
// so role changes and suspensions take effect immediately.
async function loadUser(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const rows = await query(
      'SELECT id, full_name, email, phone, avatar_url, role, status FROM users WHERE id = ?',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || user.status !== 'active') return null;
    return user;
  } catch {
    return null;
  }
}

// Requires a logged-in, active user
async function requireAuth(req, res, next) {
  try {
    const user = await loadUser(req);
    if (!user) throw new AppError(401, 'Please log in to continue.');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Attaches req.user if logged in, but never blocks the request
async function optionalAuth(req, res, next) {
  try {
    req.user = await loadUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

// Usage: router.post('/', requireAuth, requireRole('broker'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to do that.'));
    }
    next();
  };
}

module.exports = { COOKIE_NAME, cookieOptions, signToken, requireAuth, optionalAuth, requireRole };
