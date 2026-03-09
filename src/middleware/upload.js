const multer = require('multer');

// All allowed MIME types across all content types.
// NOTE: req.body is NOT available during fileFilter with multipart/form-data,
// so we allow all valid types here and validate per-type in the controllers.
const ALL_ALLOWED_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/ogg',
  'video/mp4', 'video/mpeg', 'video/ogg',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not supported.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 5,
  },
});

module.exports = { upload };
