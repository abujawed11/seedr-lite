# 📊 Quota Upgrade System - Complete Guide

## 🎯 Overview

Your Seedr-Lite application now has a complete quota upgrade system that allows users to upgrade their storage plans!

## 🏗️ Architecture

### Backend Components

1. **`src/config/plans.js`** - Plan Definitions
   - Defines 4 tiers: Free (5GB), Basic (25GB), Pro (100GB), Premium (500GB)
   - Includes pricing, features, and concurrent download limits
   - Helper functions for plan management

2. **`src/routes/plans.js`** - Plan API Endpoints
   - `GET /api/plans` - Get all available plans
   - `GET /api/plans/current` - Get user's current plan details
   - `POST /api/plans/upgrade` - Upgrade to a new plan
   - `PUT /api/admin/quota/:userId` - Admin endpoint to manually update quotas

3. **`src/models/database.js`** - Database Layer
   - Added `updateUserPlan(userId, plan)` method
   - Existing `updateUserQuota(userId, quota)` method

### Frontend Components

1. **`src/components/PlansModal.jsx`** - Upgrade UI
   - Beautiful modal with plan cards
   - Shows current plan, features, and pricing
   - Handles instant upgrades

2. **`src/api.js`** - API Functions
   - `getPlans()` - Fetch all plans
   - `getCurrentPlan()` - Get user's current plan
   - `upgradePlan(planId)` - Upgrade to new plan

3. **`src/App.jsx`** - Integration
   - Added "Upgrade" button in header
   - Integrated PlansModal
   - Auto-refreshes quota after upgrade

## 📝 Plan Tiers

| Plan | Storage | Price/Month | Max Downloads | Features |
|------|---------|-------------|---------------|----------|
| **Free** | 5 GB | $0 | 2 concurrent | Basic features |
| **Basic** | 25 GB | $4.99 | 5 concurrent | Priority support, faster speed |
| **Pro** | 100 GB | $9.99 | 10 concurrent | Max speed, advanced features |
| **Premium** | 500 GB | $19.99 | Unlimited | 24/7 support, custom integrations |

## 🚀 Usage

### For Users

1. Click the **"⬆️ Upgrade"** button in the header
2. Browse available plans
3. Click **"Upgrade to [Plan Name]"** on desired plan
4. Upgrade is instant - no payment integration yet
5. Storage quota updates immediately

### For Admins

#### Option 1: Let users self-upgrade (current setup)
- Users can upgrade themselves instantly
- No approval needed
- Good for testing/development

#### Option 2: Manual quota management
Use the admin endpoint to manually set quotas:

```bash
# Update user's quota to 50GB
curl -X PUT http://localhost:5000/api/admin/quota/USER_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quota": 53687091200, "plan": "pro"}'
```

#### Option 3: Modify plans
Edit `src/config/plans.js` to customize:
- Storage amounts
- Pricing
- Features
- Concurrent download limits
- Add/remove plans

## 🔧 Customization

### Change Plan Limits

Edit `seedr-server/src/config/plans.js`:

```javascript
basic: {
  id: 'basic',
  name: 'Basic',
  storage: 50 * 1024 * 1024 * 1024, // Change to 50 GB
  price: 9.99, // Change price
  features: [
    '50 GB storage',
    'Your custom feature'
  ],
  maxConcurrentDownloads: 10,
  color: 'blue'
}
```

### Add Payment Integration

To integrate Stripe/PayPal, modify `seedr-server/src/routes/plans.js`:

```javascript
router.post('/plans/upgrade', authenticateToken, asyncHandler(async (req, res) => {
  const { planId, paymentToken } = req.body;

  // Add payment processing here
  const paymentResult = await stripe.charges.create({
    amount: targetPlan.price * 100,
    currency: 'usd',
    source: paymentToken
  });

  if (paymentResult.status === 'succeeded') {
    // Update user's plan
    await database.updateUserQuota(user.id, targetPlan.storage);
    await database.updateUserPlan(user.id, planId);
  }
}));
```

### Add Approval System

