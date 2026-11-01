const { query } = require('../config/db');
const { ok } = require('../utils/response');
const { reviewDto } = require('./brokerController');

// Real counts for the homepage "platform highlights". Nothing here is hardcoded.
async function stats(req, res, next) {
  try {
    const [counts] = await query(
      `SELECT
         (SELECT COUNT(*) FROM properties WHERE approval_status='approved' AND availability_status='available') AS active_listings,
         (SELECT COUNT(*) FROM broker_profiles bp JOIN users u ON u.id = bp.user_id
            WHERE bp.verification_status='approved' AND u.status='active') AS verified_brokers,
         (SELECT COUNT(*) FROM reviews WHERE status='visible' AND is_demo = 0) AS real_reviews`
    );
    const byCategory = await query(
      `SELECT category, COUNT(*) AS count FROM properties
       WHERE approval_status='approved' AND availability_status='available' GROUP BY category`
    );
    // "Popular" is simply the areas with the most active listings in our own database.
    const topAreas = await query(
      `SELECT city, area, COUNT(*) AS count,
         (SELECT image_url FROM property_images pi JOIN properties p2 ON p2.id = pi.property_id
            WHERE p2.city = p.city AND p2.area = p.area AND p2.approval_status='approved'
            ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS image
       FROM properties p
       WHERE approval_status='approved' AND availability_status='available'
       GROUP BY city, area ORDER BY count DESC, area ASC LIMIT 8`
    );
    return ok(res, {
      activeListings: Number(counts.active_listings),
      verifiedBrokers: Number(counts.verified_brokers),
      realReviews: Number(counts.real_reviews),
      byCategory: Object.fromEntries(byCategory.map((r) => [r.category, Number(r.count)])),
      topAreas: topAreas.map((r) => ({ city: r.city, area: r.area, count: Number(r.count), image: r.image })),
    });
  } catch (err) { next(err); }
}

// Public reviews. Demo reviews are flagged so the UI can label them as sample content.
async function recentReviews(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 12);
    const rows = await query(
      `SELECT r.id, r.rating, r.body, r.is_demo, r.created_at,
              c.full_name AS client_name, b.full_name AS broker_name
       FROM reviews r
       JOIN users c ON c.id = r.client_id
       JOIN users b ON b.id = r.broker_id
       WHERE r.status = 'visible' ORDER BY r.created_at DESC LIMIT ${limit}`
    );
    return ok(res, rows.map(reviewDto));
  } catch (err) { next(err); }
}

module.exports = { stats, recentReviews };
