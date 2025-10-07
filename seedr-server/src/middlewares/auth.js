const jwt = require('jsonwebtoken');
const database = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mypeercloud-secret-key-change-in-production';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await database.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    // Check if user account is disabled
    if (!user.is_active) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        storageQuota: user.storage_quota,
        storageUsed: user.storage_used,
        remainingQuota: user.remaining_quota,
        plan: user.plan,
        isActive: false
      };
      // Allow user to authenticate but they'll be restricted from certain actions
      return next();
    }

    // Add user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      storageQuota: user.storage_quota,
      storageUsed: user.storage_used,
      remainingQuota: user.remaining_quota,
      plan: user.plan,
      isActive: true
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
  authenticateToken,
  generateToken,
  JWT_SECRET
};