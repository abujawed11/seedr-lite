// Admin control panel routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/adminAuth');
const asyncHandler = require('../middlewares/asyncHandler');
const database = require('../models/database');
const { getAllPlans, getPlan } = require('../config/plans');
const subscriptionMonitor = require('../utils/subscriptionMonitor');
const { clearUserStorage, humanBytes } = require('../utils/storage');

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
  const { quota, plan, maxDownloads, forceDowngrade } = req.body;

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
    // If force downgrade is not enabled, return error with warning
    if (!forceDowngrade) {
      return res.status(400).json({
        error: 'USAGE_EXCEEDS_QUOTA',
        message: `User's current storage usage exceeds the new quota`,
        current_usage: user.storage_used,
        current_usage_formatted: formatBytes(user.storage_used),
        requested_quota: quota,
        requested_quota_formatted: formatBytes(quota),
        overage: user.storage_used - quota,
        overage_formatted: formatBytes(user.storage_used - quota),
        warning: 'User will not be able to download new files until they free up space.',
        suggestion: 'You can force this downgrade, but the user will be in "over-quota" state.'
      });
    }

    // Force downgrade allowed - user will be over quota
    console.log(`⚠️ FORCE DOWNGRADE: User ${user.username} (${userId}) will be ${formatBytes(user.storage_used - quota)} over quota`);
  }

  await database.adminUpdateUserQuotaAndPlan(userId, quota, plan, maxDownloads);

  const updatedUser = await database.getUserById(userId);
  const isOverQuota = updatedUser.storage_used > updatedUser.storage_quota;

  res.json({
    message: isOverQuota
      ? 'User quota updated (WARNING: User is now over quota and cannot download new files)'
      : 'User quota and plan updated successfully',
    user: updatedUser,
    over_quota: isOverQuota,
    overage: isOverQuota ? updatedUser.storage_used - updatedUser.storage_quota : 0,
    overage_formatted: isOverQuota ? formatBytes(updatedUser.storage_used - updatedUser.storage_quota) : '0 B'
  });
}));

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

// Clear/Empty user storage
router.delete('/users/:userId/storage', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Don't allow clearing storage for admin users
  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Cannot clear storage for admin users' });
  }

  // Get current storage info before clearing
  const storageInfoBefore = await database.getUserStorageInfo(userId);

  // Import torrentManager to remove active torrents
  const { getUserClient } = require('../services/torrentManager');

  try {
    // Get user's WebTorrent client and remove all active torrents
    const client = await getUserClient(userId);
    const userTorrents = client ? client.torrents : [];

    console.log(`🗑️ Removing ${userTorrents.length} active torrents for user ${userId}`);

    if (client && userTorrents.length > 0) {
      for (const torrent of userTorrents) {
        await new Promise((resolve, reject) => {
          client.remove(torrent.infoHash, { destroyStore: true }, (err) => {
            if (err) {
              console.error(`Failed to remove torrent ${torrent.infoHash}:`, err);
              reject(err);
            } else {
              console.log(`✅ Removed torrent: ${torrent.infoHash}`);
              resolve();
            }
          });
        });
      }
    }

    // Release all reservations for this user
    const userReservations = await database.getUserReservations(userId);
    console.log(`🗑️ Releasing ${userReservations.length} reservations for user ${userId}`);

    for (const reservation of userReservations) {
      await database.releaseReservation(userId, reservation.info_hash);
    }

    // Clear user's storage directory and reset storage_used
    const result = await clearUserStorage(userId);

    // Get updated storage info after clearing
    const storageInfoAfter = await database.getUserStorageInfo(userId);

    console.log(`✅ Admin ${req.user.username} cleared storage for user ${user.username} (${userId})`);

    res.json({
      message: 'User storage cleared successfully',
      user: {
        id: userId,
        username: user.username,
        email: user.email
      },
      cleared: {
        bytes: result.clearedBytes,
        formatted: humanBytes(result.clearedBytes),
        files: result.clearedFiles,
        torrentsRemoved: userTorrents.length,
        reservationsReleased: userReservations.length
      },
      storageBefore: {
        used: humanBytes(storageInfoBefore.storage_used),
        quota: humanBytes(storageInfoBefore.storage_quota),
        remaining: humanBytes(storageInfoBefore.remaining_quota)
      },
      storageAfter: {
        used: humanBytes(storageInfoAfter.storage_used),
        quota: humanBytes(storageInfoAfter.storage_quota),
        remaining: humanBytes(storageInfoAfter.remaining_quota)
      }
    });
  } catch (error) {
    console.error('Error clearing user storage:', error);
    throw error;
  }
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

  // Create subscription with expiry tracking
  const subscription = await database.activateUserSubscription(
    request.user_id,
    request.target_plan,
    request.duration || 'monthly',
    req.user.id
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

// ==================== Subscription Management ====================

// Get user's subscription details
router.get('/subscriptions/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const activeSubscription = await database.getUserActiveSubscription(userId);
  const subscriptionHistory = await database.getUserSubscriptionHistory(userId);
  const historyLog = await database.getUserSubscriptionHistoryLog(userId);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan
    },
    activeSubscription,
    subscriptionHistory,
    historyLog
  });
}));

