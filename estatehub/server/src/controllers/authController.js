const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { verifyGoogleIdToken } = require('../services/googleAuth');
const env = require('../config/env');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/mailService');
const { pool, query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const { COOKIE_NAME, cookieOptions, signToken } = require('../middleware/auth');

// Fields that are safe to send to the browser. Never include password_hash.
function publicUser(u) {
  return {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone,
    avatarUrl: u.avatar_url,
    role: u.role,
  };
}

async function register(req, res, next) {
  const { fullName, email, password, role, phone, companyName } = req.body;
  const conn = await pool.getConnection();
  try {
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      throw new AppError(409, 'An account with this email already exists.', { email: 'Email already registered.' });
    }
    const hash = await bcrypt.hash(password, 12);

    // Transaction: the user and the broker profile are created together or not at all.
    await conn.beginTransaction();
    const [result] = await conn.execute(
      'INSERT INTO users (full_name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
      [fullName, email, hash, role, phone || null]
    );
    if (role === 'broker') {
      await conn.execute('INSERT INTO broker_profiles (user_id, company_name) VALUES (?,?)', [
        result.insertId,
        companyName || null,
      ]);
    }
    await conn.commit();

    const [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    sendWelcomeEmail(user);
    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions());
    return ok(res, { user: publicUser(user) }, 'Account created.', 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
    // Same message for "no such user" and "wrong password" so attackers can't discover which emails exist.
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) throw new AppError(401, 'Incorrect email or password.');
    if (user.status !== 'active') throw new AppError(403, 'This account has been suspended.');

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions());
    return ok(res, { user: publicUser(user) }, 'Logged in.');
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  return ok(res, null, 'Logged out.');
}

async function me(req, res, next) {
  try {
    const data = { user: publicUser({ ...req.user }) };
    if (req.user.role === 'broker') {
      const [profile] = await query(
        'SELECT company_name, bio, service_areas, verification_status FROM broker_profiles WHERE user_id = ?',
        [req.user.id]
      );
      data.brokerProfile = profile
        ? {
            companyName: profile.company_name,
            bio: profile.bio,
            serviceAreas: profile.service_areas,
            verificationStatus: profile.verification_status,
          }
        : null;
    }
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

// Updates only whitelisted profile fields. Role/status/email can never be changed here.
async function updateProfile(req, res, next) {
  try {
    const { fullName, phone, companyName, bio, serviceAreas } = req.body;
    if (fullName !== undefined || phone !== undefined) {
      await query('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?', [
        fullName ?? null,
        phone ?? null,
        req.user.id,
      ]);
    }
    if (req.user.role === 'broker') {
      await query(
        `UPDATE broker_profiles SET company_name = COALESCE(?, company_name), bio = COALESCE(?, bio),
           service_areas = COALESCE(?, service_areas) WHERE user_id = ?`,
        [companyName ?? null, bio ?? null, serviceAreas ?? null, req.user.id]
      );
    }
    return me({ user: { ...req.user, full_name: fullName ?? req.user.full_name, phone: phone ?? req.user.phone } }, res, next);
  } catch (err) {
    next(err);
  }
}

// ---- Forgot / reset password ----------------------------------------------------------
const RESET_MINUTES = 30;
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

// Always answers the same way, so nobody can use this form to find out which emails have accounts.
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const [user] = await query('SELECT id, full_name, email, status FROM users WHERE email = ?', [email]);
    if (user && user.status === 'active') {
      const token = crypto.randomBytes(32).toString('hex');
      await query('DELETE FROM password_resets WHERE user_id = ?', [user.id]); // only the newest link works
      await query(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))',
        [user.id, hashToken(token), RESET_MINUTES]
      );
      sendPasswordResetEmail(user, token, RESET_MINUTES);
    }
    return ok(res, null, 'If an account exists for that email, a reset link has been sent. It expires in 30 minutes.');
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const [row] = await query(
      'SELECT id, user_id FROM password_resets WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP()',
      [hashToken(token)]
    );
    if (!row) throw new AppError(400, 'This reset link is invalid or has expired. Please request a new one.');
    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
    await query('DELETE FROM password_resets WHERE user_id = ?', [row.user_id]); // the link works only once
    return ok(res, null, 'Password changed. You can log in now.');
  } catch (err) {
    next(err);
  }
}

// ---- Continue with Google ------------------------------------------------------------
// Google proves the email is real, so: existing email -> log in (and link Google), new email -> create the account.
async function googleLogin(req, res, next) {
  try {
    if (!env.googleClientId) throw new AppError(503, 'Google sign-in is not set up on this site yet.');
    const { credential, role } = req.body;
    let g;
    try { g = await verifyGoogleIdToken(credential); } catch (e) { throw new AppError(401, e.message); }

    let [user] = await query('SELECT * FROM users WHERE google_id = ? OR email = ? ORDER BY google_id = ? DESC LIMIT 1', [g.sub, g.email, g.sub]);
    let created = false;
    if (user) {
      if (user.status !== 'active') throw new AppError(403, 'This account has been suspended.');
      if (!user.google_id) await query('UPDATE users SET google_id = ? WHERE id = ?', [g.sub, user.id]);
    } else {
      // Google users get a random password nobody knows; they can set a real one with "Forgot password".
      const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.execute(
          'INSERT INTO users (full_name, email, password_hash, role, avatar_url, google_id) VALUES (?,?,?,?,?,?)',
          [g.name.slice(0, 120), g.email, hash, role, g.picture ? g.picture.slice(0, 500) : null, g.sub]
        );
        if (role === 'broker') await conn.execute('INSERT INTO broker_profiles (user_id) VALUES (?)', [result.insertId]);
        await conn.commit();
        [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        created = true;
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      sendWelcomeEmail(user);
    }
    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions());
    return ok(res, { user: publicUser(user), created }, created ? 'Account created with Google.' : 'Logged in with Google.', created ? 201 : 200);
  } catch (err) {
    next(err);
  }
}

module.exports = { googleLogin, register, login, logout, me, updateProfile, forgotPassword, resetPassword };
