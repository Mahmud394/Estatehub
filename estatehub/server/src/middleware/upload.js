const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { AppError } = require('../utils/response');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Saves to server/uploads with a random name (the user's file name is never trusted).
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ALLOWED[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 }, // 5 MB each, max 8 per request
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new AppError(400, 'Only JPG, PNG or WebP images are allowed.'));
    }
    cb(null, true);
  },
});

// Turns multer's own errors (file too large etc.) into our error format
function handleUploadErrors(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller.' : 'Upload failed: ' + err.message;
    return next(new AppError(400, msg));
  }
  next(err);
}

module.exports = { upload, handleUploadErrors, UPLOAD_DIR };
