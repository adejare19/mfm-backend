const express = require('express');
const router = express.Router();
const { getSermons, createSermon, deleteSermon } = require('../controllers/sermonsController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', getSermons);
router.post('/', protect, upload.array('files', 5), createSermon);
router.delete('/:id', protect, deleteSermon);

module.exports = router;
