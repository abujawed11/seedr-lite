const express = require('express');
const database = require('../models/database');
const { authenticateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const { PLANS, getPlan, getAllPlans, canUpgradeTo } = require('../config/plans');

const router = express.Router();

// Get all available plans
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = getAllPlans();
  
  // Log plans view (low priority)
  // Check if req.activityLogger exists (it should via middleware)
  if (req.activityLogger) {
    // User might be anonymous here if route is public?
    // Route definition: app.use('/api', plansRoutes);
    // plansRoutes: router.get('/plans', ...);
    // It does NOT use authenticateToken. So user might be null.
    await req.activityLogger.log(req, 'plans_view', {
      fileSize: plans.length
    });
  }

  res.json({ plans });
}));

// Get current user's plan
router.get('/plans/current', authenticateToken, asyncHandler(async (req, res) => {
  const user = await database.getUserById(req.user.id);
  const currentPlan = getPlan(user.plan);

  // Log current plan view
  await req.activityLogger.log(req, 'current_plan_view', {
    torrentName: currentPlan.name
  });

  res.json({
    plan: currentPlan,
    currentUsage: user.storage_used,
    availableSpace: user.storage_quota - user.storage_used
  });
}));

// Submit upgrade request (requires admin approval)
router.post('/plans/upgrade-request', authenticateToken, asyncHandler(async (req, res) => {
  const { planId, duration, fullName, email, phone, address } = req.body;

  // Validate required fields
  if (!planId || !fullName || !email || !phone || !address) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['planId', 'fullName', 'email', 'phone', 'address']
    });
  }

  // Validate duration
  const validDurations = ['monthly', 'yearly'];
  const requestDuration = duration || 'monthly';
  if (!validDurations.includes(requestDuration)) {
    return res.status(400).json({
      error: 'Invalid duration',
      validOptions: validDurations,
      provided: requestDuration
    });
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

  // Check if user already has a pending request
  const existingRequests = await database.getUserUpgradeRequests(user.id);
  const hasPendingRequest = existingRequests.some(r => r.status === 'pending');

  if (hasPendingRequest) {
    return res.status(400).json({
      error: 'You already have a pending upgrade request',
      message: 'Please wait for admin approval or cancellation of your existing request'
    });
  }

  // Check if user's current usage exceeds new plan quota
  if (user.storage_used > targetPlan.storage) {
    return res.status(400).json({
      error: 'Your current storage usage exceeds the target plan quota',
      currentUsage: user.storage_used,
      planQuota: targetPlan.storage,
      message: 'Please delete some files before requesting this plan upgrade'
    });
  }

  // Create upgrade request
  const request = await database.createUpgradeRequest({
    userId: user.id,
    targetPlan: planId,
    duration: requestDuration,
    fullName,
    email,
    phone,
    address
  });

  console.log(`📝 Upgrade request created: ${user.username} → ${targetPlan.name} (${requestDuration})`);

  // Log upgrade request
  await req.activityLogger.log(req, 'upgrade_request_submit', {
    torrentName: targetPlan.name,
    magnetLink: `duration:${requestDuration}`,
    filePath: `request_id:${request.id}`
  });

  res.json({
    message: 'Upgrade request submitted successfully',
    request: {
      id: request.id,
      targetPlan: targetPlan,
      duration: requestDuration,
      status: 'pending',
      requestedAt: new Date()
    },
    info: 'Your request will be reviewed by an administrator. You will be notified once it is processed.'
  });
}));

// Get user's own upgrade requests
router.get('/plans/my-requests', authenticateToken, asyncHandler(async (req, res) => {
  const requests = await database.getUserUpgradeRequests(req.user.id);

  // Enrich with plan details
  const enrichedRequests = requests.map(r => ({
    ...r,
    plan_details: getPlan(r.target_plan)
  }));

  // Log requests view
  await req.activityLogger.log(req, 'upgrade_requests_view', {
    fileSize: requests.length
  });

  res.json({ requests: enrichedRequests });
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
