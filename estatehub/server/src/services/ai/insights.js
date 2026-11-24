// Real numbers from the database for EstateAI (statistics, areas, brokers). Read-only queries.
// They use the same WHERE rules as the public search (buildPublicWhere), so "available" means the same everywhere.
const { query } = require('../../config/db');
const { buildPublicWhere } = require('../propertyService');

async function priceStats(f) {
  const { where, params } = buildPublicWhere(f);
  const [r] = await query(
    `SELECT COUNT(*) AS n, MIN(p.price) AS lo, AVG(p.price) AS avg, MAX(p.price) AS hi FROM properties p WHERE ${where.join(' AND ')}`, params);
  return { count: Number(r.n), min: r.lo === null ? null : Number(r.lo), avg: r.avg === null ? null : Math.round(Number(r.avg)), max: r.hi === null ? null : Number(r.hi) };
}

// Cities and areas that have available listings, with counts.
async function areaOverview(f = {}) {
  const { where, params } = buildPublicWhere({ ...f, city: undefined, area: undefined });
  const rows = await query(
    `SELECT p.city, p.area, COUNT(*) AS n FROM properties p WHERE ${where.join(' AND ')}
     GROUP BY p.city, p.area ORDER BY n DESC, p.city, p.area LIMIT 60`, params);
  return rows.map((r) => ({ city: r.city, area: r.area, n: Number(r.n) }));
}

// For the current filters (without the area), which areas have matches? Used for "same search in Mirpur (3)".
async function areaCounts(f) {
  const { where, params } = buildPublicWhere({ ...f, area: undefined });
  const rows = await query(
    `SELECT p.city, p.area, COUNT(*) AS n FROM properties p WHERE ${where.join(' AND ')}
     GROUP BY p.city, p.area ORDER BY n DESC, p.area LIMIT 5`, params);
  return rows.map((r) => ({ city: r.city, area: r.area, n: Number(r.n) }));
}

async function siteCounts() {
  const [r] = await query(
    `SELECT
       (SELECT COUNT(*) FROM properties WHERE approval_status = 'approved' AND availability_status = 'available') AS listings,
       (SELECT COUNT(*) FROM properties WHERE approval_status = 'approved' AND availability_status = 'available' AND purpose = 'sale') AS for_sale,
       (SELECT COUNT(*) FROM properties WHERE approval_status = 'approved' AND availability_status = 'available' AND purpose = 'rent') AS for_rent,
       (SELECT COUNT(*) FROM users u JOIN broker_profiles bp ON bp.user_id = u.id
          WHERE u.role = 'broker' AND u.status = 'active' AND bp.verification_status = 'approved') AS brokers`);
  return { listings: Number(r.listings), forSale: Number(r.for_sale), forRent: Number(r.for_rent), brokers: Number(r.brokers) };
}

// Verified, active brokers who have available listings matching the filters, best rated first.
async function topBrokers(f, limit = 3) {
  const { where, params } = buildPublicWhere(f);
  const rows = await query(
    `SELECT u.id, u.full_name, bp.company_name, COUNT(DISTINCT p.id) AS listings,
            (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.broker_id = u.id AND r.status = 'visible') AS avg_rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.broker_id = u.id AND r.status = 'visible') AS review_count
     FROM users u
     JOIN broker_profiles bp ON bp.user_id = u.id AND bp.verification_status = 'approved'
     JOIN properties p ON p.broker_id = u.id AND ${where.join(' AND ')}
     WHERE u.role = 'broker' AND u.status = 'active'
     GROUP BY u.id, u.full_name, bp.company_name
     ORDER BY (avg_rating IS NULL), avg_rating DESC, review_count DESC, listings DESC LIMIT ${Number(limit)}`, params);
  return rows.map((r) => ({
    id: r.id, name: r.full_name, companyName: r.company_name, listings: Number(r.listings),
    averageRating: r.avg_rating === null ? null : Number(r.avg_rating), reviewCount: Number(r.review_count),
  }));
}

module.exports = { priceStats, areaOverview, areaCounts, siteCounts, topBrokers };
