const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { ok, AppError } = require('../utils/response');
const svc = require('../services/propertyService');
const { UPLOAD_DIR } = require('../middleware/upload');

// Fields that change what the public sees. Editing any of them on an approved
// listing sends it back to "pending" so an admin can re-check it.
const REAPPROVAL_FIELDS = ['title', 'description', 'category', 'purpose', 'price', 'size', 'bedrooms', 'bathrooms', 'city', 'area'];

const COLUMN_MAP = {
  title: 'title', description: 'description', category: 'category', purpose: 'purpose',
  price: 'price', size: 'size', bedrooms: 'bedrooms', bathrooms: 'bathrooms',
  city: 'city', area: 'area', addressLine: 'address_line', availabilityStatus: 'availability_status',
};

const isOwnerOrAdmin = (user, row) => !!user && (user.role === 'admin' || user.id === row.broker_id);

// Loads a property and checks the current user owns it (or is admin). Used by every write route.
async function loadOwned(req) {
  const row = await svc.findById(Number(req.params.id));
  if (!row) throw new AppError(404, 'Property not found.');
  if (!isOwnerOrAdmin(req.user, row)) throw new AppError(403, 'You can only manage your own listings.');
  return row;
}

async function list(req, res, next) {
  try {
    return ok(res, await svc.searchPublic(req.validQuery));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const row = await svc.findById(Number(req.params.id));
    const publiclyVisible = row && row.approval_status === 'approved' && row.availability_status !== 'unavailable';
    // Unapproved listings look like "not found" to everyone except their owner and admins.
    if (!row || (!publiclyVisible && !isOwnerOrAdmin(req.user, row))) {
      throw new AppError(404, 'Property not found.');
    }
    const dto = svc.toDto(row, { includeAddress: isOwnerOrAdmin(req.user, row) });
    dto.images = await svc.imagesFor(row.id);
    dto.similar = publiclyVisible ? await svc.similarTo(row) : [];
    return ok(res, dto);
  } catch (err) { next(err); }
}

// Broker's own listings (any approval status)
async function mine(req, res, next) {
  try {
    const rows = await query(`${svc.BASE_SELECT} WHERE p.broker_id = ? ORDER BY p.created_at DESC`, [req.user.id]);
    return ok(res, rows.map((r) => svc.toDto(r, { includeAddress: true })));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const d = req.body;
    // Brokers may create listings immediately; they stay "pending" until an admin approves them.
    const result = await query(
      `INSERT INTO properties (broker_id, title, description, category, purpose, price, size,
         bedrooms, bathrooms, city, area, address_line, approval_status, availability_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending', 'available')`,
      [req.user.id, d.title, d.description, d.category, d.purpose, d.price, d.size,
       d.bedrooms ?? null, d.bathrooms ?? null, d.city, d.area, d.addressLine || null]
    );
    const row = await svc.findById(result.insertId);
    return ok(res, svc.toDto(row, { includeAddress: true }), 'Listing created and sent for approval.', 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const row = await loadOwned(req);
    const changes = req.body;
    const keys = Object.keys(changes).filter((k) => COLUMN_MAP[k] && changes[k] !== undefined);
    if (!keys.length) throw new AppError(400, 'Nothing to update.');

    // Column names come from our own COLUMN_MAP (never from user input); values use placeholders.
    const sets = keys.map((k) => `${COLUMN_MAP[k]} = ?`);
    const values = keys.map((k) => changes[k]);

    let message = 'Listing updated.';
    const needsReapproval =
      row.approval_status === 'approved' && keys.some((k) => REAPPROVAL_FIELDS.includes(k)) && req.user.role !== 'admin';
    if (needsReapproval) {
      sets.push("approval_status = 'pending'");
      message = 'Listing updated and sent for re-approval. It is hidden from the public until an admin approves it.';
    } else if (row.approval_status === 'rejected' && req.user.role !== 'admin') {
      sets.push("approval_status = 'pending'", 'rejection_reason = NULL');
      message = 'Listing updated and resubmitted for approval.';
    }

    await query(`UPDATE properties SET ${sets.join(', ')} WHERE id = ?`, [...values, row.id]);
    const fresh = await svc.findById(row.id);
    return ok(res, svc.toDto(fresh, { includeAddress: true }), message);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const row = await loadOwned(req);
    const images = await svc.imagesFor(row.id);
    await query('DELETE FROM properties WHERE id = ?', [row.id]); // images/comments/favorites cascade
    for (const img of images) deleteLocalFile(img.url);
    return ok(res, null, 'Listing deleted.');
  } catch (err) { next(err); }
}

function deleteLocalFile(url) {
  if (!url || !url.startsWith('/uploads/')) return; // external demo images are not ours to delete
  const file = path.join(UPLOAD_DIR, path.basename(url));
  fs.unlink(file, () => {});
}

async function addImages(req, res, next) {
  try {
    const row = await loadOwned(req);
    if (!req.files || !req.files.length) throw new AppError(400, 'Choose at least one image to upload.');

    const existing = await svc.imagesFor(row.id);
    if (existing.length + req.files.length > 12) {
      req.files.forEach((f) => fs.unlink(f.path, () => {}));
      throw new AppError(400, 'A listing can have at most 12 images.');
    }
    let order = existing.length;
    for (const [i, file] of req.files.entries()) {
      const isPrimary = existing.length === 0 && i === 0 ? 1 : 0;
      await query('INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?,?,?,?)', [
        row.id, `/uploads/${file.filename}`, isPrimary, order++,
      ]);
    }
    return ok(res, await svc.imagesFor(row.id), 'Images uploaded.', 201);
  } catch (err) {
    if (req.files) req.files.forEach((f) => fs.unlink(f.path, () => {}));
    next(err);
  }
}

async function removeImage(req, res, next) {
  try {
    const row = await loadOwned(req);
    const [img] = await query('SELECT id, image_url, is_primary FROM property_images WHERE id = ? AND property_id = ?', [
      Number(req.params.imageId), row.id,
    ]);
    if (!img) throw new AppError(404, 'Image not found.');
    await query('DELETE FROM property_images WHERE id = ?', [img.id]);
    deleteLocalFile(img.image_url);
    if (img.is_primary) {
      await query('UPDATE property_images SET is_primary = 1 WHERE property_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1', [row.id]);
    }
    return ok(res, await svc.imagesFor(row.id), 'Image removed.');
  } catch (err) { next(err); }
}

async function setPrimaryImage(req, res, next) {
  try {
    const row = await loadOwned(req);
    const [img] = await query('SELECT id FROM property_images WHERE id = ? AND property_id = ?', [Number(req.params.imageId), row.id]);
    if (!img) throw new AppError(404, 'Image not found.');
    await query('UPDATE property_images SET is_primary = (id = ?) WHERE property_id = ?', [img.id, row.id]);
    return ok(res, await svc.imagesFor(row.id), 'Primary image updated.');
  } catch (err) { next(err); }
}

// Distinct cities/areas that actually have approved listings, for filter dropdowns.
async function locations(req, res, next) {
  try {
    const rows = await query(
      `SELECT city, area, COUNT(*) AS count FROM properties
       WHERE approval_status = 'approved' AND availability_status = 'available'
       GROUP BY city, area ORDER BY count DESC`
    );
    return ok(res, rows);
  } catch (err) { next(err); }
}

module.exports = { list, getOne, mine, create, update, remove, addImages, removeImage, setPrimaryImage, locations };
