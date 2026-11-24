// Admin-only moderation. Every route in routes/admin.js is behind requireAuth + requireRole('admin').
const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const { publicName } = require('../utils/names');
const notifications = require('../services/notificationService');
const mail = require('../services/mailService');
const audit = require('../services/auditService');

// Emails never contain private text: just a short sentence and a link. Skipped when SMTP is not configured.
async function emailUser(userId, subject, headline, path, linkLabel, propertyTitle) {
  try {
    const [u] = await query('SELECT email FROM users WHERE id = ?', [userId]);
    if (u) mail.notifyByEmail(u.email, subject, { headline, propertyTitle, path, linkLabel });
  } catch (err) { console.error('[admin] email lookup failed:', err.code || err.message); }
}

const offset = (page, limit) => (page - 1) * limit;
const paged = (items, total, page, limit) => ({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
// Only used with values that already passed zod (an enum), never with raw input.
const statusWhere = (col, status) => (status ? { sql: `WHERE ${col} = ?`, params: [status] } : { sql: '', params: [] });

// ---------- overview ----------
async function stats(req, res, next) {
  try {
    const [row] = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
        (SELECT COUNT(*) FROM users WHERE status = 'suspended') AS suspended_users,
        (SELECT COUNT(*) FROM users WHERE role = 'broker') AS brokers,
        (SELECT COUNT(*) FROM properties WHERE approval_status = 'pending') AS pending_listings,
        (SELECT COUNT(*) FROM properties WHERE approval_status = 'approved') AS approved_listings,
        (SELECT COUNT(*) FROM broker_profiles WHERE verification_status = 'pending') AS pending_brokers,
        (SELECT COUNT(*) FROM reports WHERE status = 'open') AS open_reports,
        (SELECT COUNT(*) FROM comments WHERE status = 'hidden') AS hidden_comments,
        (SELECT COUNT(*) FROM reviews WHERE status = 'hidden') AS hidden_reviews`);
    const recent = await query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at, u.full_name AS admin_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.admin_id ORDER BY a.id DESC LIMIT 5`);
    return ok(res, {
      counts: {
        activeUsers: row.active_users, suspendedUsers: row.suspended_users, brokers: row.brokers,
        pendingListings: row.pending_listings, approvedListings: row.approved_listings,
        pendingBrokers: row.pending_brokers, openReports: row.open_reports,
        hiddenComments: row.hidden_comments, hiddenReviews: row.hidden_reviews,
      },
      recentActivity: recent.map(auditDto),
    });
  } catch (err) { next(err); }
}

// ---------- listings ----------
async function listProperties(req, res, next) {
  try {
    const { page, limit, status } = req.validQuery;
    const w = statusWhere('p.approval_status', status);
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM properties p ${w.sql}`, w.params);
    const rows = await query(
      `SELECT p.id, p.title, p.category, p.purpose, p.price, p.city, p.area, p.approval_status, p.rejection_reason,
              p.availability_status, p.is_demo, p.created_at, u.id AS broker_id, u.full_name AS broker_name
       FROM properties p JOIN users u ON u.id = p.broker_id ${w.sql}
       ORDER BY (p.approval_status = 'pending') DESC, p.created_at DESC LIMIT ${limit} OFFSET ${offset(page, limit)}`,
      w.params);
    return ok(res, paged(rows.map((r) => ({
      id: r.id, title: r.title, category: r.category, purpose: r.purpose, price: r.price, city: r.city, area: r.area,
      approvalStatus: r.approval_status, rejectionReason: r.rejection_reason, availabilityStatus: r.availability_status,
      isDemo: !!r.is_demo, createdAt: r.created_at, brokerId: r.broker_id, brokerName: r.broker_name,
    })), total, page, limit));
  } catch (err) { next(err); }
}

async function setApproval(req, res, next, approved) {
  try {
    const [p] = await query('SELECT id, broker_id, title, approval_status FROM properties WHERE id = ?', [Number(req.params.id)]);
    if (!p) throw new AppError(404, 'Listing not found.');
    const reason = approved ? null : req.body.reason;
    await query('UPDATE properties SET approval_status = ?, rejection_reason = ? WHERE id = ?',
      [approved ? 'approved' : 'rejected', reason, p.id]);
    await audit.log(req.user.id, approved ? 'approve_listing' : 'reject_listing', 'property', p.id, reason);
    await notifications.createSafely(
      p.broker_id, approved ? 'listing_approved' : 'listing_rejected',
      approved ? `Your listing "${p.title}" was approved and is now public.` : `Your listing "${p.title}" was rejected. Open it to see the reason.`,
      '/broker/listings');
    emailUser(p.broker_id, approved ? 'Your listing was approved' : 'Your listing needs changes',
      approved ? 'An administrator approved your listing. It is now public.' : 'An administrator reviewed your listing and asked for changes.',
      '/broker/listings', 'Open your listings', p.title);
    return ok(res, { id: p.id, approvalStatus: approved ? 'approved' : 'rejected' }, approved ? 'Listing approved.' : 'Listing rejected.');
  } catch (err) { next(err); }
}
const approveProperty = (req, res, next) => setApproval(req, res, next, true);
const rejectProperty = (req, res, next) => setApproval(req, res, next, false);

// ---------- brokers ----------
async function listBrokers(req, res, next) {
  try {
    const { page, limit, status } = req.validQuery;
    const w = statusWhere('bp.verification_status', status);
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM broker_profiles bp ${w.sql}`, w.params);
    const rows = await query(
      `SELECT u.id, u.full_name, u.email, u.status AS user_status, bp.company_name, bp.license_number, bp.verification_status, bp.created_at
       FROM broker_profiles bp JOIN users u ON u.id = bp.user_id ${w.sql}
       ORDER BY (bp.verification_status = 'pending') DESC, bp.created_at DESC LIMIT ${limit} OFFSET ${offset(page, limit)}`,
      w.params);
    return ok(res, paged(rows.map((r) => ({
      id: r.id, fullName: r.full_name, email: r.email, userStatus: r.user_status, companyName: r.company_name,
      licenseNumber: r.license_number, verificationStatus: r.verification_status, createdAt: r.created_at,
    })), total, page, limit));
  } catch (err) { next(err); }
}

