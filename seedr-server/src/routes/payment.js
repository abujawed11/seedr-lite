const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const database = require('../models/database');
const { getPlan } = require('../config/plans');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// All payment routes require authentication
router.use(authenticateToken);

// ==================== Create Razorpay Order ====================

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order for plan upgrade
 */
router.post('/create-order', asyncHandler(async (req, res) => {
  const { planId, duration, currency } = req.body;

  if (!planId || !duration) {
    return res.status(400).json({ error: 'Missing required fields: planId, duration' });
  }

  // Validate duration
  if (!['monthly', 'yearly'].includes(duration)) {
    return res.status(400).json({ error: 'Invalid duration. Must be "monthly" or "yearly"' });
  }

  // Get plan details
  const plan = getPlan(planId);
  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  // Check if user already has this plan or higher
  const user = await database.getUserById(req.user.id);
  if (user.plan === planId) {
    return res.status(400).json({ error: 'You already have this plan' });
  }

  // Calculate amount based on plan price and duration
  let amountUSD = plan.price; // Monthly price

  if (duration === 'yearly') {
    // 20% discount for yearly subscription
    amountUSD = Math.round(plan.price * 12 * 0.8);
  }

  // Convert to smallest currency unit (paise for INR, cents for USD)
  const selectedCurrency = currency || 'INR';
  let amount;

  if (selectedCurrency === 'INR') {
    // Convert USD to INR (approximate rate: 1 USD = 83 INR)
    const amountINR = Math.round(amountUSD * 83);
    amount = amountINR * 100; // Convert to paise
  } else {
    // USD
    amount = Math.round(amountUSD * 100); // Convert to cents
  }

  try {
    // Create Razorpay order
    // Receipt max length is 40 characters
    const shortReceipt = `ord_${Date.now().toString().slice(-10)}`;

    const order = await razorpay.orders.create({
      amount: amount,
      currency: selectedCurrency,
      receipt: shortReceipt,
      notes: {
        user_id: req.user.id,
        username: req.user.username,
        plan_id: planId,
        duration: duration,
        plan_name: plan.name
      }
    });

    // Store order in database for tracking
    await database.createPaymentOrder({
      orderId: order.id,
      userId: req.user.id,
      planId: planId,
      duration: duration,
      amount: amount,
      currency: selectedCurrency,
      status: 'created'
    });

    // Log order creation
    await req.activityLogger.log(req, 'payment_order_created', {
      torrentName: `plan:${planId}`,
      magnetLink: `order_id:${order.id}`,
      fileSize: amount
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      key_id: process.env.RAZORPAY_KEY_ID, // Send key_id to frontend
      user: {
        name: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
}));

// ==================== Verify Payment ====================

/**
 * POST /api/payment/verify
 * Verifies Razorpay payment signature and activates subscription
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification parameters' });
  }

  try {
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      // Log failed verification
      await req.activityLogger.log(req, 'payment_verification_failed', {
        torrentName: `order_id:${razorpay_order_id}`,
        magnetLink: `payment_id:${razorpay_payment_id}`
      });

      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Fetch order from database
    const orderRecord = await database.getPaymentOrderByOrderId(razorpay_order_id);
    if (!orderRecord) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order already processed
    if (orderRecord.status === 'completed') {
      return res.status(400).json({ error: 'Order already processed' });
    }

    // Verify user
    if (orderRecord.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    // Get plan details
    const plan = getPlan(orderRecord.plan_id);
    if (!plan) {
      return res.status(500).json({ error: 'Invalid plan configuration' });
    }

    // Update user's plan and quota
    await database.adminUpdateUserQuotaAndPlan(
      req.user.id,
      plan.storage,
      orderRecord.plan_id,
      plan.maxConcurrentDownloads
    );

    // Activate subscription
    const subscription = await database.activateUserSubscription(
      req.user.id,
      orderRecord.plan_id,
      orderRecord.duration,
      req.user.id // Automated activation
    );

    // Update order status
    await database.updatePaymentOrderStatus(razorpay_order_id, 'completed', razorpay_payment_id);

    // Log successful payment
    await req.activityLogger.log(req, 'payment_success', {
      torrentName: `plan:${orderRecord.plan_id}`,
      magnetLink: `payment_id:${razorpay_payment_id}`,
      filePath: `order_id:${razorpay_order_id}`,
      fileSize: orderRecord.amount
    });

    console.log(`✅ Payment successful: User ${req.user.username} upgraded to ${orderRecord.plan_id} (${orderRecord.duration})`);

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      subscription: subscription,
      user: await database.getUserById(req.user.id)
    });
  } catch (error) {
    console.error('Payment verification error:', error);

    // Log verification error
    await req.activityLogger.log(req, 'payment_verification_error', {
      torrentName: `order_id:${razorpay_order_id}`,
      magnetLink: `error:${error.message}`
    });

    return res.status(500).json({ error: 'Payment verification failed' });
  }
}));

// ==================== Get Order Status ====================

/**
 * GET /api/payment/order/:orderId
 * Get payment order status
 */
router.get('/order/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await database.getPaymentOrderByOrderId(orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Verify user owns this order
  if (order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json({ order });
}));

// ==================== Get Payment History ====================

/**
 * GET /api/payment/history
 * Get user's payment history
 */
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const payments = await database.getUserPaymentHistory(req.user.id, parseInt(limit));

  res.json({
    payments,
    count: payments.length
  });
}));

module.exports = router;
