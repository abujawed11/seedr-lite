const express = require('express');
const database = require('../models/database');
const { generateToken, authenticateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const { updateUserStorageUsage, ensureUserStorageDir } = require('../utils/storage');
// COMMENTED OUT: SMTP blocked on Digital Ocean
// const emailService = require('../services/emailService');
const { generateOTP } = require('../utils/otpGenerator');
const axios = require('axios');

const router = express.Router();

// Register new user - Step 1: Send OTP
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password, ageConfirmed, termsAccepted, privacyAccepted } = req.body;

  // Validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Legal validation
  if (!ageConfirmed) {
    return res.status(400).json({ error: 'You must confirm that you are at least 18 years old' });
  }

  if (!termsAccepted) {
    return res.status(400).json({ error: 'You must accept the Terms of Service' });
  }

  if (!privacyAccepted) {
    return res.status(400).json({ error: 'You must accept the Privacy Policy' });
  }

  // Prevent registration with reserved admin username
  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'This username is reserved. Please choose a different username.' });
  }

  // Check if user already exists
  const existingUser = await database.getUserByEmail(email);
  if (existingUser) {
    // Log failed registration - duplicate email
    await req.activityLogger.log(req, 'register_failure', {
      username,
      torrentName: `email:${email}`,
      magnetLink: 'reason:email_exists'
    });
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  try {
    // Generate OTP
    const otp = generateOTP();

    // Get client IP address
    const registrationIp = req.ip || req.connection.remoteAddress;

    // Store OTP in database with legal acceptance data
    await database.createOTP(email, otp, { ageConfirmed, registrationIp });

    // Send OTP email
    // COMMENTED OUT: SMTP blocked on Digital Ocean
    // await emailService.sendOTPEmail(email, otp);
    console.log('🔐 [TESTING MODE] Registration OTP:', otp, 'for email:', email);

    // Log registration attempt (OTP sent)
    await req.activityLogger.log(req, 'register_attempt', {
      username,
      torrentName: `email:${email}`,
      fileSize: ageConfirmed ? 1 : 0
    });

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: email,
      otp: otp // TESTING: Include OTP in response (remove in production)
    });
  } catch (error) {
    console.error('Registration error:', error);
    // COMMENTED OUT: Email service check not needed
    // if (error.message.includes('Email service not configured')) {
    //   return res.status(503).json({ error: 'Email service is not available. Please contact administrator.' });
    // }
    res.status(500).json({ error: 'Failed to generate verification code. Please try again.' });
  }
}));

// Verify OTP and complete registration - Step 2
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { email, otp, username, password } = req.body;

  // Validation
  if (!email || !otp || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Get OTP from database
    const storedOTP = await database.getOTPByEmail(email);

    if (!storedOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      await req.activityLogger.log(req, 'otp_verify_failure', {
        username,
        torrentName: `email:${email}`,
        magnetLink: 'reason:invalid_otp'
      });
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    // Check if user already exists (double check)
    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Create user with legal acceptance data from OTP record
    const user = await database.createUser({
      username,
      email,
      password,
      ageConfirmed: storedOTP.age_confirmed === 1,
      registrationIp: storedOTP.registration_ip
    });

    // Create user's storage directory
    ensureUserStorageDir(user.id);
    console.log(`📁 Created storage directory for user: ${user.username} (${user.id})`);

    // Mark email as verified
    await database.markEmailAsVerified(email);

    // Mark OTP as verified
    await database.markOTPAsVerified(storedOTP.id);

    // Generate token
    const token = generateToken(user.id);

    // Log successful registration
    await req.activityLogger.log(req, 'register_success', {
      userId: user.id,
      username: user.username,
      torrentName: `email:${user.email}`,
      fileSize: storedOTP.age_confirmed === 1 ? 1 : 0
    });

    res.status(201).json({
      message: 'Registration completed successfully',
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
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
}));

// Verify admin login OTP
router.post('/verify-admin-otp', asyncHandler(async (req, res) => {
  const { username, otp } = req.body;

  if (!username || !otp) {
    return res.status(400).json({ error: 'Username and OTP are required' });
  }

  try {
    // Get user
    const user = await database.getUserByUsername(username);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid request' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || user.email;

    // Get OTP from database
    const storedOTP = await database.getOTPByEmail(adminEmail);

    if (!storedOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      await req.activityLogger.log(req, 'admin_otp_verify_failure', {
        username,
        magnetLink: 'reason:invalid_otp'
      });
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    // Mark OTP as verified
    await database.markOTPAsVerified(storedOTP.id);

    // Generate token and complete login
    const token = generateToken(user.id);

    // Log successful admin login
    await req.activityLogger.logAuth(req, 'admin_login', user.id, user.username, true);

    // Clear quota notifications
    try {
      const { clearAllQuotaExceededNotifications } = require('../services/torrentManager');
      clearAllQuotaExceededNotifications(user.id);
      console.log(`🧹 Cleared stale notifications for admin ${user.id.substring(0, 8)}...`);
    } catch (error) {
      console.error('⚠️ Failed to clear notifications:', error);
    }

    console.log(`✅ Admin login successful for ${user.username}`);

    res.json({
      message: 'Admin login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        storageQuota: user.storage_quota,
        storageUsed: user.storage_used,
        remainingQuota: user.remaining_quota,
        plan: user.plan,
        role: user.role,
        maxConcurrentDownloads: user.max_concurrent_downloads || 10,
        isActive: user.is_active || 1
      },
      token
    });
  } catch (error) {
    console.error('Admin OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
}));

// Resend admin OTP
router.post('/resend-admin-otp', asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const user = await database.getUserByUsername(username);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid request' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || user.email;

    // Generate new OTP
    const otp = generateOTP();

    // Store OTP in database
    await database.createOTP(adminEmail, otp);

    // Send OTP email
    // COMMENTED OUT: SMTP blocked on Digital Ocean
    // await emailService.sendAdminLoginOTP(adminEmail, otp);
    console.log(`🔐 [TESTING MODE] Resend Admin OTP:`, otp, 'for email:', adminEmail);

    res.status(200).json({
      message: 'OTP resent successfully',
      email: adminEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      otp: otp // TESTING: Include OTP in response (remove in production)
    });
  } catch (error) {
    console.error('Resend admin OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP. Please try again.' });
  }
}));

