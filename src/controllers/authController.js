const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const COOKIE_OPTIONS = {
  httpOnly: true,       // JS cannot access — prevents XSS token theft
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',   // CSRF protection
  maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Fetch admin from DB
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash, name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !admin) {
      // Generic message — don't reveal which field is wrong
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Compare password with bcrypt hash
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Set httpOnly cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

/**
 * GET /api/auth/verify
 * Used by frontend to check if current session is still valid
 */
const verify = (req, res) => {
  // req.admin is set by the protect middleware
  return res.status(200).json({
    success: true,
    admin: { id: req.admin.id, email: req.admin.email, name: req.admin.name },
  });
};

module.exports = { login, logout, verify };
