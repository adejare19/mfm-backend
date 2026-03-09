const express = require('express');
const router = express.Router();
const { getResources, createResource, deleteResource } = require('../controllers/resourcesController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', getResources);
router.post('/', protect, upload.array('files', 5), createResource);
router.delete('/:id', protect, deleteResource);

module.exports = router;
