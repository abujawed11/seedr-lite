// Ad gate: free-plan users must sit through a short ad before they get a
// working stream/download link. Enforcement is entirely server-side:
//
//  1. /files/browse no longer returns signed links to free users.
//  2. POST /files/ad/start returns a signed "ad ticket" (a JWT) recording
//     who started an ad, for which file, and when (server clock). Nothing is
//     stored server-side, so a server restart never breaks an ad in progress.
//  3. POST /files/ad/complete verifies the ticket and only succeeds once
//     AD_GATE_WAIT_SECONDS have really passed. Each user gets at most one link
//     per AD_GATE_WAIT_SECONDS, however many tabs/tickets they use, so one ad
//     can't unlock many files. It then issues a short-lived link carrying an
//     `ad: true` claim (optionally bound to the caller's IP).
//  4. /files/direct and /direct reject any link for a free user unless it
//     carries that claim, so old, leaked or shared links stop working.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const database = require('../models/database');

const ENABLED = process.env.AD_GATE_ENABLED !== 'false';
const WAIT_SECONDS = Math.max(1, Number(process.env.AD_GATE_WAIT_SECONDS || 10));
const DOWNLOAD_LINK_TTL = Number(process.env.AD_GATE_DOWNLOAD_TTL_SECONDS || 15 * 60);
const STREAM_LINK_TTL = Number(process.env.AD_GATE_STREAM_TTL_SECONDS || 4 * 3600);
const BIND_IP = process.env.AD_GATE_BIND_IP !== 'false';
const MAX_STARTS_PER_HOUR = Number(process.env.AD_GATE_MAX_PER_HOUR || 60);
const TICKET_TTL_SECONDS = 10 * 60;
const PLAN_CACHE_MS = 60 * 1000;
const BASE_SECRET = process.env.JWT_SECRET || 'change-me';
// Separate key so a ticket can never be used as a download link (or vice versa)
const TICKET_SECRET = crypto.createHash('sha256').update(`${BASE_SECRET}:ad-ticket`).digest();
const IP_SALT = BASE_SECRET;

const KINDS = new Set(['stream', 'download', 'folder']);

// Best-effort, in-memory only. Losing these on restart is harmless.
const startLog = new Map();      // userId -> [timestamps] for rate limiting
const lastCompleted = new Map(); // userId -> { at, jti } for the one-link-per-wait rule
const exemptCache = new Map();   // userId -> { exempt, at }

function isExemptUser(user) {
  if (!ENABLED) return true;
  if (!user) return false;
  if (user.role === 'admin') return true;
  return !!user.plan && user.plan !== 'free';
}

async function isExemptUserId(userId) {
  if (!ENABLED) return true;
  if (!userId) return false;
  const cached = exemptCache.get(userId);
  if (cached && Date.now() - cached.at < PLAN_CACHE_MS) return cached.exempt;
  let exempt = false;
  try {
    exempt = isExemptUser(await database.getUserById(userId));
  } catch (e) {
    console.error('adGate: user lookup failed', e.message);
  }
  exemptCache.set(userId, { exempt, at: Date.now() });
  return exempt;
}

function clientIp(req) {
  // req.ip is safe (see 'trust proxy' in server.js). Don't read CF-Connecting-IP
  // or X-Forwarded-For directly: without Cloudflare in front, clients can fake them.
  const raw = req.ip || req.socket?.remoteAddress || '';
  return String(raw).replace(/^::ffff:/, '');
}

// Store a salted hash rather than the raw IP (JWT payloads are readable).
function ipFingerprint(req) {
  return crypto.createHash('sha256').update(`${IP_SALT}:${clientIp(req)}`).digest('base64url').slice(0, 22);
}

