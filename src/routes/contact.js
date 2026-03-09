const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { submitContact } = require('../controllers/contactController');

// Rate limit contact form to 5 submissions per hour per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many submissions. Please try again in an hour.' },
});

router.post('/', contactLimiter, submitContact);

module.exports = router;
