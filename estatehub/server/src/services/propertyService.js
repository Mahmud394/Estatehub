const { query } = require('../config/db');

// One SELECT used by lists and details, so every response has the same shape.
const BASE_SELECT = `
  SELECT p.*, u.full_name AS broker_name, u.avatar_url AS broker_avatar,
         bp.company_name, bp.verification_status AS broker_verification,
         (SELECT image_url FROM property_images WHERE property_id = p.id
            ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1) AS primary_image
  FROM properties p
  JOIN users u ON u.id = p.broker_id
  LEFT JOIN broker_profiles bp ON bp.user_id = p.broker_id
`;

// Convert a DB row to the JSON we send. The precise street address is only
// included when `includeAddress` is true (owner or admin).
function toDto(row, { includeAddress = false } = {}) {
  const dto = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    purpose: row.purpose,
    price: row.price,
    currency: row.currency,
    size: row.size,
    sizeUnit: row.size_unit,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    city: row.city,
    area: row.area,
    approvalStatus: row.approval_status,
    rejectionReason: row.rejection_reason,
    availabilityStatus: row.availability_status,
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    primaryImage: row.primary_image,
    broker: {
      id: row.broker_id,
      name: row.broker_name,
      avatarUrl: row.broker_avatar,
      companyName: row.company_name,
      verified: row.broker_verification === 'approved',
    },
  };
  if (includeAddress) dto.addressLine = row.address_line;
  return dto;
}

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC, p.id DESC',
  price_desc: 'p.price DESC, p.id DESC',
};

// Public search: only approved + available listings. All values go through placeholders.
async function searchPublic(f) {
  const where = ["p.approval_status = 'approved'", "p.availability_status = 'available'"];
  const params = [];

  if (f.q) {
    where.push('(p.title LIKE ? OR p.description LIKE ? OR p.area LIKE ? OR p.city LIKE ?)');
    const like = `%${f.q}%`;
    params.push(like, like, like, like);
  }
  if (f.city) { where.push('p.city = ?'); params.push(f.city); }
  if (f.area) { where.push('p.area LIKE ?'); params.push(`%${f.area}%`); }
  if (f.category) { where.push('p.category = ?'); params.push(f.category); }
  if (f.purpose) { where.push('p.purpose = ?'); params.push(f.purpose); }
  if (f.minPrice !== undefined) { where.push('p.price >= ?'); params.push(f.minPrice); }
  if (f.maxPrice !== undefined) { where.push('p.price <= ?'); params.push(f.maxPrice); }
  if (f.minSize !== undefined) { where.push('p.size >= ?'); params.push(f.minSize); }
  if (f.maxSize !== undefined) { where.push('p.size <= ?'); params.push(f.maxSize); }
  if (f.bedrooms !== undefined) { where.push('p.bedrooms >= ?'); params.push(f.bedrooms); }

  const whereSql = 'WHERE ' + where.join(' AND ');
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM properties p ${whereSql}`, params);

  // LIMIT/OFFSET are integers already validated by zod, so they are safe to inline
  // (some MySQL versions reject placeholders in LIMIT with prepared statements).
  const limit = Number(f.limit);
  const offset = (Number(f.page) - 1) * limit;
  const rows = await query(
    `${BASE_SELECT} ${whereSql} ORDER BY ${SORTS[f.sort]} LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map((r) => toDto(r)),
    pagination: { page: f.page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function findById(id) {
  const rows = await query(`${BASE_SELECT} WHERE p.id = ?`, [id]);
  return rows[0] || null;
}

async function imagesFor(propertyId) {
  const rows = await query(
    'SELECT id, image_url, is_primary FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC',
    [propertyId]
  );
  return rows.map((r) => ({ id: r.id, url: r.image_url, isPrimary: !!r.is_primary }));
}

// Similar listings by transparent rules: same category + purpose, price within +/-40%,
// preferring the same area, then the same city.
async function similarTo(row, limit = 4) {
  const rows = await query(
    `${BASE_SELECT}
     WHERE p.id <> ? AND p.approval_status = 'approved' AND p.availability_status = 'available'
       AND p.category = ? AND p.purpose = ? AND p.price BETWEEN ? AND ?
     ORDER BY (p.area = ?) DESC, (p.city = ?) DESC, ABS(p.price - ?) ASC
     LIMIT ${Number(limit)}`,
    [row.id, row.category, row.purpose, row.price * 0.6, row.price * 1.4, row.area, row.city, row.price]
  );
  return rows.map((r) => toDto(r));
}

module.exports = { BASE_SELECT, toDto, searchPublic, findById, imagesFor, similarTo };