To require admin approval before upgrades:

1. Create upgrade requests table:
```sql
CREATE TABLE upgrade_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  target_plan TEXT,
  status TEXT DEFAULT 'pending',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

2. Modify upgrade endpoint to create request instead of instant upgrade
3. Create admin dashboard to approve/reject requests

### Limit Plan Features

To enforce concurrent download limits, modify `seedr-server/src/services/torrentManager.js`:

```javascript
async function addMagnet(magnet, userId) {
  const user = await database.getUserById(userId);
  const userPlan = getPlan(user.plan);
  const activeTorrents = await listTorrents(userId);

  if (userPlan.maxConcurrentDownloads !== -1 &&
      activeTorrents.length >= userPlan.maxConcurrentDownloads) {
    throw new Error(`Plan limit: ${userPlan.maxConcurrentDownloads} concurrent downloads`);
  }

  // Continue with adding torrent...
}
```

## 🎨 UI Customization

### Change Plan Colors

In `src/components/PlansModal.jsx`, modify the color mapping:

```javascript
const getPlanColor = (color) => {
  const colors = {
    gray: 'from-gray-600 to-gray-700',
    blue: 'from-blue-600 to-blue-700',
    purple: 'from-purple-600 to-purple-700',
    gold: 'from-yellow-500 to-yellow-600',
    // Add your custom colors
    emerald: 'from-emerald-600 to-emerald-700'
  };
  return colors[color] || colors.gray;
};
```

### Show Plan Badge on Header

Add user's plan badge next to username in `App.jsx`:

```jsx
<div className="text-sm text-gray-300">
  Welcome, <span className="text-yellow-400 font-medium">{user?.username}</span>
  <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
    {user?.plan || 'free'}
  </span>
</div>
```

## 📊 Database Schema

The system uses existing database structure:

```sql
users (
  id TEXT PRIMARY KEY,
  username TEXT,
  email TEXT,
  password TEXT,
  storage_quota INTEGER DEFAULT 5368709120, -- 5GB
  storage_used INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free',
  created_at DATETIME,
  updated_at DATETIME
)
```

## 🔐 Security Considerations

1. **Admin Endpoints**: Add role-based authentication
2. **Payment Validation**: Verify payment before upgrading
3. **Downgrade Protection**: Current implementation prevents downgrades
4. **Usage Validation**: Check if user's current usage fits target plan

## 🐛 Troubleshooting

### Upgrade button not showing
- Check that `PlansModal` is imported in App.jsx
- Verify frontend build completed: `npm run build`

### Plans not loading
- Check backend is running: `npm run dev` in seedr-server
- Verify route is registered in server.js
- Check browser console for API errors

### Quota not updating after upgrade
- Check `refreshUserProfile()` is called after upgrade
- Verify database method `updateUserQuota()` is working
- Check browser network tab for API responses

## 🎉 Testing

1. **Start backend**: `cd seedr-server && npm run dev`
2. **Start frontend**: `cd seedr-web && npm run dev`
3. **Login** with a test user
4. Click **"⬆️ Upgrade"** button
5. Select a plan and upgrade
6. Verify quota updates in header

## 📝 API Examples

### Get All Plans
```bash
curl http://localhost:5000/api/plans
```

### Get Current Plan
```bash
curl http://localhost:5000/api/plans/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Upgrade Plan
```bash
curl -X POST http://localhost:5000/api/plans/upgrade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": "pro"}'
```

## 🚀 Next Steps

1. **Add Payment Integration** - Integrate Stripe/PayPal
2. **Add Subscription System** - Recurring billing
3. **Add Plan Analytics** - Track upgrades and revenue
4. **Add Downgrades** - Allow users to downgrade plans
5. **Add Promo Codes** - Discount codes for marketing
6. **Add Referral System** - Reward users for referrals

## 💡 Tips

- Start with instant upgrades for testing
- Add payment integration when going to production
- Monitor user feedback on pricing
- Consider usage-based billing instead of tiers
- Offer annual plans with discounts

---

**Need help?** Check the code comments or reach out!
