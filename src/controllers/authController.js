const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

/**
 * POST /api/auth/login
 * Returns JWT token in response body — frontend stores in sessionStorage
 * and sends as Authorization: Bearer <token> on subsequent requests.
 * (httpOnly cookies are blocked cross-origin between Vercel and Render)
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash, name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const logout = (req, res) => {
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

const verify = (req, res) => {
  return res.status(200).json({
    success: true,
    admin: { id: req.admin.id, email: req.admin.email, name: req.admin.name },
  });
};

module.exports = { login, logout, verify };
