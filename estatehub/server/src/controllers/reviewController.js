const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const { createSafely } = require('../services/notificationService');

const reviewDto = (r) => ({ id: r.id, brokerId: r.broker_id, rating: r.rating, body: r.body, status: r.status, createdAt: r.created_at });

// Eligibility rule (simple and explainable): a client may review a broker once they have actually
// contacted that broker, meaning at least one message sent by the client in a conversation with them.
async function hasContacted(clientId, brokerId) {
  const rows = await query(
    `SELECT 1 FROM conversations c JOIN messages m ON m.conversation_id = c.id
     WHERE c.client_id = ? AND c.broker_id = ? AND m.sender_id = ? LIMIT 1`,
    [clientId, brokerId, clientId]
  );
  return rows.length > 0;
}

async function activeBroker(brokerId) {
  const [b] = await query("SELECT id FROM users WHERE id = ? AND role = 'broker' AND status = 'active'", [brokerId]);
  return !!b;
}

async function eligibility(req, res, next) {
  try {
    const brokerId = Number(req.params.brokerId);
    if (!(await activeBroker(brokerId))) throw new AppError(404, 'Broker not found.');
    const [mine] = await query('SELECT id, broker_id, rating, body, status, created_at FROM reviews WHERE broker_id = ? AND client_id = ?', [brokerId, req.user.id]);
    return ok(res, {
      eligible: await hasContacted(req.user.id, brokerId),
      review: mine ? reviewDto(mine) : null,
    });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { brokerId, rating, body } = req.body;
    if (!(await activeBroker(brokerId))) throw new AppError(404, 'Broker not found.');
    if (!(await hasContacted(req.user.id, brokerId))) {
      throw new AppError(403, 'You can review a broker after you have sent them a message.');
    }
    try {
      const r = await query('INSERT INTO reviews (broker_id, client_id, rating, body, is_demo) VALUES (?,?,?,?,0)', [brokerId, req.user.id, rating, body]);
      const [row] = await query('SELECT id, broker_id, rating, body, status, created_at FROM reviews WHERE id = ?', [r.insertId]);
      // In-app only: the notification says a review exists, it does not repeat the review text.
      await createSafely(brokerId, 'new_review', `You received a ${rating}-star review`, `/brokers/${brokerId}`);
      return ok(res, reviewDto(row), 'Thank you, your review was published.', 201);
    } catch (err) {
      // UNIQUE (broker_id, client_id): one review per client per broker
      if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'You already reviewed this broker. You can edit your review instead.');
      throw err;
    }
  } catch (err) { next(err); }
}

async function loadOwn(req) {
  const [row] = await query('SELECT id, broker_id, client_id, rating, body, status, created_at FROM reviews WHERE id = ?', [Number(req.params.id)]);
  if (!row) throw new AppError(404, 'Review not found.');
  if (row.client_id !== req.user.id) throw new AppError(403, 'You can only change your own review.');
  return row;
}

async function update(req, res, next) {
  try {
    const row = await loadOwn(req);
    if (row.status === 'hidden') {
      throw new AppError(403, 'This review was hidden by a moderator, so it can no longer be edited. You can still delete it.');
    }
    const { rating = row.rating, body = row.body } = req.body;
    await query('UPDATE reviews SET rating = ?, body = ? WHERE id = ?', [rating, body, row.id]);
    return ok(res, reviewDto({ ...row, rating, body }), 'Review updated.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const row = await loadOwn(req);
    await query('DELETE FROM reviews WHERE id = ?', [row.id]);
    return ok(res, null, 'Review deleted.');
  } catch (err) { next(err); }
}

module.exports = { eligibility, create, update, remove };
