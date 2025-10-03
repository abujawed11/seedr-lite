const express = require('express');
const database = require('../models/database');
const { generateToken, authenticateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const { updateUserStorageUsage } = require('../utils/storage');

const router = express.Router();

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Prevent registration with reserved admin username
  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'This username is reserved. Please choose a different username.' });
  }

  // Check if user already exists
  const existingUser = await database.getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  try {
    const user = await database.createUser({ username, email, password });
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        storageQuota: user.storageQuota,
        storageUsed: user.storageUsed,
        remainingQuota: user.remainingQuota,
        plan: user.plan
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await database.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isValidPassword = await database.verifyPassword(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user.id);

  // CRITICAL FIX: Clear any stale quota notifications from previous sessions
  // These notifications might have been created with outdated quota information
  // and can confuse users with incorrect "quota exceeded" messages on login
  try {
    const { clearAllQuotaExceededNotifications } = require('../services/torrentManager');
    clearAllQuotaExceededNotifications(user.id);
    console.log(`🧹 Cleared stale notifications for user ${user.id.substring(0, 8)}... on login`);
  } catch (error) {
    // Non-critical - just log the error and continue
    console.error('⚠️ Failed to clear notifications on login:', error);
  }

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      storageQuota: user.storage_quota,
      storageUsed: user.storage_used,
      remainingQuota: user.remaining_quota,
      plan: user.plan,
      role: user.role || 'user',
      maxConcurrentDownloads: user.max_concurrent_downloads || 2,
      isActive: user.is_active || 1
    },
    token
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  // Prevent caching of profile data
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Update storage usage before returning profile
  try {
    const calculatedUsage = await updateUserStorageUsage(req.user.id);
    console.log(`📊 Profile: Calculated storage usage for user ${req.user.id}: ${calculatedUsage} bytes`);

    // Get fresh user data with updated storage
    const updatedUser = await database.getUserById(req.user.id);
    console.log(`📊 Profile: Database shows usage: ${updatedUser.storage_used} bytes`);

    res.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        storageQuota: updatedUser.storage_quota,
        storageUsed: updatedUser.storage_used,
        remainingQuota: updatedUser.remaining_quota,
        plan: updatedUser.plan,
        role: updatedUser.role || 'user',
        maxConcurrentDownloads: updatedUser.max_concurrent_downloads || 2,
        isActive: updatedUser.is_active || 1
      }
    });
  } catch (error) {
    console.error('Error updating storage usage:', error);
    // Fallback to cached user data
    res.json({
      user: req.user
    });
  }
}));

// Update storage quota (admin endpoint for upgrades)
router.put('/quota', authenticateToken, asyncHandler(async (req, res) => {
  const { newQuota } = req.body;

  if (!newQuota || newQuota < 0) {
    return res.status(400).json({ error: 'Valid quota size required' });
  }

  await database.updateUserQuota(req.user.id, newQuota);

  res.json({
    message: 'Storage quota updated successfully',
    newQuota
  });
}));

// Get current user's subscription details
router.get('/subscription', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user basic info
  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get active subscription
  const activeSubscription = await database.getUserActiveSubscription(userId);

  // Get subscription history
  const subscriptionHistory = await database.getUserSubscriptionHistory(userId);

  // Get subscription history log (actions)
  const historyLog = await database.getUserSubscriptionHistoryLog(userId);

  // Calculate days until expiry
  let daysUntilExpiry = null;
  let isExpired = false;

  if (activeSubscription && activeSubscription.expires_at) {
    const expiryDate = new Date(activeSubscription.expires_at);
    const now = new Date();
    const timeDiff = expiryDate.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
    isExpired = daysUntilExpiry <= 0;
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan,
      role: user.role,
      createdAt: user.created_at,
      storageQuota: user.storage_quota,
      storageUsed: user.storage_used,
      isActive: user.is_active,
      is_active: user.is_active
    },
    activeSubscription: activeSubscription ? {
      ...activeSubscription,
      daysUntilExpiry,
      isExpired
    } : null,
    subscriptionHistory,
    historyLog
  });
}));

module.exports = router;