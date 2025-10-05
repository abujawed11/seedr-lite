# Admin IP Whitelist Configuration Guide

## Quick Answer

**For Production (VPS/Cloud):** Use your **PUBLIC IP** from https://whatismyipaddress.com

```env
ADMIN_IP_WHITELIST=203.0.113.45
```

**For Local Development:** Use localhost

```env
ADMIN_IP_WHITELIST=127.0.0.1
```

---

## Understanding IP Types

### ❌ Local IP (192.168.x.x)
- **Example:** `192.168.1.106`
- **Where it works:** Only inside your home/office WiFi
- **VPS can see it?** NO
- **Use for production?** ❌ NO

### ✅ Public IP
- **Example:** `203.0.113.45`
- **Where it works:** Anywhere on internet
- **VPS can see it?** YES
- **Use for production?** ✅ YES

### ✅ Localhost (127.0.0.1)
- **Where it works:** When server and browser are on same machine
- **Use for local dev?** ✅ YES
- **Use for production?** ❌ NO (unless admin panel is VPS-only)

---

## Step-by-Step: Production Setup

### Step 1: Find Your Public IP

**From your laptop, visit:**
- https://whatismyipaddress.com
- Or: https://ipinfo.io/ip

**Example result:** `203.0.113.45`

### Step 2: Update .env on VPS

**SSH into your VPS:**
```bash
ssh user@your-vps-ip
cd /path/to/seedr-lite/seedr-server
nano .env
```

**Set your public IP:**
```env
ADMIN_IP_WHITELIST=203.0.113.45
```

### Step 3: Restart Server

```bash
pm2 restart seedr-server
# or
npm run dev
```

### Step 4: Test Admin Login

**From your laptop:**
1. Visit: `https://yourdomain.com/login`
2. Login as admin
3. Check server logs:
   ```
   🔍 Admin login attempt - Detected IP: 203.0.113.45
   ✅ Admin login allowed from whitelisted IP: 203.0.113.45
   ```

---

## Common Scenarios

### Scenario 1: Access from Home Only

**Your home public IP:** `203.0.113.45`

```env
ADMIN_IP_WHITELIST=203.0.113.45
```

✅ Can admin login from home
❌ Cannot admin login from office/mobile

---

### Scenario 2: Access from Multiple Locations

**Your IPs:**
- Home: `203.0.113.45`
- Office: `198.51.100.22`
- Mobile hotspot: `192.0.2.88`

```env
ADMIN_IP_WHITELIST=203.0.113.45,198.51.100.22,192.0.2.88
```

✅ Can admin login from all three locations

---

### Scenario 3: Dynamic IP (Changes Frequently)

**Problem:** Your ISP changes your IP daily

**Solutions:**

#### Option A: Use VPN with Static IP
1. Subscribe to VPN with static IP (NordVPN, ExpressVPN)
2. Always connect via VPN when accessing admin
3. Whitelist VPN exit IP

```env
ADMIN_IP_WHITELIST=198.51.100.50  # VPN static IP
```

#### Option B: Disable IP Whitelist
```env
# ADMIN_IP_WHITELIST=
```
⚠️ Less secure, but you still have password + 2FA OTP

#### Option C: Use Broader Range (Less Secure)
```bash
# Get your ISP's IP range
whois 203.0.113.45
```
Not recommended - allows entire IP block

---

### Scenario 4: Behind Cloudflare

**Problem:** Server sees Cloudflare IP, not your IP

**Solution:** Already configured in `server.js`:
```javascript
app.set('trust proxy', true);
```

**Then whitelist your IP:**
```env
ADMIN_IP_WHITELIST=203.0.113.45
```

**How it works:**
- Cloudflare sends `X-Forwarded-For` header with your real IP
- `trust proxy` tells Express to use that header
- Server correctly detects your IP

---

## Testing & Debugging

### Check What IP Server Sees

**Server logs show detected IP:**
```bash
# When you login as admin, check logs:
🔍 Admin login attempt - Detected IP: 203.0.113.45, Allowed IPs: 203.0.113.45
✅ Admin login allowed from whitelisted IP: 203.0.113.45
```

**If IP doesn't match:**
1. The "Detected IP" is what you need to whitelist
2. Update `ADMIN_IP_WHITELIST` with that IP
3. Restart server

### Test from Different IPs

**Allowed IP (should work):**
```
🔍 Admin login attempt - Detected IP: 203.0.113.45
✅ Admin login allowed from whitelisted IP: 203.0.113.45
→ OTP sent to email
```

