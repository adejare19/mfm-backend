const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, logout, verify } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rate limit login to 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/verify', protect, verify);

module.exports = router;
