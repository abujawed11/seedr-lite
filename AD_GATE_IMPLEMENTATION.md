# Ad Gate — Implementation & Deployment Notes

Free-plan users must view a short ad before they can **download**, **play/stream** or **copy a link** to their files. Paid plans and admins are never shown ads. Enforcement is server-side, so the ad cannot be skipped by copying links, using DevTools, or calling the API directly.

---

## 1. How it works (user flow)

1. Free user clicks **Play**, **Download** or **Copy link** on a file or folder.
2. The **ad gate modal** opens and calls `POST /api/files/ad/start`.
   - Paid users/admins get `{ skip: true, url }` immediately (in practice their buttons use direct links and never open the modal).
   - Free users get a signed **ad ticket** + `waitSeconds` (default **10**).
3. An Adsterra **Native Banner** loads inside the modal. The **countdown runs only while the ad is showing and the tab is visible**.
4. When the countdown ends the modal calls `POST /api/files/ad/complete` with the ticket. The server checks the signature and that the wait really elapsed (server clock), then returns a short-lived link.
5. The user clicks **Download now / Play now / Copy link**:
   - the download starts / player opens / link is copied, **and**
   - the Adsterra **Smartlink** opens in a new tab (max once per 10 min per browser).
6. For Download/Copy the modal **stays open with the ad visible**, showing "✓ Your download has started", **Download again** and **Close**. Play closes the modal so the player can open.

---

## 2. Anti-bypass design (server-side)

