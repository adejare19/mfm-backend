const jwt = require('jsonwebtoken');

/**
 * Middleware to protect admin-only routes.
 * Reads JWT from httpOnly cookie or Authorization header.
 */
const protect = (req, res, next) => {
  let token;

  // 1. Check httpOnly cookie first (preferred, most secure)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback: Authorization Bearer header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired. Please log in again.' });
  }
};

module.exports = { protect };
