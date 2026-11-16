// Ad gate: free-plan users must sit through a short ad before they get a
// working stream/download link. Enforcement is entirely server-side:
//
//  1. /files/browse no longer returns signed links to free users.
//  2. POST /files/ad/start opens an "ad session" for one file/folder and
//     records when it started (server clock).
//  3. POST /files/ad/complete only succeeds once AD_GATE_WAIT_SECONDS have
//     really passed. It then issues a short-lived, single-purpose link
//     carrying an `ad: true` claim (optionally bound to the caller's IP).
//  4. /files/direct and /direct reject any link for a free user unless it
//     carries that claim, so old, leaked or shared links stop working.

const crypto = require('crypto');
const database = require('../models/database');

const ENABLED = process.env.AD_GATE_ENABLED !== 'false';
const WAIT_SECONDS = Math.max(1, Number(process.env.AD_GATE_WAIT_SECONDS || 10));
const DOWNLOAD_LINK_TTL = Number(process.env.AD_GATE_DOWNLOAD_TTL_SECONDS || 15 * 60);
const STREAM_LINK_TTL = Number(process.env.AD_GATE_STREAM_TTL_SECONDS || 4 * 3600);
const BIND_IP = process.env.AD_GATE_BIND_IP !== 'false';
const MAX_STARTS_PER_HOUR = Number(process.env.AD_GATE_MAX_PER_HOUR || 60);
const SESSION_TTL_MS = 10 * 60 * 1000;
const PLAN_CACHE_MS = 60 * 1000;
const IP_SALT = process.env.JWT_SECRET || 'change-me';

const KINDS = new Set(['stream', 'download', 'folder']);

const sessions = new Map();     // sessionId -> { userId, path, kind, startedAt }
const activeByUser = new Map(); // userId -> sessionId (one pending ad per user)
const startLog = new Map();     // userId -> [timestamps] for rate limiting
const exemptCache = new Map();  // userId -> { exempt, at }

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
  const raw = req.headers['cf-connecting-ip'] || req.ip || req.socket?.remoteAddress || '';
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

  // Only one pending ad per user: opening a new one cancels the previous, so
  // a single ad can't be "watched" in parallel for many files.
  const previous = activeByUser.get(userId);
  if (previous) sessions.delete(previous);

  const sessionId = crypto.randomBytes(24).toString('base64url');
  sessions.set(sessionId, { userId, path, kind, startedAt: now });
  activeByUser.set(userId, sessionId);

  return { sessionId, waitSeconds: WAIT_SECONDS };
}

function completeSession(userId, sessionId) {
  const session = sessionId && sessions.get(sessionId);
  if (!session || session.userId !== userId) {
    return { error: 'Ad session not found or expired', status: 404 };
  }

  const elapsed = Date.now() - session.startedAt;
  if (elapsed > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    if (activeByUser.get(userId) === sessionId) activeByUser.delete(userId);
    return { error: 'Ad session expired', status: 410 };
  }

  const required = WAIT_SECONDS * 1000;
  if (elapsed < required) {
    return { error: 'Ad not finished yet', status: 425, retryAfterMs: required - elapsed };
  }

  // Single use
  sessions.delete(sessionId);
  if (activeByUser.get(userId) === sessionId) activeByUser.delete(userId);
  return { session };
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
  for (const [id, s] of sessions) {
    if (now - s.startedAt > SESSION_TTL_MS) {
      sessions.delete(id);
      if (activeByUser.get(s.userId) === id) activeByUser.delete(s.userId);
    }
  }
  for (const [userId, times] of startLog) {
    const recent = times.filter((t) => now - t < 3600 * 1000);
    if (recent.length) startLog.set(userId, recent);
    else startLog.delete(userId);
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
