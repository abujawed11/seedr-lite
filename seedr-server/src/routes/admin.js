// Admin control panel routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');
const asyncHandler = require('../middlewares/asyncHandler');
const database = require('../models/database');
const { getAllPlans, getPlan } = require('../config/plans');

// All admin routes require authentication + admin role
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== User Management ====================

// Get all users
router.get('/users', asyncHandler(async (req, res) => {
  const users = await database.getAllUsers();

  // Get reservation info for each user
  const usersWithReservations = await Promise.all(
    users.map(async (user) => {
      const reservedBytes = await database.reservations.getUserReservedBytes(user.id);
      return {
        ...user,
        reserved_bytes: reservedBytes,
        effective_available: user.storage_quota - user.storage_used - reservedBytes
      };
    })
  );

  res.json({ users: usersWithReservations });
}));

// Get single user details
router.get('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await database.getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const reservedBytes = await database.reservations.getUserReservedBytes(userId);
  const upgradeRequests = await database.getUserUpgradeRequests(userId);

  res.json({
    user: {
      ...user,
      reserved_bytes: reservedBytes,
      effective_available: user.storage_quota - user.storage_used - reservedBytes
    },
    upgrade_requests: upgradeRequests
  });
}));

// Update user quota and plan
router.put('/users/:userId/quota', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { quota, plan, maxDownloads } = req.body;

  if (!quota || !plan || maxDownloads === undefined) {
    return res.status(400).json({ error: 'Missing required fields: quota, plan, maxDownloads' });
  }

  const targetPlan = getPlan(plan);
  if (!targetPlan) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user's current usage exceeds new quota
  if (user.storage_used > quota) {
    return res.status(400).json({
      error: `User's current storage usage (${user.storage_used} bytes) exceeds the new quota (${quota} bytes)`,
      current_usage: user.storage_used,
      requested_quota: quota
    });
  }

  await database.adminUpdateUserQuotaAndPlan(userId, quota, plan, maxDownloads);

  res.json({
    message: 'User quota and plan updated successfully',
    user: await database.getUserById(userId)
  });
}));

// Update user status (enable/disable)
router.put('/users/:userId/status', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({ error: 'Missing required field: isActive' });
  }

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await database.updateUserStatus(userId, isActive);

  res.json({
    message: `User ${isActive ? 'enabled' : 'disabled'} successfully`,
    user: await database.getUserById(userId)
  });
}));

// Update user max concurrent downloads
router.put('/users/:userId/max-downloads', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { maxDownloads } = req.body;

  if (maxDownloads === undefined) {
    return res.status(400).json({ error: 'Missing required field: maxDownloads' });
  }

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await database.updateUserMaxDownloads(userId, maxDownloads);

  res.json({
    message: 'User max concurrent downloads updated successfully',
    user: await database.getUserById(userId)
  });
}));

// Delete user
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Don't allow deleting admin users
  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete admin users' });
  }

  await database.deleteUser(userId);

  res.json({ message: 'User deleted successfully', deletedUserId: userId });
}));

// ==================== Upgrade Request Management ====================

// Get all upgrade requests (with optional status filter)
router.get('/upgrade-requests', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const requests = await database.getAllUpgradeRequests(status || null);

  res.json({ requests });
}));

// Get single upgrade request
router.get('/upgrade-requests/:requestId', asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const request = await database.getUpgradeRequestById(requestId);

  if (!request) {
    return res.status(404).json({ error: 'Upgrade request not found' });
  }

  res.json({ request });
}));

// Approve upgrade request
router.post('/upgrade-requests/:requestId/approve', asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { adminNotes } = req.body;

  const request = await database.getUpgradeRequestById(requestId);

  if (!request) {
    return res.status(404).json({ error: 'Upgrade request not found' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Request already ${request.status}` });
  }

  const targetPlan = getPlan(request.target_plan);
  if (!targetPlan) {
    return res.status(400).json({ error: 'Invalid target plan' });
  }

  const user = await database.getUserById(request.user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user's current usage exceeds target plan
  if (user.storage_used > targetPlan.storage) {
    return res.status(400).json({
      error: `User's current storage usage exceeds the target plan quota`,
      current_usage: user.storage_used,
      target_quota: targetPlan.storage
    });
  }

  // Update user's plan and quota
  await database.adminUpdateUserQuotaAndPlan(
    request.user_id,
    targetPlan.storage,
    request.target_plan,
    targetPlan.maxConcurrentDownloads
  );

  // Mark request as approved
  await database.updateUpgradeRequestStatus(requestId, 'approved', req.user.id, adminNotes);

  res.json({
    message: 'Upgrade request approved successfully',
    request: await database.getUpgradeRequestById(requestId),
    user: await database.getUserById(request.user_id)
  });
}));

// Reject upgrade request
router.post('/upgrade-requests/:requestId/reject', asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { adminNotes } = req.body;

  const request = await database.getUpgradeRequestById(requestId);

  if (!request) {
    return res.status(404).json({ error: 'Upgrade request not found' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Request already ${request.status}` });
  }

  // Mark request as rejected
  await database.updateUpgradeRequestStatus(requestId, 'rejected', req.user.id, adminNotes);

  res.json({
    message: 'Upgrade request rejected successfully',
    request: await database.getUpgradeRequestById(requestId)
  });
}));

// ==================== Dashboard Stats ====================

router.get('/stats', asyncHandler(async (req, res) => {
  const users = await database.getAllUsers();
  const allRequests = await database.getAllUpgradeRequests();
  const pendingRequests = allRequests.filter(r => r.status === 'pending');

  const stats = {
    total_users: users.length,
    active_users: users.filter(u => u.is_active === 1).length,
    total_storage_allocated: users.reduce((sum, u) => sum + u.storage_quota, 0),
    total_storage_used: users.reduce((sum, u) => sum + u.storage_used, 0),
    pending_upgrade_requests: pendingRequests.length,
    total_upgrade_requests: allRequests.length,
    users_by_plan: {
      free: users.filter(u => u.plan === 'free').length,
      basic: users.filter(u => u.plan === 'basic').length,
      pro: users.filter(u => u.plan === 'pro').length,
      premium: users.filter(u => u.plan === 'premium').length
    }
  };

  res.json({ stats });
}));

module.exports = router;
