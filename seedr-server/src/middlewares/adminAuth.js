// Admin authentication middleware
const database = require('../models/database');

async function requireAdmin(req, res, next) {
  try {
    // User should already be authenticated by authenticateToken middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch user from database to get role
    const user = await database.getUserById(req.user.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach full user data to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireAdmin };
