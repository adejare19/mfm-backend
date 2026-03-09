const express = require('express');
const router = express.Router();
const { getEvents, createEvent, deleteEvent } = require('../controllers/eventsController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', getEvents);
router.post('/', protect, upload.array('files', 5), createEvent);
router.delete('/:id', protect, deleteEvent);

module.exports = router;
