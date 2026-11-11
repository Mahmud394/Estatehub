const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');

const dto = (n) => ({ id: n.id, type: n.type, title: n.title, link: n.link, isRead: !!n.is_read, createdAt: n.created_at });

// A user only ever sees their own notifications (every query filters by user_id).
async function list(req, res, next) {
  try {
    const { limit } = req.validQuery;
    const rows = await query(
      `SELECT id, type, title, link, is_read, created_at FROM notifications
       WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ${limit}`,
      [req.user.id]
    );
    const [{ unread }] = await query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    return ok(res, { items: rows.map(dto), unreadCount: Number(unread) });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const r = await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
    if (!r.affectedRows) {
      const [exists] = await query('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
      if (!exists) throw new AppError(404, 'Notification not found.');
    }
    return ok(res, null, 'Marked as read.');
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.id]);
    return ok(res, null, 'All notifications marked as read.');
  } catch (err) { next(err); }
}

module.exports = { list, markRead, markAllRead };
