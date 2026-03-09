const multer = require('multer');
const path = require('path');

// Allowed MIME types per content category
const ALLOWED_TYPES = {
  sermon: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/ogg', 'video/mp4', 'video/mpeg', 'video/ogg', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  event: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  resource: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  activity: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'],
};

// Use memory storage — we stream directly to Supabase
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const type = req.body.type || req.query.type;
  const allowed = ALLOWED_TYPES[type] || Object.values(ALLOWED_TYPES).flat();

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type "${file.mimetype}" is not allowed for content type "${type}".`),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max per file
    files: 5,                     // max 5 files per upload
  },
});

module.exports = { upload };
