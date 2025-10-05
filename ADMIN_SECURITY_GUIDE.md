# Admin Security Guide

## IP Whitelist Protection

Your admin account is now protected with IP whitelisting. Only specified IP addresses can login as admin.

---

## How It Works

When someone tries to login as admin:
1. ✅ Username & password checked (normal authentication)
2. ✅ IP address checked against whitelist
3. ❌ If IP not in whitelist → Login blocked (even with correct password)

---

## Setup Instructions

### 1. Find Your IP Address

**For Local Development (localhost):**
```env
ADMIN_IP_WHITELIST=127.0.0.1
```

**For Remote Access - Find your public IP:**
- Visit: https://whatismyipaddress.com
- Copy your IPv4 address (e.g., `203.0.113.5`)

### 2. Configure .env File

Edit `seedr-server/.env`:

```env
# Single IP (your home/office)
ADMIN_IP_WHITELIST=203.0.113.5

# Multiple IPs (home, office, mobile)
ADMIN_IP_WHITELIST=203.0.113.5,198.51.100.10,192.0.2.50

# Allow localhost + your IP
ADMIN_IP_WHITELIST=127.0.0.1,203.0.113.5
```

### 3. Restart Server

```bash
cd seedr-server
npm run dev
```

---

## Testing

### Test 1: Allowed IP ✅
1. Make sure your IP is in the whitelist
2. Login as admin
3. Should work normally
4. Check server logs: `✅ Admin login allowed from whitelisted IP: xxx.xxx.xxx.xxx`

### Test 2: Blocked IP ❌
1. Login from different network/IP
2. Admin login will fail with: "Access denied. Admin login is restricted to authorized IP addresses."
3. Check server logs: `🚫 Admin login blocked from unauthorized IP: xxx.xxx.xxx.xxx`

### Test 3: Regular Users
- Regular users can login from ANY IP
- IP whitelist ONLY affects admin accounts

---

## Production Deployment

### Using VPS/Cloud Server:

**If using reverse proxy (nginx/cloudflare):**

Make sure to enable trust proxy in your Express server:

```js
// In seedr-server/src/server.js
app.set('trust proxy', true);
```

This ensures the real client IP is detected (not the proxy IP).

**Cloudflare Users:**
- Cloudflare changes client IPs
- Use Cloudflare Access or firewall rules instead
- Or disable IP whitelist and use other methods

---

## Dynamic IP Issues

If your home IP changes frequently:

### Option 1: Use Dynamic DNS Service
- Services like No-IP, DuckDNS (won't work with IP whitelist)
- Better: Use Option 2 or 3

### Option 2: VPN with Static IP
- Use VPN with static IP
- Add VPN exit IP to whitelist
- Always connect via VPN for admin access

### Option 3: Disable IP Whitelist
Comment out or remove from `.env`:
```env
# ADMIN_IP_WHITELIST=
```

Use alternative security methods instead (see below)

---

## Alternative/Additional Security Methods

### 1. Two-Factor Authentication (2FA)
- Add OTP requirement for admin login
- More secure than IP whitelist alone

### 2. Admin-Specific Strong Password
- Use very long password (20+ characters)
- Use password manager

### 3. Rate Limiting
- Limit login attempts
- Block after 3 failed attempts

### 4. Admin Login URL Change
- Change admin login endpoint from `/login` to something secret
- E.g., `/admin-secure-login-xyz123`

### 5. VPN Requirement
- Host admin panel only on VPN
- Completely separate from public access

---

## Security Levels

**Minimum (Current):**
- IP Whitelist ✅
- Strong password

**Recommended:**
- IP Whitelist ✅
- Strong password ✅
- 2FA (OTP) ⚠️ Not implemented yet

**Maximum:**
- IP Whitelist ✅
- Strong password ✅
- 2FA (OTP) ⚠️ Not implemented yet
- VPN access ⚠️ Not implemented yet
- Hardware key (YubiKey) ⚠️ Not implemented yet

---

## Disable IP Whitelist

To disable (allow admin from any IP):

```env
# Comment out or remove this line:
# ADMIN_IP_WHITELIST=
```

Or leave it empty:
```env
ADMIN_IP_WHITELIST=
```

---

## Troubleshooting

**Problem: Admin login blocked even though I'm on whitelisted IP**

**Solution:**
1. Check server logs to see detected IP
2. Make sure the IP in logs matches your whitelist
3. If using VPN, add VPN IP to whitelist
4. If behind router, use public IP (not local 192.168.x.x)

**Problem: IP keeps changing (dynamic IP)**

**Solution:**
- Contact ISP for static IP
- Use VPN with static IP
- Use alternative security method
- Disable IP whitelist

**Problem: Cloudflare shows wrong IP**

**Solution:**
Add to `seedr-server/src/server.js`:
```js
app.set('trust proxy', true);
```

---

## FAQ

**Q: Can regular users still login from anywhere?**
A: Yes! IP whitelist ONLY affects admin accounts.

**Q: What if I forget to add my IP?**
A: You'll be locked out. You'll need server access to update `.env` file directly.

**Q: Can I use domain names instead of IPs?**
A: No, only IP addresses work. Use IP address of the domain.

**Q: Is this production-ready?**
A: Yes, but consider adding 2FA for extra security.

**Q: What about IPv6?**
A: Supported. Add IPv6 addresses to whitelist: `2001:0db8:85a3::8a2e:0370:7334`

---

## Emergency Access

If locked out:

1. Access your server directly (SSH, console)
2. Edit `.env` file:
   ```bash
   nano seedr-server/.env
   ```
3. Comment out IP whitelist:
   ```env
   # ADMIN_IP_WHITELIST=127.0.0.1
   ```
4. Restart server
5. Login as admin
6. Update IP whitelist with correct IP
7. Re-enable IP whitelist

---

**Security is implemented! Your admin panel is now protected.** 🔒
