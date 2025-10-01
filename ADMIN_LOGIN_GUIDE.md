# 🛡️ Admin Login Guide

## Default Admin Credentials

Your Seedr-Lite application comes with a **pre-configured admin account** that is automatically created on first startup.

---

## 🔑 Login Credentials

```
Username: admin
Password: admin123
Email: admin@seedr-lite.local
```

⚠️ **IMPORTANT:** Change the password after your first login!

---

## 📝 How to Login as Admin

### Step 1: Start the Servers

```bash
# Terminal 1 - Backend
cd seedr-server
npm run dev
```

When the server starts, you'll see:
```
🛡️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DEFAULT ADMIN USER CREATED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Username: admin
   Password: admin123
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```bash
# Terminal 2 - Frontend
cd seedr-web
npm run dev
```

### Step 2: Access the Application

1. Open browser: http://localhost:5173
2. You'll see the login page

### Step 3: Login with Admin Credentials

1. Enter:
   - **Username:** `admin`
   - **Password:** `admin123`
2. Click **"Login"**

### Step 4: Verify Admin Access

After successful login, you should see:

1. ✅ **"ADMIN" badge** (red badge) next to your username in the header
2. ✅ **"🛡️ Admin Panel"** button in the header
3. ✅ Regular user features (torrents, files, upgrade button)

### Step 5: Access Admin Dashboard

1. Click the **"🛡️ Admin Panel"** button
2. Admin dashboard opens with 3 tabs:
   - 📊 **Dashboard** - System statistics
   - 👥 **Users** - User management
   - 📝 **Upgrade Requests** - Request approval

---

## 🔐 Security Features

### Admin Username is Protected

- ✅ The username "admin" **cannot be registered** by regular users
- ✅ Attempting to register with username "admin" will show error:
  > "This username is reserved. Please choose a different username."

### Admin User is Auto-Created

- ✅ Created automatically on **first server startup**
- ✅ If user "admin" already exists, it's **promoted to admin role**
- ✅ Only created **once** - subsequent startups skip creation

### Admin Account Features

- ✅ **Cannot be deleted** via admin panel
- ✅ Has **10 concurrent downloads** by default (vs 2 for regular users)
- ✅ **5GB storage quota** by default (upgradable via admin panel)
- ✅ Full access to all admin features

---

## 🔄 Changing Admin Password

### Option 1: Via Database (Recommended for first change)

```bash
# Generate new password hash
cd seedr-server
node -e "console.log(require('bcryptjs').hashSync('your_new_password', 10))"

# Copy the output hash, then update database
sqlite3 data/users.db

UPDATE users
SET password = 'PASTE_HASH_HERE'
WHERE username = 'admin';

.exit
```

### Option 2: Add Password Change Feature (Future Enhancement)

You can implement a "Change Password" feature in the admin panel:

1. Add route: `PUT /api/admin/change-password`
2. Verify old password
3. Hash and save new password

---

## 🧪 Testing Admin Functionality

### Test Checklist

1. **Login Test**
   - [ ] Login with username: `admin`, password: `admin123`
   - [ ] Verify "ADMIN" badge appears
   - [ ] Verify "Admin Panel" button appears

2. **Admin Panel Access**
   - [ ] Click "Admin Panel" button
   - [ ] Verify dashboard loads with stats
   - [ ] Check all 3 tabs (Dashboard, Users, Requests)

3. **User Management**
   - [ ] Create a test user account (logout, register new user)
   - [ ] Login as admin again
   - [ ] Go to "Users" tab in admin panel
   - [ ] Verify test user appears in list
   - [ ] Click "Edit" on test user
   - [ ] Change their quota/plan
   - [ ] Verify changes saved

4. **Upgrade Requests**
   - [ ] Logout and login as test user
   - [ ] Submit upgrade request
   - [ ] Logout and login as admin
   - [ ] Go to "Upgrade Requests" tab
   - [ ] Verify request appears
   - [ ] Approve or reject request
   - [ ] Verify user's plan updated (if approved)

---

## ❓ FAQ

### Q: What if I forget the admin password?

**A:** Use the database method to reset it (see "Changing Admin Password" above)

### Q: Can I change the default admin username?

**A:** Yes, but you need to modify `database.js`:
1. Edit line 181: Change `'admin'` to your desired username
2. Edit line 23 in `auth.js`: Update the reserved username check
3. Restart server

### Q: Can I have multiple admin users?

**A:** Yes! Options:
1. Promote existing user: `UPDATE users SET role = 'admin' WHERE username = 'user2';`
2. Create new admin via registration then promote
3. Use admin panel to manually set role (requires UI implementation)

### Q: Can I delete the admin user?

**A:** The default admin user is protected from deletion via the admin panel. To delete it:
```sql
DELETE FROM users WHERE username = 'admin';
```
⚠️ Not recommended - always keep at least one admin account!

### Q: What if admin user already exists but isn't admin?

**A:** The system automatically detects this and promotes them to admin role on server startup.

### Q: Can regular users see the Admin Panel button?

**A:** No, only users with `role = 'admin'` see the Admin Panel button and ADMIN badge.

---

## 🚨 Troubleshooting

### Issue: Can't login with admin/admin123

**Solutions:**
1. Check database exists: `ls seedr-server/data/users.db`
2. Verify admin user created: Check server startup logs
3. Check database manually:
   ```bash
   sqlite3 seedr-server/data/users.db
   SELECT username, role FROM users WHERE username = 'admin';
   ```
4. If no results, admin wasn't created. Check for errors in server logs.

### Issue: Admin badge not showing after login

**Solutions:**
1. Check user role in database:
   ```sql
   SELECT username, role FROM users WHERE username = 'admin';
   ```
   Should show: `admin|admin`
2. If role is 'user', update it:
   ```sql
   UPDATE users SET role = 'admin' WHERE username = 'admin';
   ```
3. Logout and login again

### Issue: "This username is reserved" error

**Expected behavior!** The username "admin" is reserved and can only be used by the default admin account created by the system.

Choose a different username for regular user accounts.

---

## 📋 Quick Reference

| Field | Value |
|-------|-------|
| **Username** | admin |
| **Password** | admin123 |
| **Email** | admin@seedr-lite.local |
| **Role** | admin |
| **Default Quota** | 5 GB |
| **Max Downloads** | 10 concurrent |
| **Status** | Active |

---

## 🎯 Next Steps After First Login

1. ✅ Access admin panel
2. ✅ Review system statistics
3. ✅ Create test user accounts
4. ✅ Test upgrade request flow
5. ✅ Familiarize yourself with user management
6. ⚠️ **Change default password!**

---

**Ready to manage your users! 🚀**

For complete admin system documentation, see `ADMIN_SYSTEM_GUIDE.md`
