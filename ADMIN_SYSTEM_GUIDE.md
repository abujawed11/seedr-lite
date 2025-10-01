# 🛡️ Admin Control System - Complete Guide

## 📋 Overview

Your Seedr-Lite application now has a comprehensive admin control system with:
- **Upgrade Request Management**: Users submit requests with personal details for admin approval
- **Full User Management**: Control quotas, limits, enable/disable users
- **Admin Dashboard**: Beautiful control panel with stats and management tools

---

## 🏗️ System Architecture

### Backend Components

#### 1. Database Schema (`src/models/database.js`)

**Enhanced Users Table:**
```sql
users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  storage_quota INTEGER DEFAULT 5368709120,
  storage_used INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free',
  role TEXT DEFAULT 'user',              -- NEW: 'user' or 'admin'
  max_concurrent_downloads INTEGER DEFAULT 2,  -- NEW: Admin controllable
  is_active INTEGER DEFAULT 1,           -- NEW: Enable/disable users
  created_at DATETIME,
  updated_at DATETIME
)
```

**New Upgrade Requests Table:**
```sql
upgrade_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  target_plan TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'pending',  -- pending, approved, rejected
  admin_notes TEXT,
  requested_at DATETIME,
  processed_at DATETIME,
  processed_by TEXT,              -- Admin user ID who processed
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

#### 2. Admin Middleware (`src/middlewares/adminAuth.js`)

Protects admin routes by checking:
1. User is authenticated
2. User has `role = 'admin'`

```javascript
router.use(authenticateToken);
router.use(requireAdmin);
```

#### 3. Admin Routes (`src/routes/admin.js`)

**User Management:**
- `GET /api/admin/users` - List all users with storage info
- `GET /api/admin/users/:userId` - Get single user details
- `PUT /api/admin/users/:userId/quota` - Update quota, plan, max downloads
- `PUT /api/admin/users/:userId/status` - Enable/disable user
- `PUT /api/admin/users/:userId/max-downloads` - Update concurrent download limit
- `DELETE /api/admin/users/:userId` - Delete user (except admins)

**Upgrade Request Management:**
- `GET /api/admin/upgrade-requests` - List all requests (filter by status)
- `GET /api/admin/upgrade-requests/:requestId` - Get single request
- `POST /api/admin/upgrade-requests/:requestId/approve` - Approve request
- `POST /api/admin/upgrade-requests/:requestId/reject` - Reject request

**Dashboard:**
- `GET /api/admin/stats` - System statistics

#### 4. User Upgrade Flow (`src/routes/plans.js`)

- `POST /api/plans/upgrade-request` - Submit upgrade request (requires form data)
- `GET /api/plans/my-requests` - User's own upgrade requests

### Frontend Components

#### 1. Updated PlansModal (`src/components/PlansModal.jsx`)

**Two-Step Upgrade Process:**
1. User selects plan
2. Form appears requesting:
   - Full Name
   - Email Address
   - Phone Number
   - Complete Address
3. Request submitted to admin for approval

#### 2. Admin Dashboard (`src/pages/AdminDashboard.jsx`)

**Three Main Tabs:**

**📊 Dashboard Tab:**
- Total users (active/inactive count)
- Storage allocation vs usage
- Pending upgrade requests count
- Users by plan distribution

**👥 Users Tab:**
- Complete user list in table format
- Shows: username, email, plan, storage usage, max downloads, status
- Actions: Edit, Enable/Disable, Delete
- Edit modal allows changing quota, plan, and download limits

**📝 Upgrade Requests Tab:**
- Pending requests shown first (highlighted)
- Full user details visible (name, email, phone, address)
- One-click approve/reject with admin notes
- Processed requests shown below

---

## 🚀 Setup & Configuration

### 1. Create First Admin User

**Option A: Manual Database Update**
```bash
# Access your SQLite database
sqlite3 seedr-server/data/users.db

# Update existing user to admin
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

**Option B: Via Registration (Recommended)**
1. Register a new account normally
2. Use Option A to upgrade it to admin
3. First admin created!

### 2. Start the System

```bash
# Backend
cd seedr-server
npm run dev

# Frontend (separate terminal)
cd seedr-web
npm run dev
```

