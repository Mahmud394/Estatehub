const bcrypt = require('bcrypt');
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

module.exports = { register, login, logout, me, updateProfile };
