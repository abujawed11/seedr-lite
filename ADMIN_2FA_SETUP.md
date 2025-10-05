# Admin 2FA (Two-Factor Authentication) Setup

## Overview

Your admin account is now protected with **2-Factor Authentication using Email OTP**.

### Security Layers for Admin:
1. ✅ **Username & Password** - Traditional authentication
2. ✅ **IP Whitelist** - Only allowed IPs can attempt login
3. ✅ **Email OTP (2FA)** - 6-digit code sent to your email

Even if someone has your password AND bypasses IP restriction, they still can't login without the OTP from your email!

---

## How It Works

### Admin Login Flow:
```
1. Enter username (admin) & password
2. ✅ Password verified
3. ✅ IP address checked (must be whitelisted)
4. 📧 OTP sent to your email (abubakar.jawed@gmail.com)
5. Enter 6-digit OTP from email
6. ✅ OTP verified
7. Login successful
```

### Regular User Login:
```
1. Enter username & password
2. ✅ Password verified
3. Login successful (no OTP required)
```

**Important:** Only admin accounts require OTP. Regular users login normally.

---

## Configuration

### Already Configured in `.env`:

```env
# Admin Email for 2FA OTP
ADMIN_EMAIL=abubakar.jawed@gmail.com

# SMTP Configuration (already set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=abubakar.jawed@gmail.com
SMTP_PASS=breirfymxjsanacc
```

**All set!** Your email is already configured.

---

## Testing Admin Login

### 1. Start Servers
```bash
# Backend
cd seedr-server
npm run dev

# Frontend
cd seedr-web
npm run dev
```

### 2. Login as Admin
1. Go to login page
2. Enter:
   - Username: `admin`
   - Password: `admin123` (or your current password)
3. Click "Sign in"

### 3. OTP Screen Appears
- You'll see: **"🔐 Admin Verification"**
- Message: **"Security code sent to ab***@gmail.com"**

### 4. Check Your Email
- Subject: **"🔐 Admin Login Verification - Seedr-Lite"**
- Body contains 6-digit code
- Email includes warning: "If you didn't attempt to login..."

### 5. Enter OTP
- Type the 6-digit code
- Click "Verify & Login"
- ✅ Admin dashboard loads

---

## Email Template Preview

When you login as admin, you'll receive:

```
🔐 Admin Login Attempt

Someone is attempting to login to your admin account.

Your admin verification code is:
    123456

This code will expire in 5 minutes.

⚠️ SECURITY WARNING:
If you did NOT attempt to login, someone may have your admin password.
Please change your password immediately.

Login Details:
- Time: [timestamp]
- Account: Admin
```

---

## Features

### OTP Verification Screen
- 🎨 Red-themed security design
- ⏱️ 5-minute expiration
- 🔄 Resend button (60-second cooldown)
- ⚠️ Security warning
- ← Back to login option

### Security Benefits
1. **Email Verification** - Proves you have access to admin email
2. **Time-Limited** - OTP expires in 5 minutes
3. **One-Time Use** - Each OTP can only be used once
4. **Audit Trail** - All OTP sends are logged
5. **Attack Notification** - Unauthorized attempts trigger email alerts

---

## Resend OTP

If you don't receive the code:

1. Click **"Resend Code"** button
2. Wait 60 seconds before requesting again
3. Check spam folder
4. Verify SMTP settings if still failing

---

## Troubleshooting

### OTP Not Received

**Check server logs:**
```
✅ Admin OTP sent to abubakar.jawed@gmail.com
```

**If you see error:**
```
❌ Failed to send admin OTP email
```

**Solutions:**
1. Verify SMTP settings in `.env`
2. Check Gmail App Password is correct
3. Ensure email service initialized:
   ```
   ✅ Email service initialized successfully
   ```

### Invalid OTP Error

**Causes:**
- OTP expired (5 minutes)
- Wrong code entered
- OTP already used

**Solution:**
- Click "Resend Code"
- Enter new OTP

### OTP Screen Doesn't Appear

**Causes:**
- Not logging in as admin
- Backend error

**Solution:**
- Check you're using username "admin"
- Check server console for errors

---

## Security Best Practices

### ✅ Current Security (Strong):
- IP Whitelist enabled
- 2FA with Email OTP
- Strong password recommended

### 🚀 Optional Enhancements:

**1. Change Admin Password**
```sql
-- Use a strong password (20+ characters)
-- Mix of uppercase, lowercase, numbers, symbols
```

**2. Monitor Failed Attempts**
```bash
# Watch server logs for:
🚫 Admin login blocked from unauthorized IP
❌ Invalid OTP code
```

**3. Regular Security Checks**
- Review OTP emails for unauthorized attempts
- Change password if suspicious activity
- Update IP whitelist when your IP changes

---

## Changing Admin Email

To use a different email for OTP:

**Edit `.env`:**
```env
ADMIN_EMAIL=newemail@example.com
```

**Restart server:**
```bash
cd seedr-server
npm run dev
```

---

## Disabling 2FA (Not Recommended)

If you want to disable OTP for admin:

**Option 1: Comment out admin email** (keeps IP whitelist):
```env
# ADMIN_EMAIL=abubakar.jawed@gmail.com
```

**Option 2: Modify code** (in `seedr-server/src/routes/auth.js`):
```javascript
// Comment out this block:
// if (user.role === 'admin') {
//   ... OTP code ...
// }
```

⚠️ **Warning:** This removes a critical security layer!

---

## API Endpoints

### Send Admin OTP
```
POST /api/auth/login
Body: { username, password }

Response (Admin):
{
  "requiresOTP": true,
  "message": "Admin verification required...",
  "email": "ab***@gmail.com"
}
```

### Verify Admin OTP
```
POST /api/auth/verify-admin-otp
Body: { username, otp }

Response:
{
  "message": "Admin login successful",
  "user": { ... },
  "token": "jwt_token"
}
```

### Resend Admin OTP
```
POST /api/auth/resend-admin-otp
Body: { username }

Response:
{
  "message": "OTP resent successfully",
  "email": "ab***@gmail.com"
}
```

---

## Files Modified

### Backend
- `seedr-server/src/routes/auth.js` - OTP login logic
- `seedr-server/src/services/emailService.js` - Admin OTP email template
- `seedr-server/.env` - Admin email config

### Frontend
- `seedr-web/src/components/AdminOTPVerification.jsx` - OTP UI
- `seedr-web/src/components/LoginForm.jsx` - OTP flow integration
- `seedr-web/src/context/AuthContext.jsx` - OTP response handling

---

## Summary

✅ **Admin 2FA is Active!**

Your admin account now requires:
1. Correct password ✅
2. Whitelisted IP ✅
3. OTP from email ✅

**This provides military-grade security for your admin account!** 🔒

Even if credentials leak, attackers can't access admin without your email.

---

**Need Help?**
- Check server logs for detailed error messages
- Verify SMTP configuration
- Ensure admin email is correct in `.env`
