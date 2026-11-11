const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const { BASE_SELECT, toDto } = require('../services/propertyService');

// Ids only (used to fill the heart icons on every card with one small request).
async function ids(req, res, next) {
  try {
    const rows = await query('SELECT property_id FROM favorites WHERE user_id = ?', [req.user.id]);
    return ok(res, rows.map((r) => r.property_id));
  } catch (err) { next(err); }
}

// Full cards. Listings that were un-approved or hidden since being saved are left out.
async function list(req, res, next) {
  try {
    const rows = await query(
      `${BASE_SELECT} JOIN favorites f ON f.property_id = p.id
       WHERE f.user_id = ? AND p.approval_status = 'approved' AND p.availability_status <> 'unavailable'
       ORDER BY f.created_at DESC, f.id DESC`,
      [req.user.id]
    );
    return ok(res, rows.map((r) => toDto(r)));
  } catch (err) { next(err); }
}

async function add(req, res, next) {
  try {
    const propertyId = Number(req.params.propertyId);
    const [p] = await query(
      "SELECT id FROM properties WHERE id = ? AND approval_status = 'approved' AND availability_status <> 'unavailable'",
      [propertyId]
    );
    if (!p) throw new AppError(404, 'Property not found.');
    // The UNIQUE key (user_id, property_id) + INSERT IGNORE makes this safe to repeat.
    await query('INSERT IGNORE INTO favorites (user_id, property_id) VALUES (?,?)', [req.user.id, propertyId]);
    return ok(res, { favorited: true }, 'Saved to favorites.', 201);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await query('DELETE FROM favorites WHERE user_id = ? AND property_id = ?', [req.user.id, Number(req.params.propertyId)]);
    return ok(res, { favorited: false }, 'Removed from favorites.');
  } catch (err) { next(err); }
}

module.exports = { ids, list, add, remove };