async function setVerification(req, res, next, approved) {
  try {
    const [b] = await query(
      `SELECT u.id FROM users u JOIN broker_profiles bp ON bp.user_id = u.id WHERE u.id = ? AND u.role = 'broker'`, [Number(req.params.id)]);
    if (!b) throw new AppError(404, 'Broker not found.');
    await query(
      `UPDATE broker_profiles SET verification_status = ?, verified_at = ${approved ? 'NOW()' : 'NULL'} WHERE user_id = ?`,
      [approved ? 'approved' : 'rejected', b.id]);
    await audit.log(req.user.id, approved ? 'verify_broker' : 'reject_broker', 'user', b.id, approved ? null : req.body.reason);
    await notifications.createSafely(
      b.id, approved ? 'broker_verified' : 'broker_rejected',
      approved ? 'Your broker account is verified. Clients can now message and review you.' : 'Your broker verification was not approved.',
      '/broker/profile');
    emailUser(b.id, approved ? 'You are now a verified broker' : 'Broker verification update',
      approved ? 'Your EstateHub broker account has been verified.' : 'Your broker verification was not approved.',
      '/broker/profile', 'Open your profile');
    return ok(res, { id: b.id, verificationStatus: approved ? 'approved' : 'rejected' }, approved ? 'Broker verified.' : 'Broker rejected.');
  } catch (err) { next(err); }
}
const verifyBroker = (req, res, next) => setVerification(req, res, next, true);
const rejectBroker = (req, res, next) => setVerification(req, res, next, false);

