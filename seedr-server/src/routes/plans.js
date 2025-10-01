const express = require('express');
const database = require('../models/database');
const { authenticateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const { PLANS, getPlan, getAllPlans, canUpgradeTo } = require('../config/plans');

const router = express.Router();

// Get all available plans
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = getAllPlans();
  res.json({ plans });
}));

// Get current user's plan
router.get('/plans/current', authenticateToken, asyncHandler(async (req, res) => {
  const user = await database.getUserById(req.user.id);
  const currentPlan = getPlan(user.plan);

  res.json({
    plan: currentPlan,
    currentUsage: user.storage_used,
    availableSpace: user.storage_quota - user.storage_used
  });
}));

// Request plan upgrade (can be set to require approval)
router.post('/plans/upgrade', authenticateToken, asyncHandler(async (req, res) => {
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: 'Plan ID is required' });
  }

  const targetPlan = getPlan(planId);
  if (!PLANS[planId]) {
    return res.status(400).json({ error: 'Invalid plan ID' });
  }

  const user = await database.getUserById(req.user.id);
  const currentPlan = user.plan || 'free';

  // Check if upgrade is valid
  if (!canUpgradeTo(currentPlan, planId)) {
    return res.status(400).json({
      error: 'Cannot downgrade or upgrade to same plan',
      currentPlan,
      targetPlan: planId
    });
  }

  // Check if user's current usage exceeds new plan quota
  if (user.storage_used > targetPlan.storage) {
    return res.status(400).json({
      error: 'Your current storage usage exceeds the target plan quota',
      currentUsage: user.storage_used,
      planQuota: targetPlan.storage,
      message: 'Please delete some files before upgrading to this plan'
    });
  }

  // OPTION 1: Instant upgrade (no payment integration)
  // TODO: Add payment integration here if needed
  console.log(`💳 User ${user.id} upgrading from ${currentPlan} to ${planId}`);

  // Update user's plan and quota
  await database.updateUserQuota(user.id, targetPlan.storage);
  await database.updateUserPlan(user.id, planId);

  console.log(`✅ User ${user.username} upgraded to ${targetPlan.name} (${targetPlan.storage / (1024*1024*1024)} GB)`);

  // Get updated user data
  const updatedUser = await database.getUserById(user.id);

  res.json({
    message: `Successfully upgraded to ${targetPlan.name} plan`,
    plan: targetPlan,
    newQuota: targetPlan.storage,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      storageQuota: updatedUser.storage_quota,
      storageUsed: updatedUser.storage_used,
      remainingQuota: updatedUser.remaining_quota,
      plan: updatedUser.plan
    }
  });
}));

// Admin: Update any user's quota (requires admin auth)
router.put('/admin/quota/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { quota, plan } = req.body;

  // TODO: Add admin role check here
  // if (!req.user.isAdmin) {
  //   return res.status(403).json({ error: 'Admin access required' });
  // }

  if (quota) {
    await database.updateUserQuota(userId, quota);
  }

  if (plan) {
    await database.updateUserPlan(userId, plan);
  }

  const updatedUser = await database.getUserById(userId);

  res.json({
    message: 'User quota updated successfully',
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      storageQuota: updatedUser.storage_quota,
      storageUsed: updatedUser.storage_used,
      plan: updatedUser.plan
    }
  });
}));

module.exports = router;