| Protection | How |
|---|---|
| No links handed out up front | `/files/browse` returns **no** `streamUrl` / `downloadUrl` / `directUrl` for free users (response includes `adRequired: true`). |
| Must actually wait | Ad ticket records the start time (server clock). `ad/complete` returns `425` until `AD_GATE_WAIT_SECONDS` have passed. |
| Tickets can't be forged | Tickets are JWTs signed with a key derived from `JWT_SECRET` (separate from the download-link key), so a ticket can't be used as a link and vice-versa. |
| One ad can't unlock many files | Each user gets at most **one link per wait period**, across all tabs/tickets. Extra tabs are told to wait (no error). |
| Links can't be shared | Ad-issued links expire quickly (15 min download / 4 h stream) and are bound to the user's IP (salted hash). |
| Old / leaked links die | `/files/direct` and torrent `/direct` reject any link for a free user unless it carries the `ad: true` claim. Downgraded users' old links stop working within ~1 min. |
| Raw byte routes closed | `/files/stream`, `/files/download`, `/files/download/folder/:token`, `/stream/:id/:i`, `/download/:id/:i` return `403` for free users (the web app doesn't use them). |
| Abuse limits | Max `AD_GATE_MAX_PER_HOUR` (60) ad starts per user per hour → `429`. |
| Survives restarts | Tickets are stateless — a server restart / deploy never breaks an ad in progress. |

**Residual risk:** a determined developer could script the API and wait 10 s per file. The hourly limit stops this at scale. No web ad is 100% bypass-proof.

---

## 3. Ad blockers & ad failures

- If the Adsterra script fails to load, the gate runs a **bait test** (a hidden "ad" element + request to Google's ad script).
  - Bait blocked → real ad blocker → **"Ad blocker detected"** screen with *Retry* and *Upgrade*. Countdown does not start.
  - Bait loads → the ad network itself failed → countdown runs with a **"Go ad-free with Premium"** placeholder (users are never wrongly accused).
- Reasons are logged in the browser console as `[ad-gate] ...`.

---

## 4. User-experience safeguards

- Smartlink opens **only** on the final Download now / Play now / Copy link click — never on signup, login, folder navigation, or for paid users.
- Smartlink is skipped when the action itself opens a new tab (e.g. opening a PDF), because browsers allow only one new tab per click.
- No technical errors shown. Transient failures are retried silently; users only see friendly messages:
  - "Sorry, that didn't work. Please try again."
  - "Couldn't connect. Please check your internet and try again."
  - "You're going a bit fast. Please wait a minute and try again." (rate limit)
  - "This file is no longer available. Try refreshing the page."
- Ad gate modal works with React StrictMode (the complete call is made exactly once per ticket).

---

## 5. Files

### Backend (`seedr-server/src`)
| File | Change |
|---|---|
| `services/adGate.js` | **New.** Tickets, wait/spacing rules, rate limit, plan check (cached 60 s), IP fingerprint, `checkDirectAccess`, `requireAdExempt` middleware. |
| `controllers/files.controller.js` | `browse` hides links for free users; `direct` enforces the ad claim; new `adStart` / `adComplete` handlers; `buildDirectUrl` helper. |
| `controllers/stream.controller.js` | Torrent `direct` enforces the ad claim. |
| `routes/files.routes.js` | Adds `POST /ad/start`, `POST /ad/complete`; byte routes are paid-only. |
| `routes/stream.routes.js` | `/stream/:id/:i` and `/download/:id/:i` are paid-only. |
| `middlewares/auth.js` | Adds `role` to `req.user`. |

### Frontend (`seedr-web/src`)
| File | Change |
|---|---|
| `utils/adConfig.js` | **New.** All Adsterra URLs in one place (Native Banner, Smartlink + cooldown, gate ad override). |
| `utils/smartlink.js` | **New.** Opens the Smartlink with a per-browser cooldown (localStorage, in-memory fallback). |
| `components/AdGateModal.jsx` | **New.** The ad gate UI: ad iframe, ad-blocker detection, countdown, friendly errors, done state. |
| `context/AdGateContext.jsx`, `context/adGate.js` | **New.** `AdGateProvider`, `useAdGate()`, `triggerDownload()`. |
| `components/FileItem.jsx`, `components/FolderItem.jsx` | Play/Download/Copy go through the gate when no direct link is present. |
| `components/AdBanner.jsx` | Uses `adConfig.js`. |
| `api.js` | `startAdGate()`, `completeAdGate()`. |
| `App.jsx` | Wraps the file explorer in `AdGateProvider`. |

---

## 6. Configuration

### Backend `.env` (all optional)
| Variable | Default | Meaning |
|---|---|---|
| `AD_GATE_ENABLED` | `true` | `false` disables the gate for everyone. |
| `AD_GATE_WAIT_SECONDS` | `10` | Countdown length (also the one-link-per-N-seconds spacing). |
| `AD_GATE_DOWNLOAD_TTL_SECONDS` | `900` | Lifetime of ad-issued download links (15 min). |
| `AD_GATE_STREAM_TTL_SECONDS` | `14400` | Lifetime of ad-issued stream links (4 h, so seeking keeps working). |
| `AD_GATE_BIND_IP` | `true` | Bind ad links to the user's IP. Set `false` if mobile users report broken links. |
| `AD_GATE_MAX_PER_HOUR` | `60` | Max ad starts per user per hour. |
| `JWT_SECRET` | — | **Must be set in production.** Signs links and ad tickets. |

### Frontend
- Edit `seedr-web/src/utils/adConfig.js`:
  - `BANNER_AD` — Native Banner script URL + container id.
  - `SMARTLINK_AD` — Smartlink URL + `cooldownMinutes` (default 10).
- Optional `.env`: `VITE_AD_GATE_SCRIPT_URL`, `VITE_AD_GATE_CONTAINER_ID` to use a separate Native Banner unit for the gate (recommended for separate stats).

---

## 7. Adsterra setup & notes

| Unit | Status | Used for |
|---|---|---|
| Native Banner (`28762454`) | Active | Page banner + ad gate modal |
| Smartlink | Active (Mainstream, adult ads **off**) | New tab on Download now / Play now / Copy link |
| Popunder (`28762148`) | Not used any more | Can be deactivated |
| Social Bar (`28762417`) | Inactive, not used | — |

- **Adsterra rotates serving domains.** If ads stop loading and the console shows `ERR_SSL_UNRECOGNIZED_NAME_ALERT`, open Adsterra → Websites → the unit → **GET CODE**, and update `adConfig.js`.
- **Units go "Inactive"** after a period without traffic — click **RESUBMIT**, then get fresh code.
- Ads may not serve on `localhost`; test on `mypeercloud.in`.
- **Never force or incentivize ad clicks** ("click the ad to continue") — it violates Adsterra policy and gets accounts banned. Native Banner and Smartlink pay per impression/visit, no click needed.
- If the Native Banner shows suggestive creatives, check the unit's category filters or ask Adsterra support to block adult/suggestive ads.
- Two commented-out scripts in `seedr-web/index.html` (lines ~92, ~95) point to old dead domains — harmless, can be removed.

---

## 8. Testing done

- End-to-end server test (stubbed DB, real routes): **27/27 passed**, covering: free browse has no links, paid links work, old/forged links rejected, byte routes blocked, path traversal refused, early completion refused, other user can't use my ticket, same-ticket retry allowed, IP binding, garbage/forged tickets rejected, ticket can't be used as a download link, multi-tab spacing, folder ZIP via ad link, ticket survives server restart, paid users skip.
- Frontend: ESLint clean for all new/changed files; `vite build` passes.
- Manual (by you, Chrome/Edge on localhost): the Native Banner ad shows and the link comes through after the countdown. Still to check: the Smartlink tab, the latest no-error changes, and everything on the live site.

---

## 9. Before deploying — ⚠️ BLOCKER: mobile app

The Expo app (`seedr-app`) reads `streamUrl` / `downloadUrl` / `directUrl` from `/files/browse` (`seedr-app/src/components/FileItem.tsx:67-98`). After this deploy, **free users in the mobile app will have non-working Play, Download and Copy buttons**. Paid users are unaffected.

The server can't safely exempt the app (any app identifier can be copied by website users to bypass ads).

- **App not released / only you use it** → deploy now, add the ad gate to the app before release.
- **App has real users** → first add an ad-gate screen to the app (using the same `/files/ad/start` + `/files/ad/complete` endpoints), release it, then deploy the server.

---

## 10. Deployment checklist

1. **Backend:** `git pull` → `pm2 restart seedr-server` (no new npm packages, no DB migration).
2. **Frontend:** in `seedr-web`, `npm run build` and deploy the new `dist/`. Backend and frontend must go out **together** — an old frontend with the new backend leaves free users with no links and no ad gate.
3. Confirm **`JWT_SECRET`** is set in the production `.env` (falls back to `change-me` otherwise).
4. **Smoke test on the live site:**
   - Free user: Download, Play, Copy link (ad + 10 s countdown + Smartlink tab).
   - Paid user: instant, no modal, no ads.
   - Adsterra Native Banner and Smartlink appear on `mypeercloud.in`.
5. If free users on mobile data report "link doesn't work": set `AD_GATE_BIND_IP=false` and restart.

---

## 11. Separate security issue found (not yet fixed)

nginx forwards the client's own `X-Forwarded-For` header (`$proxy_add_x_forwarded_for`) and the server uses `app.set('trust proxy', true)`, which trusts the **leftmost** (client-controlled) value. Result: **anyone can fake their IP** to the server.

- Impact on ads: minor (only weakens the IP binding of ad links).
- **Bigger impact: the admin IP whitelist relies on `req.ip` and can be bypassed** by sending a fake `X-Forwarded-For`.
- Fix: trust only the real proxy hop, e.g. `app.set('trust proxy', 1)` (nginx only) or Cloudflare's IP ranges if behind Cloudflare. Recommended soon.

---

## 12. Known limitations

- Download managers (IDM etc.) can't resume a free user's download after the 15-minute link expiry — they must watch the ad again (upgrade incentive).
- Rate-limit and spacing counters are in memory — reset on restart (harmless) and not shared if the server is ever run as multiple instances.
- Smartlink opens as a foreground tab (browsers don't allow true pop-unders from a script).







Nearly. First I'll check what's changed and whether anything else uses these APIs (your branch is called seedr-app, so there may be a mobile app):

  Searched for 1 pattern, ran 1 shell command

You've already committed everything. There's also a seedr-app folder, which is probably a mobile app. I'll check whether it relies on the file links I removed for free users:

  Searched for 2 patterns, listed 1 directory, ran 1 shell command

The mobile app reads the same file links the website used to. I'll check the deployment guide for how requests reach the server, since the IP binding depends on that:

  Searched for 1 pattern

The website side is ready to deploy. One issue needs a decision first, though: your mobile app (seedr-app) will break for free users.

The problem: the mobile app

The Expo app gets file links from the same /files/browse endpoint (seedr-app/src/components/FileItem.tsx:67-98). Once this is on the server, free users in the app get no links, so Play, Download and Copy link stop working. The buttons will do nothing or fail quietly, which looks broken. Paid users in the app are unaffected.

I can't safely exempt the app on the server. Anything the app sends to identify itself, like a header, can be copied by a website user to skip the ads.

So it depends on the app's status:
- Not released yet, or only you use it: deploy now and add the ad screen to the app before releasing it.
- Real users already use it: don't deploy yet. First I'd add an ad screen to the app (it would call the same /files/ad/start and /files/ad/complete endpoints), release that version, then deploy the server.

Is the mobile app live with users?

Deploy checklist (once the app question is settled)

1. Backend: git pull, then pm2 restart seedr-server. There are no new npm packages and no database changes.
2. Frontend: npm run build in seedr-web and deploy the new dist/. Users on the old frontend would get stuck: no links, and no ad screen to get them.
3. Check that JWT_SECRET is set in the production .env. Download links and ad tickets are signed with it, and the code falls back to change-me if it's missing.
4. Test on the live site as a free user (Download, Play and Copy link) and as a paid user (instant, no ads). Also check that the Adsterra ad and Smartlink appear on mypeercloud.in.
5. If any free user reports "link doesn't work" on mobile data: set AD_GATE_BIND_IP=false in the backend .env and restart. That turns off the check that ties links to the user's IP.

A separate security issue I found

Your nginx setup forwards the client's own X-Forwarded-For header, and the server trusts it completely (trust proxy: true). That means anyone can fake their IP address to the server. It barely affects the ad links, but your admin IP whitelist relies on the same IP check, so it can be bypassed by faking the header. The fix is a one-line change to how the server trusts the proxy. It's separate from the ads, but I'd fix it soon; I can do it whenever you want.