// ---------- users ----------
async function listUsers(req, res, next) {
  try {
    const { page, limit, role, status, q } = req.validQuery;
    const where = []; const params = [];
    if (role) { where.push('role = ?'); params.push(role); }
    if (status) { where.push('status = ?'); params.push(status); }
    if (q) { where.push('(full_name LIKE ? OR email LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM users ${sql}`, params);
    const rows = await query(
      `SELECT id, full_name, email, role, status, created_at FROM users ${sql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset(page, limit)}`, params);
    return ok(res, paged(rows.map((r) => ({
      id: r.id, fullName: r.full_name, email: r.email, role: r.role, status: r.status, createdAt: r.created_at,
    })), total, page, limit));
  } catch (err) { next(err); }
}

async function setUserStatus(req, res, next) {
  try {
    const { status } = req.body;
    const [u] = await query('SELECT id, role, status FROM users WHERE id = ?', [Number(req.params.id)]);
    if (!u) throw new AppError(404, 'User not found.');
    if (u.id === req.user.id) throw new AppError(400, 'You cannot suspend your own account.');
    if (u.role === 'admin') throw new AppError(403, 'Administrator accounts cannot be suspended here.');
    if (u.status === status) return ok(res, { id: u.id, status }, 'No change.');
    await query('UPDATE users SET status = ? WHERE id = ?', [status, u.id]);
    await audit.log(req.user.id, status === 'suspended' ? 'suspend_user' : 'activate_user', 'user', u.id, null);
    // A suspended user is blocked at login and on every request (middleware/auth.js reloads the user each time).
    return ok(res, { id: u.id, status }, status === 'suspended' ? 'User suspended.' : 'User activated.');
  } catch (err) { next(err); }
}

// ---------- comments and reviews ----------
async function listComments(req, res, next) {
  try {
    const { page, limit, status } = req.validQuery;
    const w = statusWhere('c.status', status);
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM comments c ${w.sql}`, w.params);
    const rows = await query(
      `SELECT c.id, c.body, c.status, c.created_at, c.property_id, p.title AS property_title, u.id AS user_id, u.full_name, u.role
       FROM comments c JOIN users u ON u.id = c.user_id JOIN properties p ON p.id = c.property_id ${w.sql}
       ORDER BY c.id DESC LIMIT ${limit} OFFSET ${offset(page, limit)}`, w.params);
    return ok(res, paged(rows.map((r) => ({
      id: r.id, body: r.body, status: r.status, createdAt: r.created_at, propertyId: r.property_id,
      propertyTitle: r.property_title, userId: r.user_id, authorName: r.full_name, authorRole: r.role,
    })), total, page, limit));
  } catch (err) { next(err); }
}

async function listReviews(req, res, next) {
  try {
    const { page, limit, status } = req.validQuery;
    const w = statusWhere('r.status', status);
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM reviews r ${w.sql}`, w.params);
    const rows = await query(
      `SELECT r.id, r.rating, r.body, r.status, r.created_at, r.broker_id, b.full_name AS broker_name, c.id AS client_id, c.full_name AS client_name
       FROM reviews r JOIN users b ON b.id = r.broker_id JOIN users c ON c.id = r.client_id ${w.sql}
       ORDER BY r.id DESC LIMIT ${limit} OFFSET ${offset(page, limit)}`, w.params);
    return ok(res, paged(rows.map((r) => ({
      id: r.id, rating: r.rating, body: r.body, status: r.status, createdAt: r.created_at,
      brokerId: r.broker_id, brokerName: r.broker_name, clientId: r.client_id, authorName: r.client_name,
    })), total, page, limit));
  } catch (err) { next(err); }
}

// kind = 'comment' | 'review'. Hiding removes it from every public page; the author can no longer edit it.
function moderate(kind) {
  const table = kind === 'comment' ? 'comments' : 'reviews';
  const ownerCol = kind === 'comment' ? 'user_id' : 'client_id';
  return async (req, res, next) => {
    try {
      const { status } = req.body;
      const [row] = await query(`SELECT id, ${ownerCol} AS owner_id, status FROM ${table} WHERE id = ?`, [Number(req.params.id)]);
      if (!row) throw new AppError(404, `${kind === 'comment' ? 'Comment' : 'Review'} not found.`);
      if (row.status !== status) {
        await query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, row.id]);
        await audit.log(req.user.id, `${status === 'hidden' ? 'hide' : 'unhide'}_${kind}`, kind, row.id, null);
        if (status === 'hidden') {
          // The notification never repeats what the user wrote.
          await notifications.createSafely(row.owner_id, 'content_hidden',
            `One of your ${kind}s was hidden by a moderator because it may break our community rules.`, '/');
        }
      }
      return ok(res, { id: row.id, status }, status === 'hidden' ? `${kind} hidden.` : `${kind} is visible again.`);
    } catch (err) { next(err); }
  };
}