// Manual subscription activation (for direct admin control)
router.post('/subscriptions/activate', asyncHandler(async (req, res) => {
  const { userId, plan, duration } = req.body;

  if (!userId || !plan || !duration) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['userId', 'plan', 'duration']
    });
  }

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const targetPlan = getPlan(plan);
  if (!targetPlan) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  // Update user's quota and plan
  await database.adminUpdateUserQuotaAndPlan(
    userId,
    targetPlan.storage,
    plan,
    targetPlan.maxConcurrentDownloads
  );

  // Create subscription
  const subscription = await database.activateUserSubscription(
    userId,
    plan,
    duration,
    req.user.id
  );

  console.log(`👑 Admin ${req.user.username} manually activated ${plan} (${duration}) for ${user.username}`);

  res.json({
    message: 'Subscription activated successfully',
    subscription,
    user: await database.getUserById(userId)
  });
}));

// Cancel active subscription
router.post('/subscriptions/:subscriptionId/cancel', asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { reason } = req.body;

  const subscription = await database.getUserActiveSubscription();
  if (!subscription || subscription.id !== subscriptionId) {
    return res.status(404).json({ error: 'Active subscription not found' });
  }

  await database.cancelSubscription(subscriptionId, req.user.id, reason);

  // Log the cancellation
  await database.createSubscriptionHistory({
    userId: subscription.user_id,
    subscriptionId,
    action: 'cancelled',
    planFrom: subscription.plan,
    planTo: 'free',
    duration: subscription.duration,
    reason: reason || 'Admin cancellation',
    performedBy: req.user.id
  });

  // Downgrade user to free plan
  await database.updateUserPlan(subscription.user_id, 'free');

  res.json({
    message: 'Subscription cancelled successfully',
    subscriptionId
  });
}));

// Get expired subscriptions that need attention
router.get('/subscriptions/expired', asyncHandler(async (req, res) => {
  const expiredSubscriptions = await database.getExpiredSubscriptions();

  res.json({
    expired: expiredSubscriptions,
    count: expiredSubscriptions.length
  });
}));

// Process expired subscriptions (manual trigger)
router.post('/subscriptions/process-expired', asyncHandler(async (req, res) => {
  const results = await database.downgradeExpiredUsers();

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  res.json({
    message: 'Expired subscriptions processing completed',
    results: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      details: results
    }
  });
}));

// Get subscription monitor status
router.get('/subscriptions/monitor/status', asyncHandler(async (req, res) => {
  const status = subscriptionMonitor.getStatus();
  res.json({ monitor: status });
}));

// Manually trigger subscription expiry check
router.post('/subscriptions/monitor/trigger', asyncHandler(async (req, res) => {
  await subscriptionMonitor.triggerCheck();
  res.json({ message: 'Manual subscription expiry check completed' });
}));

// ==================== Activity Log Management ====================

// Get all activity logs with pagination and filtering
router.get('/activity-logs', asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0, userId, actionType, search } = req.query;

  let logs;

  if (search) {
    // Search across all fields
    logs = await database.searchActivityLogs(search, parseInt(limit));
  } else if (userId) {
    // Filter by specific user
    logs = await database.getActivityLogsByUser(userId, parseInt(limit));
  } else if (actionType) {
    // Filter by action type
    logs = await database.getActivityLogsByActionType(actionType, parseInt(limit));
  } else {
    // Get all logs
    logs = await database.getAllActivityLogs(parseInt(limit), parseInt(offset));
  }

  res.json({
    logs,
    count: logs.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
}));

// Get activity logs for a specific user
router.get('/activity-logs/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const logs = await database.getActivityLogsByUser(userId, parseInt(limit));

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    logs,
    count: logs.length
  });
}));

// Delete a specific activity log entry
router.delete('/activity-logs/:logId', asyncHandler(async (req, res) => {
  const { logId } = req.params;

  const deleted = await database.deleteActivityLog(logId);

  if (!deleted) {
    return res.status(404).json({ error: 'Activity log not found' });
  }

  res.json({
    message: 'Activity log deleted successfully',
    logId
  });
}));

// Clear old activity logs (older than specified days)
router.post('/activity-logs/cleanup', asyncHandler(async (req, res) => {
  const { daysToKeep = 90 } = req.body;

  const deletedCount = await database.clearOldActivityLogs(parseInt(daysToKeep));

  console.log(`🧹 Admin ${req.user.username} cleared ${deletedCount} old activity logs (older than ${daysToKeep} days)`);

  res.json({
    message: `Cleared ${deletedCount} activity logs older than ${daysToKeep} days`,
    deletedCount,
    daysToKeep: parseInt(daysToKeep)
  });
}));

// Delete a user's file (from activity log context)
router.delete('/files/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'Missing file path' });
  }

  const user = await database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const fs = require('fs');
  const path = require('path');
  const { getUserStorageDir, updateUserStorageUsage } = require('../utils/storage');

  try {
    const userRoot = getUserStorageDir(userId);

    // Validate path to prevent directory traversal
    const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.resolve(userRoot, normalized);
    const resolvedRoot = path.resolve(userRoot);

    if (!fullPath.startsWith(resolvedRoot)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File or directory not found' });
    }

    const stat = fs.statSync(fullPath);
    const sizeBefore = stat.size;

    if (stat.isDirectory()) {
      // Remove directory recursively
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      // Remove file
      fs.unlinkSync(fullPath);
    }

    // Update user's storage usage after deletion
    await updateUserStorageUsage(userId, true);

    console.log(`🗑️ Admin ${req.user.username} deleted file for user ${user.username}: ${filePath}`);

    res.json({
      success: true,
      message: 'File deleted successfully',
      deletedFile: filePath,
      deletedSize: humanBytes(sizeBefore),
      type: stat.isDirectory() ? 'directory' : 'file'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
}));

module.exports = router;