---

## 👤 User Flow

### Requesting an Upgrade

1. Click **"⬆️ Upgrade"** button in header
2. Browse available plans
3. Click **"Request [Plan Name]"** on desired plan
4. Fill out the request form:
   - Full Name *
   - Email Address *
   - Phone Number *
   - Complete Address *
5. Click **"Submit Request"**
6. Success! Admin will review the request

### Viewing Request Status

Users can check their request status via:
```javascript
GET /api/plans/my-requests
```

Response includes:
- Request ID
- Target plan details
- Status (pending/approved/rejected)
- Submission date
- Admin notes (if processed)

---

## 👨‍💼 Admin Flow

### Accessing Admin Dashboard

1. Login as admin user
2. Look for **"ADMIN"** badge next to username
3. Click **"🛡️ Admin Panel"** button
4. Dashboard opens in full screen

### Managing Users

**View All Users:**
- Navigate to **"👥 Users"** tab
- See complete list with storage usage and status

**Edit User:**
1. Click **"Edit"** button on user row
2. Modal opens with options:
   - Select Plan (Free/Basic/Pro/Premium)
   - Set Storage Quota (in GB)
   - Set Max Concurrent Downloads (1-50)
3. Click **"Save Changes"**
4. User's quota updates immediately

**Enable/Disable User:**
1. Click **"Disable"** or **"Enable"** button
2. Confirm action
3. Disabled users cannot login or download

**Delete User:**
1. Click **"Delete"** button (only for non-admin users)
2. Confirm deletion
3. User and their data are removed
4. ⚠️ **Cannot be undone!**

### Processing Upgrade Requests

**Approve Request:**
1. Navigate to **"📝 Upgrade Requests"** tab
2. Review pending request details:
   - User information
   - Current plan vs requested plan
   - Contact details
3. Click **"✅ Approve"** button
4. Confirm approval
5. User's plan upgrades automatically
6. Request marked as approved

**Reject Request:**
1. Click **"❌ Reject"** button
2. Enter rejection reason
3. Confirm rejection
4. User notified (via request status)
5. Request marked as rejected with admin notes

---

## 🔧 Customization

### Modify Plan Limits

Edit `seedr-server/src/config/plans.js`:

```javascript
pro: {
  id: 'pro',
  name: 'Pro',
  storage: 200 * 1024 * 1024 * 1024, // Change to 200 GB
  price: 14.99, // Update price
  features: [
    '200 GB storage',
    'Your custom features'
  ],
  maxConcurrentDownloads: 15, // Increase limit
  color: 'purple'
}
```

### Add New Plan Tier

1. Add to `src/config/plans.js`:
```javascript
enterprise: {
  id: 'enterprise',
  name: 'Enterprise',
  storage: 1000 * 1024 * 1024 * 1024, // 1 TB
  price: 49.99,
  features: [
    '1 TB storage',
    'Dedicated support',
    'API access'
  ],
  maxConcurrentDownloads: -1, // Unlimited
  color: 'indigo'
}
```

2. Add color gradient in `PlansModal.jsx`:
```javascript
const colors = {
  indigo: 'from-indigo-600 to-indigo-700'
};
```

3. Restart backend server

### Customize Request Form Fields

Edit `seedr-web/src/components/PlansModal.jsx`:

1. Add new field to state:
```javascript
const [formData, setFormData] = useState({
  fullName: '',
  email: '',
  phone: '',
  address: '',
  company: '' // NEW FIELD
});
```

2. Add input in form JSX:
```jsx
<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Company Name (Optional)
  </label>
  <input
    type="text"
    name="company"
    value={formData.company}
    onChange={handleFormChange}
    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
  />
</div>
```

3. Update database schema in `database.js`:
```sql
ALTER TABLE upgrade_requests ADD COLUMN company TEXT;
```

### Admin Email Notifications

To notify admins when new requests arrive, add to `plans.js`:

```javascript
// After creating request
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({ /* config */ });

await transporter.sendMail({
  to: 'admin@yourdomain.com',
  subject: 'New Upgrade Request',
  html: `User ${user.username} requested upgrade to ${targetPlan.name}`
});
```

### User Email Notifications

