const express = require('express');
const database = require('../models/database');
const { generateToken, authenticateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');

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

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      storageQuota: user.storage_quota,
      storageUsed: user.storage_used,
      plan: user.plan
    },
    token
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    user: req.user
  });
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

module.exports = router;