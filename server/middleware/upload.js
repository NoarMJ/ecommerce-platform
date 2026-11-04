
const multer = require('multer');

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(null, true);
    }

    cb(new Error('Only JPEG, PNG, GIF and WEBP image files are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
    },
});

module.exports = upload;
