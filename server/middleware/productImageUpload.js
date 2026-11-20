const multer = require('multer');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error('Choose a JPG, PNG, WebP, AVIF, or GIF image.');
      error.statusCode = 415;
      callback(error);
      return;
    }
    callback(null, true);
  },
}).single('image');

function uploadProductImage(req, res, next) {
  parser(req, res, (error) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE'
      ? 413
      : error.statusCode || 400;
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be 5 MB or smaller.'
      : error.message || 'Could not read the image file.';

    return res.status(status).json({ message });
  });
}

module.exports = { uploadProductImage, MAX_IMAGE_BYTES };