function startSession(userId, { path, kind }) {
  if (!KINDS.has(kind)) return { error: 'Invalid kind', status: 400 };

  const now = Date.now();
  const recent = (startLog.get(userId) || []).filter((t) => now - t < 3600 * 1000);
  if (recent.length >= MAX_STARTS_PER_HOUR) {
    return { error: 'Too many requests, please try again later', status: 429 };
  }
  recent.push(now);
  startLog.set(userId, recent);

  const ticket = jwt.sign(
    { typ: 'ad-ticket', uid: userId, p: path, k: kind, st: now, jti: crypto.randomBytes(12).toString('base64url') },
    TICKET_SECRET,
    { expiresIn: TICKET_TTL_SECONDS }
  );

  // Exposed to the client as `sessionId` (an opaque string to it)
  return { sessionId: ticket, waitSeconds: WAIT_SECONDS };
}

function completeSession(userId, ticket) {
  let t;
  try {
    t = jwt.verify(String(ticket || ''), TICKET_SECRET);
  } catch (e) {
    const expired = e.name === 'TokenExpiredError';
    return { error: expired ? 'Ad session expired' : 'Ad session not found', status: expired ? 410 : 404 };
  }
  if (t.typ !== 'ad-ticket' || t.uid !== userId || !KINDS.has(t.k)) {
    return { error: 'Ad session not found', status: 404 };
  }

  const now = Date.now();
  const required = WAIT_SECONDS * 1000;

  // The ad itself must have been on screen for the full wait
  const elapsed = now - t.st;
  if (elapsed < required) {
    return { error: 'Ad not finished yet', status: 425, retryAfterMs: required - elapsed };
  }

  // At most one link per wait period per user, across all tabs/tickets.
  // Re-completing the SAME ticket (e.g. a client retry) is always allowed.
  const last = lastCompleted.get(userId);
  if (last && last.jti !== t.jti && now - last.at < required) {
    return { error: 'Please wait a moment', status: 425, retryAfterMs: required - (now - last.at) };
  }
  if (!last || last.jti !== t.jti) lastCompleted.set(userId, { at: now, jti: t.jti });

  return { session: { userId, path: t.p, kind: t.k } };
}

// Build the JWT payload for a link issued after a completed ad.
function adLinkPayload(req, { userId, path, kind }) {
  const payload = {
    path,
    userId,
    asAttachment: kind !== 'stream',
    ad: true,
  };
  if (kind === 'folder') payload.isFolder = true;
  if (BIND_IP) payload.ip = ipFingerprint(req);
  return payload;
}

function linkTtl(kind) {
  return kind === 'stream' ? STREAM_LINK_TTL : DOWNLOAD_LINK_TTL;
}

// Called by every public /direct handler after the token signature is verified.
async function checkDirectAccess(payload, req) {
  if (await isExemptUserId(payload.userId)) return { ok: true };
  if (payload.ad !== true) return { ok: false, reason: 'Ad required' };
  if (BIND_IP && payload.ip && payload.ip !== ipFingerprint(req)) {
    return { ok: false, reason: 'Link is not valid from this network' };
  }
  return { ok: true };
}

// Express middleware for authenticated routes that serve file bytes directly
// (/files/stream, /files/download, /stream/:id/:i, ...). The web app never uses
// these, so free users are simply refused instead of skipping the ad.
function requireAdExempt(req, res, next) {
  if (isExemptUser(req.user)) return next();
  return res.status(403).json({ error: 'Ad required', adRequired: true });
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, times] of startLog) {
    const recent = times.filter((t) => now - t < 3600 * 1000);
    if (recent.length) startLog.set(userId, recent);
    else startLog.delete(userId);
  }
  for (const [userId, c] of lastCompleted) {
    if (now - c.at > WAIT_SECONDS * 1000) lastCompleted.delete(userId);
  }
  for (const [userId, c] of exemptCache) {
    if (now - c.at > PLAN_CACHE_MS) exemptCache.delete(userId);
  }
}, 60 * 1000).unref();

module.exports = {
  KINDS,
  isExemptUser,
  isExemptUserId,
  startSession,
  completeSession,
  adLinkPayload,
  linkTtl,
  checkDirectAccess,
  requireAdExempt,
};