Notify users when requests are processed:

```javascript
// In admin approve/reject handlers
await transporter.sendMail({
  to: request.email,
  subject: `Upgrade Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
  html: status === 'approved'
    ? `Congratulations! Your upgrade to ${targetPlan.name} has been approved.`
    : `Your upgrade request was rejected. Reason: ${adminNotes}`
});
```

---

## 🔐 Security Best Practices

### 1. Protect Admin Routes

Already implemented:
```javascript
router.use(authenticateToken);
router.use(requireAdmin);
```

### 2. Validate User Input

Add validation in request handlers:
```javascript
const { fullName, email, phone, address } = req.body;

if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  return res.status(400).json({ error: 'Invalid email format' });
}

if (phone.length < 10) {
  return res.status(400).json({ error: 'Invalid phone number' });
}
```

### 3. Audit Logging

Track admin actions:
```javascript
// Create audit_logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT,
  target_user_id TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

// Log all admin actions
await database.createAuditLog({
  adminId: req.user.id,
  action: 'APPROVE_UPGRADE',
  targetUserId: request.user_id,
  details: `Approved upgrade to ${targetPlan.name}`
});
```

### 4. Rate Limiting

Prevent abuse of upgrade requests:
```javascript
const rateLimit = require('express-rate-limit');

const upgradeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 requests per day
  message: 'Too many upgrade requests. Please try again tomorrow.'
});

router.post('/plans/upgrade-request', upgradeLimiter, authenticateToken, ...);
```

---

## 📊 Database Queries

### Useful Admin Queries

**Find users near quota limit:**
```sql
SELECT username, email, plan,
       storage_used / storage_quota * 100 as usage_percent
FROM users
WHERE storage_used / storage_quota > 0.9
ORDER BY usage_percent DESC;
```

**Pending requests older than 7 days:**
```sql
SELECT r.*, u.username
FROM upgrade_requests r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
  AND r.requested_at < datetime('now', '-7 days')
ORDER BY r.requested_at ASC;
```

**Most active users by storage:**
```sql
SELECT username, email, plan,
       ROUND(storage_used / 1024.0 / 1024 / 1024, 2) as used_gb
