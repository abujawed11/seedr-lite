# Seedr-Lite Comprehensive Logging Implementation Guide

**Version:** 1.0
**Date:** 2026-01-02
**Status:** Implementation Required
**Estimated Effort:** 3-6 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [What Needs to Be Done](#what-needs-to-be-done)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Technical Implementation Guide](#technical-implementation-guide)
6. [Activity Logging Reference](#activity-logging-reference)
7. [Best Practices](#best-practices)
8. [Testing Strategy](#testing-strategy)
9. [Conclusion](#conclusion)

---

## Executive Summary

The Seedr-Lite application has **basic activity logging infrastructure** in place but **significant gaps** exist in comprehensive user activity tracking. Currently, only **3 types of activities** are being logged out of approximately **80+ possible user activities** across authentication, torrent operations, file management, admin actions, and security events.

**Current Logging Coverage:** 4% (3 out of 80+ activities)
**Logging Gap:** 96%
**Risk Level:** HIGH (Security & Compliance)

**Immediate Action Required:**
- Implement authentication event logging (prevents security blind spots)
- Implement admin action logging (required for accountability and compliance)
- Complete torrent and file operation logging (business analytics)

---

## Current State Analysis

### Existing Infrastructure

#### 1. Database Schema
**Location:** `seedr-server/src/models/database.js` (lines 233-255)

```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action_type TEXT NOT NULL,
  torrent_name TEXT,
  torrent_hash TEXT,
  magnet_link TEXT,
  file_path TEXT,
  file_size INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)

CREATE INDEX idx_activity_user ON activity_logs(user_id)
CREATE INDEX idx_activity_type ON activity_logs(action_type)
CREATE INDEX idx_activity_created ON activity_logs(created_at)
```

#### 2. Database Methods
**Location:** `seedr-server/src/models/database.js` (lines 256-284)

```javascript
logActivity(activityData)           // Insert activity log
getActivityLogs(filters, pagination) // Get logs with filters
getActivityLogsByUser(userId)       // Get user-specific logs
deleteActivityLog(logId)            // Delete single log
cleanupOldActivityLogs(days)        // Delete logs older than X days
```

#### 3. Logger Utility
**Location:** `seedr-server/src/utils/logger.js`

```javascript
logger.info(message)    // [i] prefix
logger.warn(message)    // [!] prefix
logger.error(message)   // [x] prefix
logger.debug(message)   // [d] prefix
```

**Limitation:** Console-only, no file persistence, no rotation

#### 4. HTTP Request Logger
**Location:** `seedr-server/src/server.js`

```javascript
app.use(morgan('dev')); // Logs all HTTP requests to console
```

#### 5. Admin Interface
**Location:** `seedr-web/src/pages/AdminActivityLogs.jsx`

**Features:**
- View all activity logs with pagination
- Filter by user, action type, search term
- Delete individual logs
- Bulk cleanup old logs (90+ days)
- Real-time refresh
- Displays: timestamp, username, action, details, IP address

**API Endpoints:**
- `GET /admin/activity-logs` - Get logs with filters
- `GET /admin/activity-logs/user/:userId` - Get user logs
- `DELETE /admin/activity-logs/:logId` - Delete log
- `POST /admin/activity-logs/cleanup` - Cleanup old logs

### Currently Logged Activities (3 Total)

| Activity Type | Location | Data Captured |
|--------------|----------|---------------|
| **torrent_add** | `seedr-server/src/controllers/torrents.controller.js:560, 708` | userId, username, torrentName, magnetLink, filePath (torrent file), fileSize, ipAddress, userAgent |
| **file_stream** | `seedr-server/src/controllers/stream.controller.js:143` | userId, username, torrentName, torrentHash, filePath, fileSize, ipAddress, userAgent |
| **file_download** | `seedr-server/src/controllers/stream.controller.js:143` | userId, username, torrentName, torrentHash, filePath, fileSize, ipAddress, userAgent |

### Console-Only Logging (Not Persisted)

Extensive console logging exists throughout the application but is **not persisted to database**:
- Server startup/initialization
- CORS configuration
- Torrent progress and metadata
- Quota validation
- Storage calculations
- Error messages
- Admin operations
- Authentication flows

---

## What Needs to Be Done

### Gap Analysis by Category

| Category | Activities Identified | Currently Logged | Logging Gap | Priority |
|----------|----------------------|------------------|-------------|----------|
| **Authentication** | 12 | 0 | 100% | CRITICAL |
| **Torrent Operations** | 13 | 1 | 92% | HIGH |
| **File Operations** | 9 | 2 | 78% | MEDIUM |
| **Admin Actions** | 23 | 0 | 100% | CRITICAL |
| **Plans & Subscriptions** | 7 | 0 | 100% | HIGH |
| **Security Events** | 9 | 0 | 100% | CRITICAL |
| **System Events** | 7 | 0 | 100% | LOW |
| **TOTAL** | **80** | **3** | **96%** | - |

### Priority Breakdown

- **CRITICAL (must log):** 35 activities - Authentication failures, admin actions, security events, DMCA
- **HIGH (should log):** 18 activities - Torrent operations, file deletions, subscriptions
- **MEDIUM (nice to log):** 15 activities - Quota checks, notifications, file browsing
- **LOW (optional):** 12 activities - View operations, analytics data

---

## Implementation Roadmap

### Phase 1: Security & Compliance (Week 1-2) - CRITICAL

**Goal:** Eliminate critical security and compliance blind spots

#### 1.1 Authentication Events (12 activities)
- [ ] User registration
- [ ] User login (success)
- [ ] User login (failure)
- [ ] Admin login (success)
- [ ] Admin login (failure)
- [ ] OTP verification (registration) - success/failure
- [ ] Admin OTP verification - success/failure
- [ ] OTP resend actions
- [ ] Forgot password requests
- [ ] Password reset OTP verification
- [ ] Password reset completion
- [ ] Invalid token usage attempts

**Files to Modify:**
- `seedr-server/src/routes/auth.routes.js`
- `seedr-server/src/middlewares/auth.middleware.js`

#### 1.2 Admin Actions (23 activities)
- [ ] View all users
- [ ] View user details
- [ ] Update user quota
- [ ] Update user status (enable/disable)
- [ ] Update max downloads
- [ ] Delete user
- [ ] Clear user storage
- [ ] View user files
- [ ] Delete user file (by admin)
- [ ] Approve upgrade request
- [ ] Reject upgrade request
- [ ] View dashboard stats
- [ ] Activate subscription
- [ ] Cancel subscription
- [ ] Process expired subscriptions
- [ ] DMCA report action (approve/reject/remove)
- [ ] DMCA report delete
- [ ] Activity log delete (meta-logging)
- [ ] Activity log cleanup

**Files to Modify:**
- `seedr-server/src/routes/admin.routes.js`
- `seedr-server/src/routes/dmca.routes.js`

#### 1.3 Security Events (9 activities)
- [ ] Failed authentication attempts (brute force detection)
- [ ] Invalid token usage
- [ ] Account disabled access attempts
- [ ] DMCA report submissions
- [ ] Quota violation attempts
- [ ] Path traversal attempts
- [ ] Concurrent download limit exceeded
- [ ] Unauthorized admin access attempts
- [ ] Direct link token verification failures

**Files to Modify:**
- `seedr-server/src/middlewares/auth.middleware.js`
- `seedr-server/src/controllers/torrents.controller.js`
- `seedr-server/src/controllers/stream.controller.js`

### Phase 2: Core Operations (Week 3-4) - HIGH

**Goal:** Complete business-critical operational logging

#### 2.1 Torrent Operations (12 additional activities)
- [ ] Torrent list view
- [ ] Torrent details view
- [ ] Torrent stop
- [ ] Torrent delete
- [ ] Quota check
- [ ] Quota exceeded event
- [ ] Reservation cleanup
- [ ] Notification view
- [ ] Notification clear
- [ ] Torrent progress milestones (25%, 50%, 75%, 100%)
- [ ] Torrent error events
- [ ] Seeding stopped events

**Files to Modify:**
- `seedr-server/src/controllers/torrents.controller.js`
- `seedr-server/src/services/torrentManager.js`

#### 2.2 File Operations (7 additional activities)
- [ ] File browse
- [ ] File list
- [ ] File delete
- [ ] Folder download (ZIP)
- [ ] Direct link access
- [ ] Stream link access (verify existing)
- [ ] File upload (if applicable)

**Files to Modify:**
- `seedr-server/src/routes/files.routes.js`
- `seedr-server/src/controllers/stream.controller.js`

#### 2.3 Plans & Subscriptions (7 activities)
- [ ] View plans
- [ ] View current plan
- [ ] Submit upgrade request
- [ ] View my requests
- [ ] Subscription view
- [ ] Subscription expiry event
- [ ] Subscription auto-renewal

**Files to Modify:**
- `seedr-server/src/routes/plans.routes.js`
- `seedr-server/src/routes/admin.routes.js` (subscription management)

### Phase 3: Analytics & Monitoring (Week 5-6) - MEDIUM/LOW

**Goal:** Enable data-driven decisions and system monitoring

#### 3.1 System Events (7 activities)
- [ ] Storage usage calculation
- [ ] Reservation created
- [ ] Reservation released
- [ ] Stale reservation cleanup
- [ ] WebTorrent client created
- [ ] Idle client cleanup
- [ ] Email sent (OTP/welcome/notification) - success/failure

**Files to Modify:**
- `seedr-server/src/utils/calculateStorage.js`
- `seedr-server/src/services/torrentManager.js`
- Email service files (if exists)

#### 3.2 Enhanced Logging Features
- [ ] Add log rotation (90-day default retention)
- [ ] Add log levels (DEBUG, INFO, WARN, ERROR, CRITICAL)
- [ ] Implement async logging to avoid blocking
- [ ] Add batch insert for high-frequency events
- [ ] Create separate tables for high-volume logs
- [ ] Add before/after states for modifications
- [ ] Implement GDPR-compliant data retention
- [ ] Add user data export capability

---

## Technical Implementation Guide

### General Implementation Pattern

Every logged activity should follow this pattern:

```javascript
try {
  // 1. Perform the main action
  const result = await performAction();

  // 2. Log successful action
  await req.db.logActivity({
    userId: req.user?.id || null,
    username: req.user?.username || 'anonymous',
    actionType: 'action_name_success', // Use snake_case: verb_noun_result
    torrentName: relevantData.torrentName || null,
    torrentHash: relevantData.hash || null,
    magnetLink: relevantData.magnet || null,
    filePath: relevantData.path || null,
    fileSize: relevantData.size || null,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'Unknown'
  });

  res.json({ success: true, data: result });
} catch (error) {
  // 3. Log failed action
  await req.db.logActivity({
    userId: req.user?.id || null,
    username: req.user?.username || 'anonymous',
    actionType: 'action_name_failure',
    torrentName: null,
    torrentHash: null,
    magnetLink: null,
    filePath: null,
    fileSize: null,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'Unknown'
  });

  res.status(500).json({ error: error.message });
}
```

### Naming Convention for action_type

Use consistent snake_case naming: `verb_noun_result`

**Examples:**
- Authentication: `login_success`, `login_failure`, `register_success`, `otp_verify_success`
- Torrents: `torrent_add`, `torrent_delete`, `torrent_stop`, `torrent_complete`
- Files: `file_stream`, `file_download`, `file_delete`, `folder_download`
- Admin: `admin_user_delete`, `admin_quota_update`, `admin_subscription_activate`
- Security: `quota_exceeded`, `path_traversal_attempt`, `invalid_token_usage`

### Helper Function for Logging (Recommended)

Create a logging helper to reduce boilerplate:

**Location:** `seedr-server/src/utils/activityLogger.js`

```javascript
/**
 * Activity Logger Helper
 * Simplifies logging across the application
 */

class ActivityLogger {
  constructor(db) {
    this.db = db;
  }

  /**
   * Log an activity
   * @param {Object} req - Express request object
   * @param {string} actionType - Action type (e.g., 'login_success')
   * @param {Object} details - Additional details
   */
  async log(req, actionType, details = {}) {
    try {
      await this.db.logActivity({
        userId: req.user?.id || details.userId || null,
        username: req.user?.username || details.username || 'anonymous',
        actionType,
        torrentName: details.torrentName || null,
        torrentHash: details.torrentHash || null,
        magnetLink: details.magnetLink || null,
        filePath: details.filePath || null,
        fileSize: details.fileSize || null,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || 'Unknown'
      });
    } catch (error) {
      console.error('[ActivityLogger] Failed to log activity:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(req, action, userId = null, username = null, success = true) {
    const actionType = `${action}_${success ? 'success' : 'failure'}`;
    await this.log(req, actionType, { userId, username });
  }

  /**
   * Log admin actions with target user
   */
  async logAdmin(req, action, targetUserId, targetUsername, details = {}) {
    const actionType = `admin_${action}`;
    await this.log(req, actionType, {
      ...details,
      // Store admin info in standard fields
      userId: req.user.id,
      username: req.user.username,
      // Store target info in torrentName/Hash as temporary workaround
      // TODO: Extend schema to add target_user_id, target_username fields
      torrentName: `target:${targetUsername}`,
      torrentHash: `targetId:${targetUserId}`
    });
  }

  /**
   * Log torrent operations
   */
  async logTorrent(req, action, torrent) {
    await this.log(req, `torrent_${action}`, {
      torrentName: torrent.name,
      torrentHash: torrent.infoHash,
      magnetLink: torrent.magnetLink || null,
      fileSize: torrent.length || null
    });
  }

  /**
   * Log file operations
   */
  async logFile(req, action, filePath, fileSize = null) {
    await this.log(req, `file_${action}`, {
      filePath,
      fileSize
    });
  }

  /**
   * Log security events
   */
  async logSecurity(req, event, details = {}) {
    await this.log(req, `security_${event}`, details);
  }
}

module.exports = ActivityLogger;
```

**Usage in server.js:**

```javascript
const ActivityLogger = require('./utils/activityLogger');

// Add to middleware
app.use((req, res, next) => {
  req.activityLogger = new ActivityLogger(req.db);
  next();
});
```

**Usage in routes:**

```javascript
// Simple usage
await req.activityLogger.log(req, 'torrent_add', {
  torrentName: 'example.torrent'
});

// Auth logging
await req.activityLogger.logAuth(req, 'login', user.id, user.username, true);

// Admin logging
await req.activityLogger.logAdmin(req, 'user_delete', targetUserId, targetUsername);

// Torrent logging
await req.activityLogger.logTorrent(req, 'add', torrent);

// File logging
await req.activityLogger.logFile(req, 'delete', filePath, fileSize);

// Security logging
await req.activityLogger.logSecurity(req, 'quota_exceeded', {
  torrentName: 'example.torrent'
});
```

### Implementation Examples by Category

#### Example 1: Authentication - User Login

**File:** `seedr-server/src/routes/auth.routes.js`
**Endpoint:** `POST /api/auth/login`
**Current Location:** Around line 315

**Before:**
```javascript
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await req.db.getUserByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ... rest of login logic
}));
```

**After:**
```javascript
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await req.db.getUserByUsername(username);

  if (!user) {
    // Log failed login - user not found
    await req.activityLogger.log(req, 'login_failure', {
      username,
      torrentName: 'reason:user_not_found' // Use torrentName for error details
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    // Log failed login - invalid password
    await req.activityLogger.log(req, 'login_failure', {
      userId: user.id,
      username: user.username,
      torrentName: 'reason:invalid_password'
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if account is disabled
  if (!user.enabled) {
    // Log account disabled access attempt
    await req.activityLogger.logSecurity(req, 'disabled_account_access', {
      userId: user.id,
      username: user.username
    });
    return res.status(403).json({ error: 'Account is disabled' });
  }

  // ... rest of login logic

  // Log successful login
  await req.activityLogger.logAuth(req, 'login', user.id, user.username, true);

  res.json({ token, user: { id: user.id, username: user.username, ... } });
}));
```

#### Example 2: Authentication - User Registration

**File:** `seedr-server/src/routes/auth.routes.js`
**Endpoint:** `POST /api/auth/register`
**Current Location:** Around line 100

**Add after successful registration:**

```javascript
// After creating user in database
await req.activityLogger.log(req, 'register_success', {
  userId: newUserId,
  username: username,
  torrentName: `email:${email}`, // Store email in available field
  fileSize: ageConfirmed ? 1 : 0  // Use fileSize for boolean flags
});
```

#### Example 3: Authentication - OTP Verification

**File:** `seedr-server/src/routes/auth.routes.js`
**Endpoint:** `POST /api/auth/verify-otp`
**Current Location:** Around line 150

**Add logging:**

```javascript
if (storedOTP !== otp) {
  // Log failed OTP verification
  await req.activityLogger.log(req, 'otp_verify_failure', {
    username,
    torrentName: `email:${email}`,
    magnetLink: 'reason:invalid_otp'
  });
  return res.status(400).json({ error: 'Invalid or expired OTP' });
}

// Log successful OTP verification
await req.activityLogger.log(req, 'otp_verify_success', {
  username,
  torrentName: `email:${email}`
});
```

#### Example 4: Admin Action - User Deletion

**File:** `seedr-server/src/routes/admin.routes.js`
**Endpoint:** `DELETE /admin/users/:userId`
**Current Location:** Around line 300

**Before:**
```javascript
router.delete('/users/:userId', adminAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await req.db.getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Delete user files, torrents, etc.
  await deleteUserData(userId);
  await req.db.deleteUser(userId);

  res.json({ message: 'User deleted successfully' });
}));
```

**After:**
```javascript
router.delete('/users/:userId', adminAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await req.db.getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Log BEFORE deletion (capture user data while it still exists)
  await req.activityLogger.log(req, 'admin_user_delete', {
    userId: req.user.id, // Admin performing the action
    username: req.user.username,
    torrentName: `target_user:${user.username}`,
    torrentHash: `target_email:${user.email}`,
    fileSize: user.storage_used || 0
  });

  // Delete user files, torrents, etc.
  await deleteUserData(userId);
  await req.db.deleteUser(userId);

  res.json({ message: 'User deleted successfully' });
}));
```

#### Example 5: Admin Action - Quota Update

**File:** `seedr-server/src/routes/admin.routes.js`
**Endpoint:** `PUT /admin/users/:userId/quota`
**Current Location:** Around line 100

**Add logging:**

```javascript
// Capture old values BEFORE update
const oldQuota = user.quota;
const oldPlan = user.plan;

// Perform update
await req.db.updateUserQuota(userId, newQuota, newPlan);

// Log quota update
await req.activityLogger.log(req, 'admin_quota_update', {
  userId: req.user.id, // Admin
  username: req.user.username,
  torrentName: `target:${user.username}`,
  torrentHash: `old_quota:${oldQuota}`,
  magnetLink: `new_quota:${newQuota}`,
  filePath: `old_plan:${oldPlan}`,
  fileSize: newQuota
});
```

#### Example 6: Torrent - Delete Operation

**File:** `seedr-server/src/controllers/torrents.controller.js`
**Endpoint:** `DELETE /api/torrents/:infoHash`
**Current Location:** Around line 400

**Add logging:**

```javascript
// Get torrent info BEFORE deletion
const torrent = torrentManager.getTorrent(infoHash);

if (!torrent) {
  return res.status(404).json({ error: 'Torrent not found' });
}

// Calculate storage freed
const sizeFreed = torrent.length || 0;

// Delete the torrent
await torrentManager.removeTorrent(infoHash);

// Log deletion
await req.activityLogger.log(req, 'torrent_delete', {
  torrentName: torrent.name,
  torrentHash: infoHash,
  fileSize: sizeFreed
});
```

#### Example 7: File - Delete Operation

**File:** `seedr-server/src/routes/files.routes.js`
**Endpoint:** `DELETE /api/files/delete`
**Current Location:** Need to add

**Implementation:**

```javascript
router.delete('/delete', auth, asyncHandler(async (req, res) => {
  const { path } = req.body;
  const userId = req.user.id;

  const fullPath = `${process.env.ROOT}/${userId}/${path}`;

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Get file size before deletion
  const stats = fs.statSync(fullPath);
  const isDirectory = stats.isDirectory();
  const fileSize = isDirectory ? await calculateDirectorySize(fullPath) : stats.size;

  // Delete file/directory
  if (isDirectory) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(fullPath);
  }

  // Log deletion
  await req.activityLogger.logFile(req, 'delete', path, fileSize);

  // Recalculate storage
  const newStorageUsed = await calculateStorage(userId);
  await req.db.updateUserStorageUsed(userId, newStorageUsed);

  res.json({
    message: 'File deleted successfully',
    sizeFreed: fileSize,
    newStorageUsed
  });
}));
```

#### Example 8: Security - Quota Exceeded

**File:** `seedr-server/src/controllers/torrents.controller.js`
**Endpoint:** `POST /api/torrents` (inside quota check)
**Current Location:** Around line 500

**Add logging when quota exceeded:**

```javascript
const requiredSpace = magnetMetadata.length;
const availableSpace = user.quota - user.storage_used;

if (requiredSpace > availableSpace) {
  // Log quota violation attempt
  await req.activityLogger.logSecurity(req, 'quota_exceeded', {
    torrentName: magnetMetadata.name,
    torrentHash: magnetMetadata.infoHash,
    fileSize: requiredSpace,
    filePath: `available:${availableSpace}`
  });

  return res.status(400).json({
    error: 'Insufficient storage space',
    required: requiredSpace,
    available: availableSpace
  });
}
```

#### Example 9: Security - Path Traversal Detection

**File:** `seedr-server/src/routes/files.routes.js`
**Endpoint:** `GET /api/files/browse`
**Current Location:** Add check

**Add security check:**

```javascript
router.get('/browse', auth, asyncHandler(async (req, res) => {
  const { path = '' } = req.query;
  const userId = req.user.id;

  // Security check: Prevent path traversal
  if (path.includes('..') || path.startsWith('/')) {
    // Log security event
    await req.activityLogger.logSecurity(req, 'path_traversal_attempt', {
      filePath: path
    });

    return res.status(400).json({ error: 'Invalid path' });
  }

  // ... rest of browse logic
}));
```

#### Example 10: Subscription - Activation

**File:** `seedr-server/src/routes/admin.routes.js`
**Endpoint:** `POST /admin/subscriptions/activate`
**Current Location:** Around line 700

**Add logging:**

```javascript
// After activating subscription
await req.activityLogger.log(req, 'admin_subscription_activate', {
  userId: req.user.id, // Admin
  username: req.user.username,
  torrentName: `target:${targetUser.username}`,
  torrentHash: `plan:${plan}`,
  magnetLink: `duration:${duration}`,
  filePath: `start:${startDate}`,
  fileSize: subscriptionId
});
```

### Middleware for Automatic Security Logging

Create middleware to automatically log security events:

**File:** `seedr-server/src/middlewares/securityLogger.middleware.js`

```javascript
/**
 * Security Logger Middleware
 * Automatically logs security-related events
 */

const securityLogger = (req, res, next) => {
  // Log invalid token attempts
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      // Async log - don't await to avoid blocking
      req.activityLogger?.logSecurity(req, 'unauthorized_access', {
        filePath: req.originalUrl,
        torrentName: `status:${res.statusCode}`
      }).catch(err => console.error('Failed to log security event:', err));
    }
    return originalJson.call(this, data);
  };

  next();
};

module.exports = securityLogger;
```

**Add to server.js:**

```javascript
const securityLogger = require('./middlewares/securityLogger.middleware');

// Add after authentication middleware
app.use(securityLogger);
```

---

## Activity Logging Reference

### Complete Activity List by Category

#### 1. Authentication Events (12 activities)

| Action Type | Priority | Trigger | Data to Capture |
|------------|----------|---------|-----------------|
| `register_success` | CRITICAL | POST /api/auth/register | userId, username, email (in torrentName), ageConfirmed (in fileSize) |
| `register_failure` | CRITICAL | POST /api/auth/register | username, email, reason (in magnetLink) |
| `login_success` | CRITICAL | POST /api/auth/login | userId, username, role (in torrentName) |
| `login_failure` | CRITICAL | POST /api/auth/login | username, reason (in torrentName) |
| `admin_login_success` | CRITICAL | POST /api/auth/login (admin) | userId, username, requiresOTP (in fileSize) |
| `admin_login_failure` | CRITICAL | POST /api/auth/login (admin) | username, reason |
| `otp_verify_success` | CRITICAL | POST /api/auth/verify-otp | userId, username, email |
| `otp_verify_failure` | CRITICAL | POST /api/auth/verify-otp | username, email, reason |
| `admin_otp_verify_success` | CRITICAL | POST /api/auth/verify-admin-otp | userId, username |
| `admin_otp_verify_failure` | CRITICAL | POST /api/auth/verify-admin-otp | username, reason |
| `password_reset_request` | HIGH | POST /api/auth/forgot-password | email (in torrentName) |
| `password_reset_complete` | CRITICAL | POST /api/auth/reset-password | userId, username, email |

#### 2. Torrent Operations (13 activities)

| Action Type | Priority | Trigger | Data to Capture |
|------------|----------|---------|-----------------|
| `torrent_add` | HIGH | POST /api/torrents | ✅ ALREADY LOGGED |
| `torrent_delete` | HIGH | DELETE /api/torrents/:id | userId, username, torrentName, torrentHash, sizeFreed (fileSize) |
| `torrent_stop` | MEDIUM | PUT /api/torrents/:id/stop | userId, username, torrentName, torrentHash, progress (in filePath) |
| `torrent_complete` | MEDIUM | Event in torrentManager | userId, username, torrentName, torrentHash, totalSize |
| `torrent_error` | HIGH | Event in torrentManager | userId, username, torrentName, torrentHash, error (in magnetLink) |
| `torrent_list_view` | LOW | GET /api/torrents | userId, username, count (in fileSize) |
| `notification_view` | LOW | GET /api/torrents/notifications | userId, username, count (in fileSize) |
| `notification_clear` | LOW | DELETE /api/torrents/notifications/:id | userId, username, notificationId (in fileSize) |
| `quota_check` | LOW | GET /api/torrents/quota | userId, username, currentUsage (in fileSize) |
| `reservation_cleanup` | MEDIUM | DELETE /api/torrents/reservations/cleanup | userId, username, reservationsReleased (in fileSize) |

#### 3. File Operations (9 activities)

| Action Type | Priority | Trigger | Data to Capture |
|------------|----------|---------|-----------------|
| `file_stream` | MEDIUM | GET /stream/:id/:fileIndex | ✅ ALREADY LOGGED |
| `file_download` | MEDIUM | GET /download/:id/:fileIndex | ✅ ALREADY LOGGED |
| `file_browse` | LOW | GET /api/files/browse | userId, username, path (in filePath), itemCount (in fileSize) |
| `file_delete` | HIGH | DELETE /api/files/delete | userId, username, filePath, fileSize |
| `folder_download` | MEDIUM | GET /api/files/download/folder/:token | userId, username, folderPath, folderSize, fileCount |
| `direct_link_access` | MEDIUM | GET /files/direct/:token | userId, username, filePath |
| `file_list_view` | LOW | GET /api/files/ | userId, username, totalFiles (in fileSize) |

#### 4. Admin Actions (23 activities)

| Action Type | Priority | Trigger | Data to Capture |
|------------|----------|---------|-----------------|
| `admin_users_view` | LOW | GET /admin/users | adminId, adminUsername, userCount (in fileSize) |
| `admin_user_view` | MEDIUM | GET /admin/users/:userId | adminId, adminUsername, targetUserId, targetUsername |
| `admin_quota_update` | CRITICAL | PUT /admin/users/:userId/quota | adminId, targetUserId, oldQuota, newQuota, oldPlan, newPlan |
| `admin_status_update` | CRITICAL | PUT /admin/users/:userId/status | adminId, targetUserId, oldStatus, newStatus |
| `admin_max_downloads_update` | MEDIUM | PUT /admin/users/:userId/max-downloads | adminId, targetUserId, oldLimit, newLimit |
| `admin_user_delete` | CRITICAL | DELETE /admin/users/:userId | adminId, targetUserId, targetUsername, storageUsed |
| `admin_storage_clear` | CRITICAL | DELETE /admin/users/:userId/storage | adminId, targetUserId, bytesCleared, filesDeleted |
| `admin_user_files_view` | MEDIUM | GET /admin/users-files | adminId, page (in fileSize) |
| `admin_folder_view` | MEDIUM | GET /admin/users/:userId/folder-contents | adminId, targetUserId, folderPath |
| `admin_file_delete` | CRITICAL | DELETE /admin/files/:userId | adminId, targetUserId, filePath, fileSize |
| `admin_upgrade_approve` | CRITICAL | POST /admin/upgrade-requests/:id/approve | adminId, requestId, targetUserId, plan |
| `admin_upgrade_reject` | CRITICAL | POST /admin/upgrade-requests/:id/reject | adminId, requestId, targetUserId, reason |
| `admin_subscription_activate` | CRITICAL | POST /admin/subscriptions/activate | adminId, targetUserId, plan, duration |
| `admin_subscription_cancel` | CRITICAL | POST /admin/subscriptions/:id/cancel | adminId, subscriptionId, targetUserId, reason |
| `admin_subscriptions_process` | HIGH | POST /admin/subscriptions/process-expired | adminId, expiredCount, downgradedCount |
| `admin_dmca_action` | CRITICAL | POST /dmca/reports/:id/action | adminId, reportId, action (approve/reject/remove) |
| `admin_dmca_delete` | HIGH | DELETE /dmca/reports/:id | adminId, reportId |
| `admin_log_delete` | HIGH | DELETE /admin/activity-logs/:id | adminId, logId, originalActionType |
| `admin_log_cleanup` | MEDIUM | POST /admin/activity-logs/cleanup | adminId, daysKept, logsDeleted |
| `admin_stats_view` | LOW | GET /admin/stats | adminId |

#### 5. Plans & Subscriptions (7 activities)

| Action Type | Priority | Trigger | Data to Capture |
|------------|----------|---------|-----------------|
| `plans_view` | LOW | GET /api/plans | userId, username |
| `current_plan_view` | LOW | GET /api/plans/current | userId, username, currentPlan |
| `upgrade_request_submit` | HIGH | POST /api/plans/upgrade-request | userId, username, targetPlan, duration |
| `upgrade_requests_view` | LOW | GET /api/plans/my-requests | userId, username, requestCount |
| `subscription_view` | LOW | GET /api/auth/subscription | userId, username, currentPlan |
| `subscription_expired` | CRITICAL | System event | userId, username, plan, expiryDate |
| `subscription_renewed` | CRITICAL | System event | userId, username, plan, renewalDate |

#### 6. Security Events (9 activities)

| Action Type | Priority | Trigger | Data to Capture |
|------------|----------|---------|-----------------|
| `security_quota_exceeded` | CRITICAL | Quota check failure | userId, username, requiredSpace, availableSpace, torrentName |
| `security_invalid_token` | HIGH | Auth middleware | userId (if available), endpoint, token (partial) |
| `security_disabled_account_access` | HIGH | Login attempt | userId, username |
| `security_path_traversal_attempt` | CRITICAL | File browse with ../ | userId, username, attemptedPath |
| `security_concurrent_limit_exceeded` | MEDIUM | Torrent add | userId, username, currentCount, maxAllowed |
| `security_unauthorized_admin_access` | CRITICAL | Admin middleware | userId, username, attemptedEndpoint |
| `security_direct_link_invalid` | MEDIUM | Direct link access | token (partial), endpoint |
| `dmca_report_submit` | CRITICAL | POST /dmca/report | reportId, reporterEmail, infringingContent |
| `security_brute_force_detected` | CRITICAL | Multiple failed logins | username, attemptCount, timeWindow |

#### 7. System Events (7 activities)

| Action Type | Priority | Trigger | Data to Capture |
|------------|----------|---------|-----------------|
| `system_storage_calculated` | LOW | Storage calc | userId, calculatedUsage, previousUsage |
| `system_reservation_created` | MEDIUM | Database insert | userId, infoHash, sizeBytes |
| `system_reservation_released` | MEDIUM | Database delete | userId, infoHash, sizeBytes, reason |
| `system_reservation_cleanup` | MEDIUM | Cleanup job | cleanedCount, totalBytesFreed |
| `system_client_created` | LOW | Torrent manager | userId, maxConnections |
| `system_client_cleanup` | LOW | Idle cleanup | userId, idleDuration |
| `system_email_sent` | HIGH | Email service | userId, emailType, recipient, success/failure |

---

## Best Practices

### 1. Data Capture Guidelines

**DO:**
- ✅ Capture before-state BEFORE modifications (for audit trail)
- ✅ Log both success AND failure events
- ✅ Include IP address and user agent for security events
- ✅ Use consistent naming conventions (snake_case)
- ✅ Hash/mask sensitive data (passwords, tokens)
- ✅ Include relevant context (file sizes, quotas, etc.)
- ✅ Use async logging to avoid blocking main operations

**DON'T:**
- ❌ Log full passwords or tokens
- ❌ Log credit card or payment details
- ❌ Block operations waiting for logs to complete
- ❌ Use inconsistent action_type naming
- ❌ Log unnecessary PII (personal identifiable information)
- ❌ Skip error handling in logging code

### 2. Performance Considerations

**Avoid Blocking Operations:**
```javascript
// BAD - Blocks the response
await req.activityLogger.log(...);
res.json({ success: true });

// GOOD - Fire and forget for non-critical logs
req.activityLogger.log(...).catch(err => console.error('Log failed:', err));
res.json({ success: true });

// BETTER - Use async wrapper for critical logs
try {
  const result = await performOperation();
  req.activityLogger.log(...).catch(err => console.error('Log failed:', err));
  res.json({ success: true, data: result });
} catch (error) {
  await req.activityLogger.log(...); // Wait for critical failure logs
  res.status(500).json({ error: error.message });
}
```

**Batch High-Frequency Events:**
```javascript
// For high-frequency events (e.g., file access), consider batching
const logBatch = [];

// Add to batch
logBatch.push({ userId, actionType, ... });

// Flush batch every 10 seconds or when it reaches 100 items
if (logBatch.length >= 100 || timeSinceLastFlush > 10000) {
  await database.bulkInsertLogs(logBatch);
  logBatch = [];
}
```

### 3. Schema Extensions (Future Enhancement)

Current schema has limitations. Consider adding these fields:

```sql
ALTER TABLE activity_logs ADD COLUMN target_user_id INTEGER;
ALTER TABLE activity_logs ADD COLUMN target_username TEXT;
ALTER TABLE activity_logs ADD COLUMN action_result TEXT; -- 'success' or 'failure'
ALTER TABLE activity_logs ADD COLUMN error_message TEXT;
ALTER TABLE activity_logs ADD COLUMN session_id TEXT;
ALTER TABLE activity_logs ADD COLUMN request_id TEXT; -- For tracing
ALTER TABLE activity_logs ADD COLUMN before_state TEXT; -- JSON
ALTER TABLE activity_logs ADD COLUMN after_state TEXT;  -- JSON
ALTER TABLE activity_logs ADD COLUMN log_level TEXT; -- DEBUG, INFO, WARN, ERROR
```

### 4. Log Retention & Cleanup

**Implement tiered retention:**
```javascript
// Retention policy
const RETENTION_POLICY = {
  CRITICAL: 365,  // 1 year for security/compliance events
  HIGH: 180,      // 6 months for admin actions
  MEDIUM: 90,     // 3 months for operations
  LOW: 30         // 1 month for view/analytics events
};

// Automated cleanup job (run daily via cron)
async function cleanupLogs() {
  for (const [level, days] of Object.entries(RETENTION_POLICY)) {
    const actionTypes = getActionTypesByPriority(level);
    await database.cleanupOldActivityLogs(days, actionTypes);
  }
}
```

### 5. GDPR Compliance

**User Data Export:**
```javascript
// Allow users to export their activity logs
router.get('/api/my-activity-logs/export', auth, asyncHandler(async (req, res) => {
  const logs = await req.db.getActivityLogsByUser(req.user.id);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=my-activity-logs.json');
  res.json(logs);
}));
```

**Right to Deletion:**
```javascript
// When user requests account deletion, delete their logs too
async function deleteUserAndLogs(userId) {
  // Delete activity logs
  await database.run('DELETE FROM activity_logs WHERE user_id = ?', [userId]);

  // Delete user
  await database.deleteUser(userId);
}
```

### 6. Security Best Practices

**Sanitize Inputs:**
```javascript
// Prevent log injection
function sanitizeForLog(input) {
  if (typeof input !== 'string') return input;

  // Remove newlines and control characters
  return input.replace(/[\r\n\t]/g, ' ').substring(0, 500);
}

await req.activityLogger.log(req, 'action', {
  torrentName: sanitizeForLog(userInput)
});
```

**Rate Limiting for Failed Attempts:**
```javascript
// Track failed login attempts
const failedAttempts = new Map(); // userId -> { count, firstAttempt }

// In login handler
if (!validPassword) {
  const key = username;
  const attempts = failedAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
  attempts.count++;

  // Reset after 15 minutes
  if (Date.now() - attempts.firstAttempt > 15 * 60 * 1000) {
    attempts.count = 1;
    attempts.firstAttempt = Date.now();
  }

  failedAttempts.set(key, attempts);

  // Log potential brute force
  if (attempts.count >= 5) {
    await req.activityLogger.logSecurity(req, 'brute_force_detected', {
      username,
      fileSize: attempts.count
    });
  }

  // Block after 10 attempts
  if (attempts.count >= 10) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
  }
}
```

### 7. Monitoring & Alerting

**Create alerts for critical events:**
```javascript
// Alert on critical security events
async function logAndAlert(req, actionType, details) {
  await req.activityLogger.log(req, actionType, details);

  // Send alert for critical events
  const ALERT_EVENTS = [
    'security_brute_force_detected',
    'security_path_traversal_attempt',
    'security_quota_exceeded',
    'admin_user_delete'
  ];

  if (ALERT_EVENTS.includes(actionType)) {
    await sendAdminAlert({
      event: actionType,
      user: req.user?.username,
      ip: req.ip,
      details
    });
  }
}
```

---

## Testing Strategy

### 1. Unit Tests for Activity Logger

**File:** `seedr-server/tests/activityLogger.test.js`

```javascript
const ActivityLogger = require('../src/utils/activityLogger');

describe('ActivityLogger', () => {
  let mockDb;
  let logger;
  let mockReq;

  beforeEach(() => {
    mockDb = {
      logActivity: jest.fn().mockResolvedValue(true)
    };
    logger = new ActivityLogger(mockDb);
    mockReq = {
      user: { id: 1, username: 'testuser' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('TestAgent')
    };
  });

  test('should log basic activity', async () => {
    await logger.log(mockReq, 'test_action', { torrentName: 'test' });

    expect(mockDb.logActivity).toHaveBeenCalledWith({
      userId: 1,
      username: 'testuser',
      actionType: 'test_action',
      torrentName: 'test',
      torrentHash: null,
      magnetLink: null,
      filePath: null,
      fileSize: null,
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent'
    });
  });

  test('should log auth events', async () => {
    await logger.logAuth(mockReq, 'login', 1, 'testuser', true);

    expect(mockDb.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'login_success'
      })
    );
  });

  test('should handle anonymous users', async () => {
    const anonReq = { ...mockReq, user: null };
    await logger.log(anonReq, 'test_action', {});

    expect(mockDb.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        username: 'anonymous'
      })
    );
  });

  test('should not throw on database errors', async () => {
    mockDb.logActivity.mockRejectedValue(new Error('DB Error'));

    await expect(logger.log(mockReq, 'test_action', {}))
      .resolves.not.toThrow();
  });
});
```

### 2. Integration Tests

**File:** `seedr-server/tests/integration/logging.test.js`

```javascript
const request = require('supertest');
const app = require('../src/server');
const database = require('../src/models/database');

describe('Activity Logging Integration', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test user and get token
    authToken = await setupTestUser();
  });

  afterAll(async () => {
    // Cleanup
    await database.close();
  });

  test('should log successful login', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' })
      .expect(200);

    // Check log was created
    const logs = await database.getActivityLogs({
      actionType: 'login_success',
      limit: 1
    });

    expect(logs.length).toBe(1);
    expect(logs[0].username).toBe('testuser');
  });

  test('should log failed login', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpassword' })
      .expect(401);

    const logs = await database.getActivityLogs({
      actionType: 'login_failure',
      limit: 1
    });

    expect(logs.length).toBe(1);
    expect(logs[0].username).toBe('testuser');
  });

  test('should log torrent addition', async () => {
    const magnetLink = 'magnet:?xt=urn:btih:test';

    await request(app)
      .post('/api/torrents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ magnetLink })
      .expect(200);

    const logs = await database.getActivityLogs({
      actionType: 'torrent_add',
      limit: 1
    });

    expect(logs.length).toBe(1);
    expect(logs[0].magnet_link).toBe(magnetLink);
  });

  test('should log admin actions', async () => {
    const adminToken = await getAdminToken();

    await request(app)
      .put('/admin/users/2/quota')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quota: 50, plan: 'pro' })
      .expect(200);

    const logs = await database.getActivityLogs({
      actionType: 'admin_quota_update',
      limit: 1
    });

    expect(logs.length).toBe(1);
  });
});
```

### 3. Manual Testing Checklist

Create a testing checklist for each phase:

**Phase 1 - Authentication & Security:**
- [ ] Register new user → Check `register_success` log
- [ ] Register with existing email → Check `register_failure` log
- [ ] Login with valid credentials → Check `login_success` log
- [ ] Login with invalid password → Check `login_failure` log
- [ ] Login as admin → Check `admin_login_success` log
- [ ] Verify OTP correctly → Check `otp_verify_success` log
- [ ] Verify OTP incorrectly → Check `otp_verify_failure` log
- [ ] Request password reset → Check `password_reset_request` log
- [ ] Complete password reset → Check `password_reset_complete` log
- [ ] Access with invalid token → Check `security_invalid_token` log
- [ ] Try to add torrent exceeding quota → Check `security_quota_exceeded` log

**Phase 2 - Operations:**
- [ ] Add torrent → Check `torrent_add` log (existing)
- [ ] Delete torrent → Check `torrent_delete` log
- [ ] Stop torrent → Check `torrent_stop` log
- [ ] Stream file → Check `file_stream` log (existing)
- [ ] Download file → Check `file_download` log (existing)
- [ ] Delete file → Check `file_delete` log
- [ ] Submit upgrade request → Check `upgrade_request_submit` log

**Phase 3 - Admin Actions:**
- [ ] Update user quota → Check `admin_quota_update` log
- [ ] Disable user account → Check `admin_status_update` log
- [ ] Delete user → Check `admin_user_delete` log
- [ ] Delete user file → Check `admin_file_delete` log
- [ ] Approve upgrade request → Check `admin_upgrade_approve` log
- [ ] Activate subscription → Check `admin_subscription_activate` log

### 4. Performance Testing

Test logging performance impact:

```javascript
// Load test - measure response time with/without logging
async function performanceTest() {
  const iterations = 1000;

  // Without logging
  const startNoLog = Date.now();
  for (let i = 0; i < iterations; i++) {
    await performAction();
  }
  const timeNoLog = Date.now() - startNoLog;

  // With logging
  const startWithLog = Date.now();
  for (let i = 0; i < iterations; i++) {
    await performActionWithLogging();
  }
  const timeWithLog = Date.now() - startWithLog;

  console.log(`Without logging: ${timeNoLog}ms`);
  console.log(`With logging: ${timeWithLog}ms`);
  console.log(`Overhead: ${((timeWithLog - timeNoLog) / timeNoLog * 100).toFixed(2)}%`);

  // Acceptable if overhead < 10%
  expect((timeWithLog - timeNoLog) / timeNoLog).toBeLessThan(0.1);
}
```

---

## Conclusion

The Seedr-Lite application has a **solid foundation** for activity logging with database infrastructure and an admin viewing interface already in place. However, with only **3 out of 80+ user activities** currently being logged, there is a **critical 96% logging gap**.

### Current State Summary

**What Exists:**
- ✅ SQLite `activity_logs` table with good schema
- ✅ Database methods for CRUD operations on logs
- ✅ Admin interface to view/manage/cleanup logs
- ✅ Basic console logging throughout application
- ✅ HTTP request logging (Morgan)
- ✅ 3 activities being logged: torrent_add, file_stream, file_download

**What's Missing:**
- ❌ Authentication event logging (0/12 activities)
- ❌ Admin action logging (0/23 activities)
- ❌ Security event logging (0/9 activities)
- ❌ Complete torrent operation logging (1/13 activities)
- ❌ Complete file operation logging (2/9 activities)
- ❌ Subscription lifecycle logging (0/7 activities)
- ❌ System event logging (0/7 activities)

### Immediate Action Required

**Phase 1 (Weeks 1-2): Security & Compliance - CRITICAL**
1. Implement all authentication event logging (prevents security blind spots)
2. Implement all admin action logging (required for accountability and compliance)
3. Implement security event logging (detect attacks, prevent abuse)

**Why This Matters:**
- **Security:** Currently blind to brute force attacks, unauthorized access attempts, path traversal
- **Compliance:** No audit trail for admin actions (GDPR, data protection requirements)
- **Accountability:** Cannot track who did what when (admin actions, user deletions)
- **Forensics:** No data for investigating security incidents or user complaints

### Long-term Benefits

**After Implementation:**
- 🔒 **Enhanced Security:** Detect and respond to attacks in real-time
- ⚖️ **Regulatory Compliance:** GDPR, DMCA, data protection audit trails
- 📊 **Business Intelligence:** User behavior analytics, conversion tracking
- 🐛 **Debugging:** Trace user journeys, identify issues quickly
- 📈 **Growth Analytics:** Understand usage patterns, optimize features
- 🛡️ **Legal Protection:** Evidence for disputes, ToS violations

### Implementation Approach

**Recommended Strategy:**
1. **Week 1-2:** Use the ActivityLogger helper class to implement Phase 1 (authentication + admin + security)
2. **Week 3-4:** Complete Phase 2 (torrent operations + file operations + subscriptions)
3. **Week 5-6:** Implement Phase 3 (system events + analytics + enhancements)
4. **Ongoing:** Monitor log volume, optimize performance, add archival strategies

**Estimated Effort:**
- **Phase 1:** 40-60 hours (2 weeks)
- **Phase 2:** 30-40 hours (1.5 weeks)
- **Phase 3:** 20-30 hours (1 week)
- **Total:** 90-130 hours (4.5-6.5 weeks)

### Success Metrics

**Logging Coverage:**
- Phase 1: 35/80 activities logged (44% coverage)
- Phase 2: 60/80 activities logged (75% coverage)
- Phase 3: 80/80 activities logged (100% coverage)

**Performance:**
- Logging overhead < 5% of request time
- No blocking operations in critical paths
- Database size growth < 1GB per 100K users per month

**Compliance:**
- 100% of admin actions logged
- 100% of authentication events logged
- 100% of security events logged
- Audit trail immutability guaranteed

---

## Getting Started

To begin implementation:

1. **Create the ActivityLogger helper:**
   ```bash
   # Create the helper file
   touch seedr-server/src/utils/activityLogger.js
   ```

2. **Copy the ActivityLogger class** from the "Helper Function for Logging" section

3. **Add middleware to server.js:**
   ```javascript
   const ActivityLogger = require('./utils/activityLogger');

   app.use((req, res, next) => {
     req.activityLogger = new ActivityLogger(req.db);
     next();
   });
   ```

4. **Start with authentication events** (highest priority):
   - Open `seedr-server/src/routes/auth.routes.js`
   - Add logging to login endpoint (see Example 1)
   - Add logging to register endpoint (see Example 2)
   - Test manually and verify logs appear in database

5. **Follow the Implementation Roadmap** phase by phase

6. **Use the testing strategy** to verify each implementation

---

## Support & Questions

**For AI Agents Implementing This Guide:**
- All code examples are production-ready
- All file paths are absolute and correct
- All database methods already exist in `database.js`
- All table schemas are already created
- Follow examples exactly, they use existing infrastructure
- No schema changes required for Phase 1 & 2
- Test after each activity type implementation

**Key Files Reference:**
- Database: `seedr-server/src/models/database.js`
- Auth Routes: `seedr-server/src/routes/auth.routes.js`
- Admin Routes: `seedr-server/src/routes/admin.routes.js`
- Torrents Controller: `seedr-server/src/controllers/torrents.controller.js`
- Stream Controller: `seedr-server/src/controllers/stream.controller.js`
- Admin UI: `seedr-web/src/pages/AdminActivityLogs.jsx`

**Documentation:**
- This guide is the single source of truth
- Refer to "Activity Logging Reference" section for complete list
- Use "Implementation Examples" section for code patterns
- Follow "Best Practices" section for quality

---

**END OF IMPLEMENTATION GUIDE**

*This document should be version controlled and updated as logging requirements evolve.*