// Resend OTP
router.post('/resend-otp', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate new OTP
    const otp = generateOTP();

    // Store OTP in database
    await database.createOTP(email, otp);

    // Send OTP email
    // COMMENTED OUT: SMTP blocked on Digital Ocean
    // await emailService.sendOTPEmail(email, otp);
    console.log('🔐 [TESTING MODE] Resend Registration OTP:', otp, 'for email:', email);

    res.status(200).json({
      message: 'OTP resent successfully',
      otp: otp // TESTING: Include OTP in response (remove in production)
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP. Please try again.' });
  }
}));

// Logout user (log event)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // Log logout event
  await req.activityLogger.logAuth(req, 'logout', req.user.id, req.user.username, true);
  
  res.json({ message: 'Logout successful' });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await database.getUserByUsername(username);
  if (!user) {
    await req.activityLogger.log(req, 'login_failure', {
      username,
      torrentName: 'reason:user_not_found'
    });
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isValidPassword = await database.verifyPassword(password, user.password);
  if (!isValidPassword) {
    await req.activityLogger.log(req, 'login_failure', {
      userId: user.id,
      username: user.username,
      torrentName: 'reason:invalid_password'
    });
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Check if account is disabled
  if (user.is_active === 0) {
    await req.activityLogger.logSecurity(req, 'disabled_account_access', {
      userId: user.id,
      username: user.username
    });
    return res.status(403).json({ error: 'Account is disabled. Please contact support.' });
  }

  // For admin users, send OTP instead of immediate login
  if (user.role === 'admin') {
    try {
      // Generate OTP
      const otp = generateOTP();
      const adminEmail = process.env.ADMIN_EMAIL || user.email;

      // Store OTP in database (5 minutes expiry for admin)
      await database.createOTP(adminEmail, otp);

      // Send OTP email
      // COMMENTED OUT: SMTP blocked on Digital Ocean
      // await emailService.sendAdminLoginOTP(adminEmail, otp);

      console.log(`🔐 [TESTING MODE] Admin OTP:`, otp, 'for email:', adminEmail);

      return res.status(200).json({
        requiresOTP: true,
        message: 'Admin verification required. OTP sent to your email.',
        email: adminEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Partially hide email
        otp: otp // TESTING: Include OTP in response (remove in production)
      });
    } catch (error) {
      console.error('Failed to send admin OTP:', error);
      return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    }
  }

  // Regular user login (no OTP)
  const token = generateToken(user.id);

  // Log successful login
  await req.activityLogger.logAuth(req, 'login', user.id, user.username, true);

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

// Forgot password - Step 1: Send OTP
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if user exists
    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'This email is not registered. Please check your email or sign up for a new account.'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in database with type 'password_reset'
    await database.createOTP(email, otp, { type: 'password_reset' });

    // Send OTP email
    // COMMENTED OUT: SMTP blocked on Digital Ocean
    // await emailService.sendPasswordResetOTP(email, otp);
    console.log('🔐 [TESTING MODE] Password Reset OTP:', otp, 'for email:', email);

    // Log password reset request
    await req.activityLogger.log(req, 'password_reset_request', {
      torrentName: `email:${email}`
    });

    res.status(200).json({
      message: 'Password reset code sent to your email.',
      email: email,
      otp: otp // TESTING: Include OTP in response (remove in production)
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // COMMENTED OUT: Email service check not needed
    // if (error.message.includes('Email service not configured')) {
    //   return res.status(503).json({ error: 'Email service is not available. Please contact administrator.' });
    // }
    res.status(500).json({ error: 'Failed to generate password reset code. Please try again.' });
  }
}));

// Verify password reset OTP - Step 2
router.post('/verify-reset-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    // Get OTP from database (password_reset type only)
    const storedOTP = await database.getOTPByEmail(email, 'password_reset');

    if (!storedOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      await req.activityLogger.log(req, 'password_reset_otp_failure', {
        torrentName: `email:${email}`,
        magnetLink: 'reason:invalid_otp'
      });
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    // Mark OTP as verified
    await database.markOTPAsVerified(storedOTP.id);

    // Log successful reset OTP verification
    await req.activityLogger.log(req, 'password_reset_otp_success', {
      torrentName: `email:${email}`
    });

    res.status(200).json({
      message: 'OTP verified successfully. You can now reset your password.',
      verified: true
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
}));

// Reset password - Step 3
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if there's a verified OTP for password reset
    const storedOTP = await database.getVerifiedOTPByEmail(email, 'password_reset');

    if (!storedOTP) {
      return res.status(400).json({ error: 'OTP not verified. Please verify your OTP first.' });
    }

    // Reset password
    const updated = await database.resetUserPassword(email, newPassword);

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete the OTP after successful password reset to prevent reuse
    await database.deleteOTP(storedOTP.id);

    // Log password reset completion
    // We don't have user ID easily here without extra query, so just log email
    await req.activityLogger.log(req, 'password_reset_complete', {
      torrentName: `email:${email}`
    });

    res.status(200).json({
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
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

  // Log subscription view
  await req.activityLogger.log(req, 'subscription_view', {
    torrentName: activeSubscription ? activeSubscription.plan : 'none',
    fileSize: daysUntilExpiry || 0
  });

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