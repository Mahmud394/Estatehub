// Any logged-in user can report content. Reporter identity is only visible to admins.
const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');

// Looks up what is being reported and who owns it (so people cannot report themselves).
async function findTarget(type, id) {
  if (type === 'property') {
    const [r] = await query("SELECT id, broker_id AS owner_id FROM properties WHERE id = ? AND approval_status = 'approved'", [id]);
    return r;
  }
  if (type === 'comment') {
    const [r] = await query("SELECT id, user_id AS owner_id FROM comments WHERE id = ? AND status = 'visible'", [id]);
    return r;
  }
  if (type === 'review') {
    const [r] = await query("SELECT id, client_id AS owner_id FROM reviews WHERE id = ? AND status = 'visible'", [id]);
    return r;
  }
  const [r] = await query("SELECT id, id AS owner_id FROM users WHERE id = ? AND role = 'broker' AND status = 'active'", [id]);
  return r;
}

async function create(req, res, next) {
  try {
    const { targetType, targetId, reason } = req.body;
    const target = await findTarget(targetType, targetId);
    if (!target) throw new AppError(404, 'That item could not be found.');
    if (target.owner_id === req.user.id) throw new AppError(400, 'You cannot report your own content.');

    const [dup] = await query(
      "SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'",
      [req.user.id, targetType, targetId]);
    if (dup) throw new AppError(409, 'You have already reported this. An administrator will review it soon.');

    await query('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?,?,?,?)',
      [req.user.id, targetType, targetId, reason]);
    return ok(res, null, 'Thank you. Your report was sent to the moderation team.', 201);
  } catch (err) { next(err); }
}

module.exports = { create };
