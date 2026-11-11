const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const { toDto, BASE_SELECT } = require('../services/propertyService');
const { publicName } = require('../utils/names');

// Only verified (admin-approved) brokers with an active account are shown publicly.
// Ratings and listing counts are computed from real rows, never invented.
const BROKER_SELECT = `
  SELECT u.id, u.full_name, u.avatar_url, bp.company_name, bp.bio, bp.service_areas, bp.verification_status,
    (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.broker_id = u.id AND r.status = 'visible') AS avg_rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.broker_id = u.id AND r.status = 'visible') AS review_count,
    (SELECT COUNT(*) FROM properties p WHERE p.broker_id = u.id
       AND p.approval_status = 'approved' AND p.availability_status = 'available') AS active_listings
  FROM users u
  JOIN broker_profiles bp ON bp.user_id = u.id
  WHERE u.role = 'broker' AND u.status = 'active' AND bp.verification_status = 'approved'
`;

// Star counts for one broker, computed from visible reviews only: { average, count, breakdown: {1..5} }.
async function ratingSummary(brokerId) {
  const rows = await query(
    "SELECT rating, COUNT(*) AS n FROM reviews WHERE broker_id = ? AND status = 'visible' GROUP BY rating",
    [brokerId]
  );
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let sum = 0;
  for (const r of rows) {
    breakdown[r.rating] = Number(r.n);
    count += Number(r.n);
    sum += r.rating * Number(r.n);
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : null, count, breakdown };
}

function brokerDto(r) {
  return {
    id: r.id,
    name: r.full_name,
    avatarUrl: r.avatar_url,
    companyName: r.company_name,
    bio: r.bio,
    serviceAreas: r.service_areas ? r.service_areas.split(',').map((s) => s.trim()).filter(Boolean) : [],
    verified: r.verification_status === 'approved',
    averageRating: r.avg_rating === null ? null : Number(r.avg_rating),
    reviewCount: Number(r.review_count),
    activeListings: Number(r.active_listings),
  };
}

async function list(req, res, next) {
  try {
    const { q, area, page, limit } = req.validQuery;
    const where = [];
    const params = [];
    if (q) {
      where.push('(u.full_name LIKE ? OR bp.company_name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (area) { where.push('bp.service_areas LIKE ?'); params.push(`%${area}%`); }
    const extra = where.length ? ' AND ' + where.join(' AND ') : '';

    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM (${BROKER_SELECT}${extra}) t`, params
    );
    // limit/offset are zod-validated integers
    const rows = await query(
      `${BROKER_SELECT}${extra} ORDER BY active_listings DESC, u.id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );
    return ok(res, {
      items: rows.map(brokerDto),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const [row] = await query(`${BROKER_SELECT} AND u.id = ?`, [Number(req.params.id)]);
    if (!row) throw new AppError(404, 'Broker not found.');

    const listings = await query(
      `${BASE_SELECT} WHERE p.broker_id = ? AND p.approval_status = 'approved' AND p.availability_status = 'available'
       ORDER BY p.created_at DESC LIMIT 24`,
      [row.id]
    );
    const reviews = await query(
      `SELECT r.id, r.rating, r.body, r.is_demo, r.created_at, u.full_name AS client_name
       FROM reviews r JOIN users u ON u.id = r.client_id
       WHERE r.broker_id = ? AND r.status = 'visible' ORDER BY r.created_at DESC LIMIT 20`,
      [row.id]
    );
    return ok(res, {
      ...brokerDto(row),
      ratingBreakdown: (await ratingSummary(row.id)).breakdown,
      listings: listings.map((l) => toDto(l)),
      reviews: reviews.map(reviewDto),
    });
  } catch (err) { next(err); }
}

// Public, paginated reviews of one verified broker, plus the rating summary (average + stars breakdown).
async function listReviews(req, res, next) {
  try {
    const { page, limit } = req.validQuery;
    const [broker] = await query(`${BROKER_SELECT} AND u.id = ?`, [Number(req.params.id)]);
    if (!broker) throw new AppError(404, 'Broker not found.');

    const summary = await ratingSummary(broker.id);
    // limit/offset are zod-validated integers
    const rows = await query(
      `SELECT r.id, r.rating, r.body, r.is_demo, r.created_at, u.full_name AS client_name
       FROM reviews r JOIN users u ON u.id = r.client_id
       WHERE r.broker_id = ? AND r.status = 'visible'
       ORDER BY r.created_at DESC, r.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      [broker.id]
    );
    return ok(res, {
      summary,
      items: rows.map(reviewDto),
      pagination: { page, limit, total: summary.count, totalPages: Math.max(1, Math.ceil(summary.count / limit)) },
    });
  } catch (err) { next(err); }
}

function reviewDto(r) {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    isDemo: !!r.is_demo,
    createdAt: r.created_at,
    clientName: publicName(r.client_name, 'client'), // "First L." only
    brokerName: r.broker_name,
  };
}

module.exports = { list, getOne, listReviews, reviewDto };