FROM users
WHERE is_active = 1
ORDER BY storage_used DESC
LIMIT 20;
```

**Upgrade request conversion rate:**
```sql
SELECT
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
  ROUND(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as approval_rate
FROM upgrade_requests;
```

---

## 🐛 Troubleshooting

### Admin Dashboard Not Accessible

**Issue:** "Access Denied" or 401 error

**Solution:**
1. Verify user has admin role:
```sql
SELECT username, role FROM users WHERE username = 'your_username';
```

2. If role is 'user', update it:
```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

3. Logout and login again to refresh token

### Upgrade Request Not Appearing

**Issue:** User submitted request but admin doesn't see it

**Solution:**
1. Check database:
```sql
SELECT * FROM upgrade_requests ORDER BY requested_at DESC LIMIT 5;
```

2. Verify API response:
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:5000/api/admin/upgrade-requests
```

3. Check browser console for errors

### User Can't Submit Multiple Requests

**Issue:** "You already have a pending upgrade request"

**Solution:** This is by design. Options:
1. Admin processes the pending request
2. Admin manually deletes old request:
```sql
DELETE FROM upgrade_requests WHERE id = 'request_id';
```

### Quota Update Fails

**Issue:** "User's current storage usage exceeds the new quota"

**Solution:**
1. Check user's current usage:
```sql
SELECT username, storage_used, storage_quota FROM users WHERE id = 'user_id';
```

2. User must delete files before downgrading
3. Or admin can force larger quota temporarily

---

## 🧪 Testing

### Test Workflow

**1. Create Test Users:**
```javascript
// Register 3-4 test accounts
POST /api/auth/register
{
  "username": "testuser1",
  "email": "test1@example.com",
  "password": "password123"
}
```

**2. Make One User Admin:**
```sql
UPDATE users SET role = 'admin' WHERE username = 'testuser1';
```

**3. Test User Flow:**
1. Login as regular user (testuser2)
2. Click Upgrade button
3. Select "Pro" plan
4. Fill form with dummy data
5. Submit request
6. Verify success message

**4. Test Admin Flow:**
1. Logout and login as admin (testuser1)
2. Click "Admin Panel" button
3. Navigate to "Upgrade Requests" tab
4. Verify request appears
5. Click "Approve"
6. Verify success

**5. Verify Upgrade:**
1. Logout and login as testuser2
2. Check quota in header
3. Should show Pro plan quota (100 GB)

### Automated Testing

Create test script `test-admin-system.js`:

```javascript
const axios = require('axios');
const API = 'http://localhost:5000/api';

async function runTests() {
  // 1. Register test user
  const registerRes = await axios.post(`${API}/auth/register`, {
    username: 'testuser_' + Date.now(),
    email: `test_${Date.now()}@example.com`,
    password: 'test123'
  });

  const userToken = registerRes.data.token;

  // 2. Submit upgrade request
  const requestRes = await axios.post(`${API}/plans/upgrade-request`, {
    planId: 'pro',
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    address: '123 Test St'
  }, {
    headers: { Authorization: `Bearer ${userToken}` }
  });

  console.log('✅ Upgrade request submitted:', requestRes.data.request.id);

  // 3. Get all requests as admin
  const adminToken = 'YOUR_ADMIN_TOKEN_HERE';
  const requestsRes = await axios.get(`${API}/admin/upgrade-requests`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  console.log('✅ Requests fetched:', requestsRes.data.requests.length);

  // 4. Approve request
  const approveRes = await axios.post(
    `${API}/admin/upgrade-requests/${requestRes.data.request.id}/approve`,
    { adminNotes: 'Approved via automated test' },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  console.log('✅ Request approved');
  console.log('\n🎉 All tests passed!');
}

runTests().catch(console.error);
```

---

## 📝 API Reference

### Admin Endpoints

All admin endpoints require:
- `Authorization: Bearer {admin_token}` header
- User with `role = 'admin'`

#### Get All Users
```
GET /api/admin/users
Response: { users: [...] }
```

#### Update User Quota
```
PUT /api/admin/users/:userId/quota
Body: {
  "quota": 107374182400,  // bytes
  "plan": "pro",
  "maxDownloads": 10
}
Response: { message: "...", user: {...} }
```

#### Approve Upgrade Request
```
POST /api/admin/upgrade-requests/:requestId/approve
Body: {
  "adminNotes": "Approved - payment received"
}
Response: { message: "...", request: {...}, user: {...} }
```

### User Endpoints

#### Submit Upgrade Request
```
POST /api/plans/upgrade-request
Headers: { Authorization: Bearer {token} }
Body: {
  "planId": "pro",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City, State 12345"
}
Response: {
  "message": "...",
  "request": { id, targetPlan, status },
  "info": "..."
}
```

#### Get My Requests
```
GET /api/plans/my-requests
Headers: { Authorization: Bearer {token} }
Response: {
  "requests": [
    {
      id, target_plan, status,
      full_name, email, phone, address,
      requested_at, processed_at, admin_notes,
      plan_details: {...}
    }
  ]
}
```

---

## 🎯 Next Steps

### Recommended Enhancements

1. **Payment Integration**
   - Add Stripe/PayPal to charge users
   - Auto-approve after successful payment

2. **Email Notifications**
   - Notify admin when request submitted
   - Notify user when request processed

3. **Request Comments**
   - Allow admin-user communication on requests
   - Add comments table and UI

4. **Usage Analytics**
   - Track user download patterns
   - Generate usage reports

5. **Bulk Operations**
   - Select multiple users
   - Batch quota updates

6. **Request Expiration**
   - Auto-reject requests after X days
   - Scheduled cleanup job

---

## 💡 Pro Tips

1. **Regular Backups:** Backup your database regularly
   ```bash
   cp seedr-server/data/users.db seedr-server/data/users.db.backup
   ```

2. **Monitor Pending Requests:** Set up admin alerts for requests older than 3 days

3. **User Communication:** Add a message when rejecting to explain why

4. **Plan Trials:** Create time-limited trial plans to test features

5. **Storage Warnings:** Email users when approaching 90% quota

---

**Need help?** Check the code comments or open an issue on GitHub!