// ---------- reports ----------
async function listReports(req, res, next) {
  try {
    const { page, limit, status, targetType } = req.validQuery;
    const where = []; const params = [];
    if (status) { where.push('r.status = ?'); params.push(status); }
    if (targetType) { where.push('r.target_type = ?'); params.push(targetType); }
    const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM reports r ${sql}`, params);
    const rows = await query(
      `SELECT r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at, r.handled_by,
              rep.full_name AS reporter_name, h.full_name AS handler_name
       FROM reports r JOIN users rep ON rep.id = r.reporter_id LEFT JOIN users h ON h.id = r.handled_by ${sql}
       ORDER BY (r.status = 'open') DESC, r.id DESC LIMIT ${limit} OFFSET ${offset(page, limit)}`, params);
    const items = [];
    for (const r of rows) {
      items.push({
        id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason, status: r.status,
        createdAt: r.created_at, reporterName: r.reporter_name, handledBy: r.handler_name || null,
        target: await describeTarget(r.target_type, r.target_id),
      });
    }
    return ok(res, paged(items, total, page, limit));
  } catch (err) { next(err); }
}

// A short, safe preview of what was reported (null if it has since been deleted).
async function describeTarget(type, id) {
  if (type === 'property') {
    const [r] = await query('SELECT id, title FROM properties WHERE id = ?', [id]);
    return r ? { label: r.title, link: `/properties/${r.id}` } : null;
  }
  if (type === 'comment') {
    const [r] = await query('SELECT id, body, status, property_id FROM comments WHERE id = ?', [id]);
    return r ? { label: r.body.slice(0, 140), status: r.status, link: `/properties/${r.property_id}` } : null;
  }
  if (type === 'review') {
    const [r] = await query('SELECT id, body, status, broker_id FROM reviews WHERE id = ?', [id]);
    return r ? { label: r.body.slice(0, 140), status: r.status, link: `/brokers/${r.broker_id}` } : null;
  }
  const [r] = await query('SELECT id, full_name, role, status FROM users WHERE id = ?', [id]);
  return r ? { label: publicName(r.full_name, r.role), status: r.status, link: r.role === 'broker' ? `/brokers/${r.id}` : null } : null;
}

async function resolveReport(req, res, next) {
  try {
    const { status } = req.body;
    const [r] = await query('SELECT id, status FROM reports WHERE id = ?', [Number(req.params.id)]);
    if (!r) throw new AppError(404, 'Report not found.');
    await query('UPDATE reports SET status = ?, handled_by = ? WHERE id = ?', [status, req.user.id, r.id]);
    await audit.log(req.user.id, `report_${status}`, 'report', r.id, null);
    return ok(res, { id: r.id, status }, status === 'resolved' ? 'Report marked as resolved.' : 'Report dismissed.');
  } catch (err) { next(err); }
}

// ---------- audit log ----------
const auditDto = (a) => ({
  id: a.id, action: a.action, targetType: a.target_type, targetId: a.target_id, details: a.details,
  adminName: a.admin_name || 'Unknown', createdAt: a.created_at,
});

async function listAudit(req, res, next) {
  try {
    const { page, limit, action } = req.validQuery;
    const w = action ? { sql: 'WHERE a.action = ?', params: [action] } : { sql: '', params: [] };
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM audit_logs a ${w.sql}`, w.params);
    const rows = await query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at, u.full_name AS admin_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.admin_id ${w.sql}
       ORDER BY a.id DESC LIMIT ${limit} OFFSET ${offset(page, limit)}`, w.params);
    return ok(res, paged(rows.map(auditDto), total, page, limit));
  } catch (err) { next(err); }
}

module.exports = {
  stats, listProperties, approveProperty, rejectProperty, listBrokers, verifyBroker, rejectBroker,
  listUsers, setUserStatus, listComments, listReviews, moderateComment: moderate('comment'), moderateReview: moderate('review'),
  listReports, resolveReport, listAudit,
};
