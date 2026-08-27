const jwt = require('jsonwebtoken');
const { query } = require('../helpers/db');

const JWT_SECRET = process.env.JWT_SECRET || 'qx_trade_secret_key_2026_production';

function generateAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role || 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Access restricted to administrators.' });
    }

    // Verify admin user still exists in DB or is env admin
    if (decoded.id === 'admin_env_user') {
      req.admin = { id: 'admin_env_user', email: decoded.email, role: 'admin', name: 'System Administrator' };
      return next();
    }

    const users = await query('SELECT id, email, role, name FROM users WHERE id = ? LIMIT 1', [decoded.id]);
    if (users.length === 0 || users[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin authorization invalid.' });
    }

    req.admin = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Forbidden. Invalid authentication token.' });
  }
}

module.exports = {
  generateAdminToken,
  adminAuth,
  JWT_SECRET,
};
