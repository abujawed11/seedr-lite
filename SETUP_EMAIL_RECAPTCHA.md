# Email OTP & reCAPTCHA Setup Guide

This guide will help you configure email verification (OTP) and Google reCAPTCHA for your Seedr-Lite application.

## Overview

The signup process now includes:
1. **reCAPTCHA v3** - Bot protection during registration
2. **Email OTP Verification** - 6-digit code sent to user's email for verification

---

## 1. Email SMTP Configuration

### Using Gmail (Recommended for testing)

1. **Enable 2-Factor Authentication** on your Google Account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Configure Backend Environment**

Edit `seedr-server/.env`:

```env
# SMTP Configuration for Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM_NAME=Seedr-Lite
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Using Other SMTP Services

#### **SendGrid**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

#### **Mailgun**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

#### **Outlook/Hotmail**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
```

---

## 2. Google reCAPTCHA v3 Setup

### Step 1: Register Your Site

1. Go to: https://www.google.com/recaptcha/admin/create
2. Fill in the form:
   - **Label**: Seedr-Lite
   - **reCAPTCHA type**: Select "reCAPTCHA v3"
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - `yourdomain.com` (for production)
3. Accept the terms and click **Submit**

### Step 2: Get Your Keys

After registration, you'll receive:
- **Site Key** (public key - used in frontend)
- **Secret Key** (private key - used in backend)

### Step 3: Configure Backend

Edit `seedr-server/.env`:

```env
# Google reCAPTCHA
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key-here
```

### Step 4: Configure Frontend

Edit `seedr-web/.env.local`:

```env
# API URL
VITE_API_URL=http://localhost:5000

# Google reCAPTCHA Site Key
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key-here
```

---

## 3. Testing the Setup

### Test Email Service

1. Start the backend server:
   ```bash
   cd seedr-server
   npm run dev
   ```

2. Check console output for:
   ```
   ✅ Email service initialized successfully
   ✅ SMTP connection verified successfully
   ✅ Email service ready
   ```

### Test reCAPTCHA

1. Start the frontend:
   ```bash
   cd seedr-web
   npm run dev
   ```

2. Open browser console (F12) and check for reCAPTCHA script loading
3. Register a new account - check Network tab for reCAPTCHA token being sent

### Test Complete Flow

1. Go to registration page
2. Fill in the form (username, email, password)
3. Submit the form
4. Check your email for the 6-digit OTP code
5. Enter the OTP code
6. Verify successful registration

---

## 4. Troubleshooting

### Email Not Sending

**Error: "Email service not configured"**
- Check if all SMTP environment variables are set
- Restart the backend server after adding variables

**Error: "Invalid login credentials"**
- For Gmail: Make sure you're using an App Password, not your regular password
- Verify SMTP_USER and SMTP_PASS are correct

**Error: "Connection timeout"**
- Check SMTP_HOST and SMTP_PORT are correct
- Check firewall settings
- For Gmail: Try SMTP_PORT=465 with SMTP_SECURE=true

### reCAPTCHA Issues

**reCAPTCHA not loading**
- Check VITE_RECAPTCHA_SITE_KEY is set in frontend `.env.local`
- Clear browser cache and reload

**reCAPTCHA verification failed**
- Check RECAPTCHA_SECRET_KEY is set in backend `.env`
- Verify Site Key and Secret Key are from the same reCAPTCHA registration
- Check domain is registered in reCAPTCHA admin panel

**Score too low (< 0.5)**
- This is normal for bot-like behavior
- Lower the threshold in `seedr-server/src/routes/auth.js` if needed (not recommended for production)

### OTP Issues

**OTP expired**
- OTP is valid for 10 minutes
- Request a new code using "Resend Code" button

**Invalid OTP**
- Check email for the latest code
- Codes are case-sensitive and numeric only

---

## 5. Production Deployment

### Security Checklist

- [ ] Use strong SMTP passwords
- [ ] Store all keys in environment variables (never commit to git)
- [ ] Use a dedicated SMTP service (SendGrid, Mailgun) instead of Gmail
- [ ] Enable rate limiting on auth endpoints
- [ ] Monitor failed OTP attempts
- [ ] Set up email sending quotas

### Environment Variables Summary

**Backend (.env):**
```env
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=
SMTP_FROM_EMAIL=
RECAPTCHA_SECRET_KEY=
```

**Frontend (.env.local):**
```env
VITE_API_URL=
VITE_RECAPTCHA_SITE_KEY=
```

---

## 6. Optional: Disable OTP/reCAPTCHA (Development Only)

If you want to temporarily disable these features for local development:

1. **Backend**: Comment out reCAPTCHA verification in `seedr-server/src/routes/auth.js`
2. **Frontend**: Set empty values for keys in `.env.local`

⚠️ **Warning**: Never disable in production!

---

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test SMTP connection using online tools
4. Check reCAPTCHA admin panel for domain configuration

For Gmail troubleshooting: https://support.google.com/mail/answer/7126229
For reCAPTCHA help: https://developers.google.com/recaptcha/docs/faq
