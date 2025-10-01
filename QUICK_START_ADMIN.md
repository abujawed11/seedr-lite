# 🚀 Quick Start - Admin System

## Setup in 2 Minutes

### 1. Start Servers

**Admin user is created automatically!**

```bash
# Terminal 1 - Backend
cd seedr-server
npm run dev

# You'll see this message on first startup:
# 🛡️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#    DEFAULT ADMIN USER CREATED
#    Username: admin
#    Password: admin123
# 🛡️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Terminal 2 - Frontend
cd seedr-web
npm run dev
```

### 2. Login as Admin

1. Open http://localhost:5173
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`
3. Look for **"ADMIN" badge** next to username
4. Click **"🛡️ Admin Panel"** button
5. Done! 🎉

---

## User Upgrade Flow

**User Side:**
1. Click "⬆️ Upgrade"
2. Select plan
3. Fill form (name, email, phone, address)
4. Submit request
5. Wait for admin approval

**Admin Side:**
1. Go to Admin Panel
2. Click "📝 Upgrade Requests" tab
3. Review request details
4. Click "✅ Approve" or "❌ Reject"
5. User's plan updates instantly!

---

## Admin Actions

### Manage User Quota
1. Admin Panel → "👥 Users" tab
2. Click "Edit" on user
3. Select plan or set custom quota
4. Set max concurrent downloads
5. Save changes

### Enable/Disable User
1. Find user in Users tab
2. Click "Disable" or "Enable"
3. Disabled users cannot login

### Delete User
1. Click "Delete" button (non-admin users only)
2. Confirm deletion
3. ⚠️ Cannot be undone!

---

## Testing Checklist

- [ ] Start backend server (admin auto-created)
- [ ] Login with username: `admin`, password: `admin123`
- [ ] Verify "ADMIN" badge appears
- [ ] Access Admin Panel
- [ ] View dashboard stats
- [ ] Create test user account (register new user)
- [ ] Login as test user and submit upgrade request
- [ ] Login as admin and approve request
- [ ] Verify test user's quota increased
- [ ] Test user edit functionality
- [ ] Test user disable/enable

---

## Common Issues

**Can't login with admin/admin123?**
→ Check if admin user was created (look for startup message)
→ Check database: `SELECT username, role FROM users WHERE username = 'admin';`
→ Should return: `admin|admin`

**Admin badge not showing?**
→ Logout and login again
→ Clear browser cache
→ Check database: `SELECT role FROM users WHERE username = 'admin';`

**Request not showing?**
→ Click refresh button (🔄)
→ Check browser console for errors

**Quota update fails?**
→ User's current usage must be less than new quota
→ Tell user to delete files first

**"This username is reserved" error when registering?**
→ This is expected! Username "admin" is protected
→ Choose a different username for regular users

---

## Key Features

✅ User submits upgrade requests with personal details
✅ Admin reviews and approves/rejects requests
✅ Admin can manually adjust any user's quota
✅ Admin can set concurrent download limits per user
✅ Admin can enable/disable user accounts
✅ Admin can delete users (except other admins)
✅ Dashboard shows system statistics
✅ Beautiful, responsive admin UI

---

## File Structure

```
seedr-server/
├── src/
│   ├── models/database.js          # Database methods
│   ├── middlewares/adminAuth.js    # Admin authentication
│   ├── routes/admin.js             # Admin API routes
│   └── routes/plans.js             # Upgrade request routes

seedr-web/
├── src/
│   ├── pages/AdminDashboard.jsx    # Admin control panel
│   ├── components/PlansModal.jsx   # Upgrade request form
│   └── api.js                      # API functions
```

---

## Quick Commands

**Make user admin:**
```sql
UPDATE users SET role = 'admin' WHERE username = 'username';
```

**Remove admin (make regular user):**
```sql
UPDATE users SET role = 'user' WHERE username = 'username';
```

**See all pending requests:**
```sql
SELECT * FROM upgrade_requests WHERE status = 'pending';
```

**Delete old processed requests:**
```sql
DELETE FROM upgrade_requests
WHERE status != 'pending'
AND processed_at < datetime('now', '-30 days');
```

---

**Full Documentation:**
- 🛡️ `ADMIN_LOGIN_GUIDE.md` - Complete admin login instructions
- 📚 `ADMIN_SYSTEM_GUIDE.md` - Full system documentation
- 📋 `IMPLEMENTATION_SUMMARY.md` - What was built
