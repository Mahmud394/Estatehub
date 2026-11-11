const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const { publicName } = require('../utils/names');
const { createSafely } = require('../services/notificationService');
const { notifyByEmail } = require('../services/mailService');

// A listing accepts comments only while it is publicly visible.
async function loadPublicProperty(id) {
  const [p] = await query(
    `SELECT p.id, p.title, p.broker_id, u.email AS broker_email, u.status AS broker_status
     FROM properties p JOIN users u ON u.id = p.broker_id
     WHERE p.id = ? AND p.approval_status = 'approved' AND p.availability_status <> 'unavailable'`,
    [id]
  );
  return p || null;
}

// canEdit: only the author. canDelete: the author or an admin.
function toDto(row, viewer) {
  const isAuthor = !!viewer && viewer.id === row.user_id;
  return {
    id: row.id,
    propertyId: row.property_id,
    body: row.body,
    createdAt: row.created_at,
    edited: new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 1000,
    author: {
      id: row.user_id,
      name: publicName(row.author_name, row.author_role),
      role: row.author_role,
      avatarUrl: row.author_avatar,
    },
    canEdit: isAuthor,
    canDelete: isAuthor || viewer?.role === 'admin',
  };
}

const COMMENT_SELECT = `
  SELECT c.id, c.property_id, c.user_id, c.body, c.created_at, c.updated_at,
         u.full_name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
  FROM comments c JOIN users u ON u.id = c.user_id
`;

async function list(req, res, next) {
  try {
    const { propertyId, page, limit } = req.validQuery;
    if (!(await loadPublicProperty(propertyId))) throw new AppError(404, 'Property not found.');

    const [{ total }] = await query("SELECT COUNT(*) AS total FROM comments WHERE property_id = ? AND status = 'visible'", [propertyId]);
    const rows = await query(
      `${COMMENT_SELECT} WHERE c.property_id = ? AND c.status = 'visible'
       ORDER BY c.created_at DESC, c.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      [propertyId]
    );
    return ok(res, {
      items: rows.map((r) => toDto(r, req.user)),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { propertyId, body } = req.body;
    const property = await loadPublicProperty(propertyId);
    if (!property) throw new AppError(404, 'Property not found.');

    // Who may comment: clients, and the broker who owns this listing (to answer questions publicly).
    const isOwnerBroker = req.user.role === 'broker' && req.user.id === property.broker_id;
    if (req.user.role !== 'client' && !isOwnerBroker) {
      throw new AppError(403, 'Only client accounts and the listing broker can comment.');
    }

    // Double-click / retry protection: the same text from the same user within a minute is a duplicate.
    const dup = await query(
      `SELECT id FROM comments WHERE property_id = ? AND user_id = ? AND body = ?
         AND created_at > (NOW() - INTERVAL 60 SECOND) LIMIT 1`,
      [propertyId, req.user.id, body]
    );
    if (dup.length) throw new AppError(409, 'You already posted this comment.');

    const result = await query('INSERT INTO comments (property_id, user_id, body) VALUES (?,?,?)', [propertyId, req.user.id, body]);
    const [row] = await query(`${COMMENT_SELECT} WHERE c.id = ?`, [result.insertId]);

    // Tell the broker (never about their own comments).
    if (!isOwnerBroker && property.broker_status === 'active') {
      await createSafely(property.broker_id, 'new_comment', `New comment on "${property.title}"`, '/broker/comments');
      notifyByEmail(property.broker_email, 'New comment on your EstateHub listing', {
        headline: 'Someone commented on one of your listings.',
        propertyTitle: property.title,
        path: '/broker/comments',
        linkLabel: 'View comments',
      });
    }
    return ok(res, toDto(row, req.user), 'Comment posted.', 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const [row] = await query('SELECT id, user_id, status FROM comments WHERE id = ?', [Number(req.params.id)]);
    if (!row) throw new AppError(404, 'Comment not found.');
    if (row.user_id !== req.user.id) throw new AppError(403, 'You can only edit your own comments.');
    if (row.status === 'hidden') throw new AppError(403, 'This comment was hidden by a moderator and can no longer be edited.');

    await query('UPDATE comments SET body = ? WHERE id = ?', [req.body.body, row.id]);
    const [fresh] = await query(`${COMMENT_SELECT} WHERE c.id = ?`, [row.id]);
    return ok(res, toDto(fresh, req.user), 'Comment updated.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const [row] = await query('SELECT id, user_id FROM comments WHERE id = ?', [Number(req.params.id)]);
    if (!row) throw new AppError(404, 'Comment not found.');
    if (row.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError(403, 'You can only delete your own comments.');
    }
    await query('DELETE FROM comments WHERE id = ?', [row.id]);
    if (req.user.role === 'admin' && row.user_id !== req.user.id) {
      await query('INSERT INTO audit_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
        [req.user.id, 'delete_comment', 'comment', row.id, null]);
    }
    return ok(res, null, 'Comment deleted.');
  } catch (err) { next(err); }
}

// Broker view: comments left on the broker's own listings, newest first.
async function mine(req, res, next) {
  try {
    const { page, limit } = req.validQuery;
    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM comments c JOIN properties p ON p.id = c.property_id
       WHERE p.broker_id = ? AND c.status = 'visible'`, [req.user.id]);
    const rows = await query(
      `SELECT c.id, c.property_id, c.user_id, c.body, c.created_at, c.updated_at,
              u.full_name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar,
              p.title AS property_title
       FROM comments c JOIN properties p ON p.id = c.property_id JOIN users u ON u.id = c.user_id
       WHERE p.broker_id = ? AND c.status = 'visible'
       ORDER BY c.created_at DESC, c.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      [req.user.id]
    );
    // Opening this page clears the "new comment" bell entries.
    await query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'new_comment'", [req.user.id]);
    return ok(res, {
      items: rows.map((r) => ({ ...toDto(r, req.user), propertyTitle: r.property_title })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, mine };
