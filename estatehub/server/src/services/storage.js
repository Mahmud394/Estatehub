// Where uploaded property photos live.
//  - On Vercel (BLOB_READ_WRITE_TOKEN is set): Vercel Blob. The serverless file system is read-only, so local files cannot work there.
//  - On your own PC (no token): server/uploads on disk, exactly like before.
// The database stores either "/uploads/name.jpg" (local) or a full https URL (Blob).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Saves one multer file and returns the URL to store in the database.
async function save(file) {
  if (!useBlob()) return `/uploads/${file.filename}`;
  const { put } = require('@vercel/blob'); // loaded only when needed
  const name = `property-images/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXT[file.mimetype]}`;
  const blob = await put(name, file.buffer, { access: 'public', contentType: file.mimetype });
  return blob.url;
}

// Removes files that multer already wrote to disk when a request fails (memory uploads need no cleanup).
function discardUploads(files, uploadDir) {
  if (useBlob() || !files) return;
  files.forEach((f) => fs.unlink(f.path, () => {}));
}

// Deletes a stored photo. External demo images (other hosts) are never touched.
async function remove(url, uploadDir) {
  if (!url) return;
  try {
    if (url.startsWith('/uploads/')) {
      fs.unlink(path.join(uploadDir, path.basename(url)), () => {});
    } else if (useBlob() && /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(url)) {
      await require('@vercel/blob').del(url);
    }
  } catch (err) {
    console.error('[storage] could not delete a photo:', err.code || err.message);
  }
}

module.exports = { useBlob, save, discardUploads, remove };