**Blocked IP (should fail):**
```
🔍 Admin login attempt - Detected IP: 198.51.100.99
🚫 Admin login blocked from unauthorized IP: 198.51.100.99
→ Error: "Access denied. Admin login is restricted..."
```

---

## Special Cases

### Case 1: Admin Access Only from VPS

**If you only login to admin from VPS terminal (SSH):**

```env
ADMIN_IP_WHITELIST=127.0.0.1
```

**How to use:**
1. SSH into VPS
2. Use text browser: `lynx http://localhost:5000/login`
3. Or: Port forward: `ssh -L 8080:localhost:5000 user@vps`
4. Browser: `http://localhost:8080/login`

---

### Case 2: Team of Admins

**Multiple admin users from different locations:**

```env
# Admin 1 home, Admin 2 office, Admin 3 mobile
ADMIN_IP_WHITELIST=203.0.113.45,198.51.100.22,192.0.2.88,104.26.10.50
```

**Each admin's IP must be in the list.**

---

### Case 3: IPv6 Addresses

**If your ISP uses IPv6:**

**Find IPv6:**
```bash
curl -6 https://ipv6.icanhazip.com
```

**Example:** `2001:0db8:85a3::8a2e:0370:7334`

**Whitelist IPv6:**
```env
ADMIN_IP_WHITELIST=2001:0db8:85a3::8a2e:0370:7334,203.0.113.45
```

Server handles both IPv4 and IPv6.

---

## Production Checklist

Before deploying:

- [ ] Find your public IP from whatismyipaddress.com
- [ ] Update `ADMIN_IP_WHITELIST` in production `.env`
- [ ] Restart server after changing `.env`
- [ ] Test admin login works from your IP
- [ ] Test admin login blocked from other IP (use mobile hotspot)
- [ ] Verify server logs show correct IP detection
- [ ] If using Cloudflare, confirm `trust proxy` is enabled
- [ ] Document your whitelisted IPs somewhere safe

---

## Current Your Configuration

Based on your `.env`:

```env
ADMIN_IP_WHITELIST=127.0.0.9,192.168.1.106
```

### Analysis:

**`127.0.0.9`**
- ❓ Unusual - typically `127.0.0.1` for localhost
- Might work for local dev
- Won't work for production VPS

**`192.168.1.106`**
- ❌ This is your **local network IP**
- Only works inside your home WiFi
- **Won't work when accessing VPS from internet**
- VPS will see your **public IP** instead

### Recommended for Production:

**Replace with your public IP:**

1. Visit: https://whatismyipaddress.com
2. Get your IP (e.g., `203.0.113.45`)
3. Update:
   ```env
   ADMIN_IP_WHITELIST=203.0.113.45
   ```

---

## FAQ

**Q: My IP keeps changing. What should I do?**

A: Options:
1. Use VPN with static IP ✅ Best
2. Contact ISP for static IP ✅ Good
3. Disable IP whitelist ⚠️ Less secure (still have 2FA)
4. Update whitelist when IP changes 😓 Annoying

---

**Q: Can I use domain name instead of IP?**

A: No, whitelist only accepts IP addresses.

---

**Q: I'm locked out! How do I fix?**

A: SSH into VPS and update `.env`:
```bash
ssh user@vps-ip
nano /path/to/.env
# Add your current IP or comment out ADMIN_IP_WHITELIST
pm2 restart seedr-server
```

---

**Q: Do regular users need to be whitelisted?**

A: No! IP whitelist **only affects admin login**. Regular users can login from anywhere.

---

**Q: How do I disable IP whitelist?**

A: Comment out or remove from `.env`:
```env
# ADMIN_IP_WHITELIST=
```

⚠️ You'll still have password + 2FA OTP security.

---

## Summary

### For Development (Laptop as server):
```env
ADMIN_IP_WHITELIST=127.0.0.1
```

### For Production (VPS hosting):
1. Get public IP: https://whatismyipaddress.com
2. Set it:
   ```env
   ADMIN_IP_WHITELIST=YOUR_PUBLIC_IP
   ```
3. Restart server
4. Test login

### Multiple locations:
```env
ADMIN_IP_WHITELIST=HOME_IP,OFFICE_IP,MOBILE_IP
```

---

**Remember:** `192.168.x.x` is LOCAL - it won't work for VPS!

Use **PUBLIC IP** from whatismyipaddress.com for production! 🎯
