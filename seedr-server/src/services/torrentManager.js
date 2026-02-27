// src/services/torrentManager.js — aria2-based torrent manager
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { getTrackers } = require('../utils/trackers');
const database = require('../models/database');
const { getUserStorageDir, ensureUserStorageDir } = require('../utils/storage');

const ARIA2_PORT = process.env.ARIA2_PORT || 6800;
const ARIA2_HOST = process.env.ARIA2_HOST || '127.0.0.1';
const ARIA2_RPC_URL = `http://${ARIA2_HOST}:${ARIA2_PORT}/jsonrpc`;
const ARIA2_SECRET = process.env.ARIA2_SECRET || 'seedr_aria2_secret';
const ROOT = process.env.ROOT || './src/storage/library';

// ARIA2_CONTAINER_DIR: the path aria2 sees inside Docker (e.g. /downloads)
// When set, file paths returned by aria2 are translated to host paths.
const ARIA2_CONTAINER_DIR = process.env.ARIA2_CONTAINER_DIR || null;

// ARIA2_MODE=docker → skip spawning aria2 locally (it runs in Docker)
const DOCKER_MODE = process.env.ARIA2_MODE === 'docker';

// ===================== IN-MEMORY STATE =====================

// Store quota exceeded & completion notifications for frontend
const quotaExceededNotifications = new Map(); // userId -> [notifications]

// Per-user download tracking
const userGids = new Map();      // userId -> Set<gid>
const gidInfo = new Map();       // gid -> { userId, infoHash, name, addedAt, quotaValidated, done }
const infoHashToGid = new Map(); // infoHash -> gid

// ===================== SSE REGISTRY =====================

const sseClients = new Map(); // userId -> Set<Response>

function registerSSEClient(userId, res) {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
}

function unregisterSSEClient(userId, res) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  clients.delete(res);
  if (clients.size === 0) sseClients.delete(userId);
}

function pushToUser(userId, event, data) {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...clients]) {
    try {
      res.write(payload);
    } catch (e) {
      clients.delete(res); // dead connection
    }
  }
  if (clients.size === 0) sseClients.delete(userId);
}

let aria2Process = null;

// Clear stale notifications on startup
console.log('🧹 STARTUP: Clearing all in-memory notifications from previous session');
quotaExceededNotifications.clear();

// ===================== ARIA2 PROCESS =====================

function startAria2() {
  if (aria2Process) return;

  const args = [
    '--enable-rpc',
    '--rpc-listen-all=false',
    `--rpc-listen-port=${ARIA2_PORT}`,
    `--rpc-secret=${ARIA2_SECRET}`,
    '--seed-ratio=0',
    '--seed-time=0',
    '--max-connection-per-server=16',
    '--split=16',
    '--min-split-size=1M',
    '--bt-enable-lpd=true',
    '--continue=true',
    '--always-resume=true',
    '--file-allocation=none',
    '--console-log-level=warn',
    '--quiet=true',
    `--dir=${path.resolve(ROOT)}`,
    '--bt-seed-unverified=true',
    '--follow-torrent=true',
    '--bt-save-metadata=true',
    '--dht-entry-point=dht.transmissionbt.com:6881'
  ];

  console.log('🚀 ARIA2: Starting aria2c process...');

  aria2Process = spawn('aria2c', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  aria2Process.stdout.on('data', d => process.stdout.write(`[aria2] ${d}`));
  aria2Process.stderr.on('data', d => process.stderr.write(`[aria2] ${d}`));

  aria2Process.on('spawn', () => {
    console.log('✅ ARIA2: aria2c started successfully');
  });

  aria2Process.on('error', (err) => {
    console.error('❌ ARIA2: Failed to start aria2c:', err.message);
    console.error('💡 Please install aria2:');
    console.error('   Windows: choco install aria2  (or scoop install aria2)');
    console.error('   Linux:   sudo apt install aria2');
    console.error('   macOS:   brew install aria2');
    aria2Process = null;
  });

  aria2Process.on('exit', (code, signal) => {
    console.log(`aria2c exited (code=${code}, signal=${signal})`);
    aria2Process = null;
    // Auto-restart unless intentionally killed
    if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
      setTimeout(startAria2, 3000);
    }
  });

  // Graceful shutdown
  const killAria2 = () => { if (aria2Process) { aria2Process.kill('SIGTERM'); } };
  process.once('exit', killAria2);
  process.once('SIGINT', () => { killAria2(); process.exit(0); });
  process.once('SIGTERM', () => { killAria2(); process.exit(0); });
}

// ===================== ARIA2 RPC =====================

async function rpc(method, ...params) {
  try {
    const response = await axios.post(ARIA2_RPC_URL, {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: `aria2.${method}`,
      params: [`token:${ARIA2_SECRET}`, ...params]
    }, { timeout: 10000 });

    if (response.data.error) {
      throw new Error(`aria2 [${response.data.error.code}]: ${response.data.error.message}`);
    }
    return response.data.result;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('aria2 RPC unreachable — is aria2c running?');
    }
    throw err;
  }
}

// ===================== UTILITIES =====================

function humanBytes(bytes) {
  const thresh = 1024;
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  if (Math.abs(bytes) < thresh) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let u = -1;
  do { bytes /= thresh; ++u; }
  while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return `${bytes.toFixed(u < 2 ? 0 : 2)} ${units[u]}`;
}

function extractNameFromMagnet(magnet) {
  try {
    const dnMatch = magnet.match(/[?&]dn=([^&]+)/);
    if (dnMatch) return decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
  } catch (e) {}
  return null;
}

// Extract infoHash from a magnet URI (always available in a valid magnet link).
// e.g. magnet:?xt=urn:btih:abc123... → 'abc123'
function extractInfoHashFromMagnet(magnet) {
  const match = magnet.match(/xt=urn:btih:([a-f0-9]{40}|[a-z2-7]{32})/i);
  return match ? match[1].toLowerCase() : null;
}

// Translate aria2's container-internal path to the host filesystem path.
// e.g. /downloads/users/abc/hash/file.mp4 → ROOT\users\abc\hash\file.mp4
function containerToHostPath(containerPath) {
  if (!ARIA2_CONTAINER_DIR || !containerPath) return containerPath;
  const containerBase = ARIA2_CONTAINER_DIR.replace(/\\/g, '/');
  const normalized = containerPath.replace(/\\/g, '/');
  if (normalized.startsWith(containerBase)) {
    const hostBase = path.resolve(ROOT);
    const relativePart = normalized.slice(containerBase.length);
    return path.join(hostBase, relativePart);
  }
  return containerPath;
}

// Get the directory to pass to aria2 for a specific user's downloads.
// We no longer use infoHash as a subdirectory to keep the file explorer clean.
// Structure: ROOT/users/<userId>/
function getAria2Dir(userId) {
  const hostUserDir = ensureUserStorageDir(userId);

  if (ARIA2_CONTAINER_DIR) {
    return `${ARIA2_CONTAINER_DIR}/users/${userId}`;
  }
  return hostUserDir;
}

function toSummary(status, meta) {
  const totalLength = parseInt(status.totalLength || 0);
  const completedLength = parseInt(status.completedLength || 0);
  const progress = totalLength > 0 ? Number(((completedLength / totalLength) * 100).toFixed(2)) : 0;
  const name = status.bittorrent?.info?.name || meta?.name || 'Unknown';
  const infoHash = status.infoHash || meta?.infoHash;

  const files = (status.files || []).map((f, i) => ({
    index: i,
    name: path.basename(f.path || ''),
    path: containerToHostPath(f.path || ''), // Translate Docker path → host path
    length: parseInt(f.length || 0)
  }));

  return {
    id: infoHash || status.gid,
    gid: status.gid,
    name,
    progress,
    downloaded: humanBytes(completedLength),
    length: humanBytes(totalLength),
    downloadSpeed: `${humanBytes(parseInt(status.downloadSpeed || 0))}/s`,
    uploadSpeed: `${humanBytes(parseInt(status.uploadSpeed || 0))}/s`,
    numPeers: parseInt(status.numSeeders || 0) + parseInt(status.connections || 0),
    files,
    done: status.status === 'complete',
    status: status.status,
    infoHash
  };
}

// ===================== GID LIFECYCLE =====================

function cleanupGid(gid, userId) {
  const meta = gidInfo.get(gid);
  if (meta?.infoHash) infoHashToGid.delete(meta.infoHash);
  gidInfo.delete(gid);
  if (userGids.has(userId)) {
    userGids.get(userId).delete(gid);
  }
}

// ===================== QUOTA VALIDATION =====================

async function validateQuotaForGid(gid, userId, status) {
  const meta = gidInfo.get(gid);
  if (!meta || meta.quotaValidated) return;

  const totalLength = parseInt(status.totalLength || 0);
  if (totalLength === 0) return;

  try {
    const quotaInfo = await database.getUserStorageInfoWithReservations(userId);
    const availableSpace = quotaInfo.effectiveRemaining;

    console.log(`🔍 QUOTA CHECK: ${meta.name} - ${humanBytes(totalLength)} vs available ${humanBytes(availableSpace)}`);

    if (totalLength > availableSpace) {
      console.log(`❌ QUOTA EXCEEDED: Removing ${meta.name}`);
      meta.quotaValidated = true;

      try { await rpc('forceRemove', gid); } catch (e) {}

      const safeAvailableSpace = (typeof availableSpace === 'number' && !isNaN(availableSpace))
        ? humanBytes(availableSpace) : '0 B';

      addQuotaExceededNotification(userId, {
        torrentName: meta.name || 'Unknown',
        torrentSize: humanBytes(totalLength),
        availableSpace: safeAvailableSpace,
        timestamp: new Date().toISOString()
      });

      cleanupGid(gid, userId);
      return;
    }

    console.log(`✅ QUOTA OK: ${meta.name}`);
    meta.quotaValidated = true;

    const infoHash = status.infoHash;
    if (infoHash) {
      try {
        await database.reservations._run(
          `DELETE FROM storage_reservations WHERE user_id=? AND info_hash=?`,
          [userId, infoHash]
        );
        await database.reserveSpaceAtomic(userId, infoHash, totalLength);
        console.log(`✅ Space reserved: ${humanBytes(totalLength)}`);
      } catch (err) {
        console.warn('⚠️ Reservation failed but quota OK:', err.message);
      }
    }
  } catch (err) {
    console.error('Error during quota validation:', err.message);
  }
}

// ===================== DOWNLOAD COMPLETION =====================

async function handleDownloadComplete(gid, status, userId) {
  const meta = gidInfo.get(gid);
  if (!meta || meta.done) return;
  meta.done = true;

  const name = status.bittorrent?.info?.name || meta?.name || 'Unknown';
  const totalLength = parseInt(status.totalLength || 0);
  const infoHash = status.infoHash;

  console.log(`🎉 Download complete: ${name} for user ${userId}`);

  if (infoHash) {
    try {
      await database.updateProgressiveStorage(userId, infoHash, totalLength);
      await database.finalizeReservation(userId, infoHash, totalLength);
      console.log(`✅ Storage finalized: ${humanBytes(totalLength)}`);
    } catch (err) {
      console.error('Error finalizing reservation:', err.message);
      try { await database.releaseReservation(userId, infoHash); } catch (e) {}
    }
  }

  addCompletionNotification(userId, {
    torrentName: name,
    torrentSize: humanBytes(totalLength),
    infoHash,
    timestamp: new Date().toISOString()
  });

  try {
    await database.logActivity({
      userId,
      username: 'system',
      actionType: 'torrent_complete',
      torrentName: name,
      torrentHash: infoHash,
      fileSize: totalLength,
      filePath: 'download_complete'
    });
  } catch (err) {
    console.warn('Failed to log completion:', err.message);
  }

  try { await rpc('removeDownloadResult', gid); } catch (err) {}

  cleanupGid(gid, userId);
}

// ===================== CONTENT GID SWITCHING =====================

// When a magnet's metadata GID completes, aria2 starts the real content download
// under a NEW GID reported in status.followedBy[]. This function switches all
// in-memory tracking from the metadata GID to the content GID.
async function switchToContentGid(metadataGid, contentGid, userId) {
  // Guard against double-switch race conditions
  if (gidInfo.has(contentGid)) return;
  const meta = gidInfo.get(metadataGid);
  if (!meta) return;

  console.log(`🔄 Switching tracking: metadata GID ${metadataGid} → content GID ${contentGid}`);

  // Register content GID with the same metadata, no longer marked as metadata-only
  gidInfo.set(contentGid, {
    ...meta,
    gid: contentGid,
    isMetadata: false,
    quotaValidated: false, // Content size is different from metadata size — re-validate
    done: false
  });

  // Update infoHash → GID mapping
  if (meta.infoHash) infoHashToGid.set(meta.infoHash, contentGid);

  // Update user's GID set
  if (userGids.has(userId)) {
    userGids.get(userId).delete(metadataGid);
    userGids.get(userId).add(contentGid);
  }

  // Remove the metadata GID entry
  gidInfo.delete(metadataGid);

  // Pull infoHash from content status if aria2 has it
  try {
    const contentStatus = await rpc('tellStatus', contentGid);
    if (contentStatus.infoHash) {
      const m = gidInfo.get(contentGid);
      if (m) m.infoHash = contentStatus.infoHash;
      infoHashToGid.set(contentStatus.infoHash, contentGid);
    }
  } catch (e) {}
}

// ===================== POLLING =====================

async function pollDownloads() {
  if (gidInfo.size === 0) return;

  try {
    const [active, waiting] = await Promise.all([
      rpc('tellActive').catch(() => []),
      rpc('tellWaiting', 0, 100).catch(() => [])
    ]);

    const allDownloads = [...active, ...waiting];

    for (const status of allDownloads) {
      const gid = status.gid;
      const meta = gidInfo.get(gid);
      if (!meta) continue;

      const { userId } = meta;

      // ── Metadata GID handling ──────────────────────────────────────────────
      // Metadata GIDs are the small initial download aria2 uses to fetch
      // torrent info from a magnet link (~3KiB). Once complete, aria2 creates
      // the real content download and reports it in status.followedBy[].
      if (meta.isMetadata) {
        // Update name while metadata is fetching
        const btName = status.bittorrent?.info?.name;
        if (btName && btName !== meta.name) meta.name = btName;

        // When metadata completes, followedBy contains the content GID
        if (status.followedBy && status.followedBy.length > 0) {
          await switchToContentGid(gid, status.followedBy[0], userId);
        }
        // Never do quota/progress/completion logic on metadata GIDs
        continue;
      }

      // ── Content GID handling ───────────────────────────────────────────────

      // Update infoHash mapping when available
      if (status.infoHash && status.infoHash !== meta.infoHash) {
        meta.infoHash = status.infoHash;
        infoHashToGid.set(status.infoHash, gid);
        console.log(`🔑 Got infoHash: ${status.infoHash} for "${meta.name || gid}"`);
      }

      // Update name when available
      const btName = status.bittorrent?.info?.name;
      if (btName && btName !== meta.name) {
        meta.name = btName;
      }

      // Quota validation when total content size is known
      if (!meta.quotaValidated && parseInt(status.totalLength || 0) > 0) {
        await validateQuotaForGid(gid, userId, status);
      }

      // Progressive storage update
      if (meta.quotaValidated && meta.infoHash) {
        const completedLength = parseInt(status.completedLength || 0);
        if (completedLength > 0) {
          database.updateProgressiveStorage(userId, meta.infoHash, completedLength).catch(() => {});
        }
      }

      // Completion
      if (status.status === 'complete' && !meta.done) {
        await handleDownloadComplete(gid, status, userId);
      }
    }

    // Check for GIDs that disappeared (errored or manually removed)
    const activeGids = new Set(allDownloads.map(s => s.gid));
    for (const [gid, meta] of gidInfo.entries()) {
      if (!activeGids.has(gid)) {
        try {
          const status = await rpc('tellStatus', gid);
          // Check followedBy even on completed metadata GIDs
          if (meta.isMetadata && status.followedBy?.length > 0) {
            await switchToContentGid(gid, status.followedBy[0], meta.userId);
          } else if (status.status === 'error') {
            console.error(`❌ Download error for "${meta.name}": ${status.errorMessage}`);
            cleanupGid(gid, meta.userId);
          } else if (status.status === 'complete' && !meta.isMetadata && !meta.done) {
            await handleDownloadComplete(gid, status, meta.userId);
          }
        } catch (err) {
          // Only cleanup when aria2 definitively says GID doesn't exist.
          // Transient RPC errors must not wipe an active download from memory.
          const isGidNotFound = err.message?.includes('not found') || err.message?.includes('GID');
          if (isGidNotFound) {
            cleanupGid(gid, meta.userId);
          }
        }
      }
    }

    // Push fresh torrent state to every connected SSE client
    if (sseClients.size > 0) {
      for (const userId of sseClients.keys()) {
        listTorrents(userId)
          .then(torrents => pushToUser(userId, 'torrent_update', torrents))
          .catch(() => {});
      }
    }
  } catch (err) {
    if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('unreachable')) {
      console.error('Poll error:', err.message);
    }
  }
}

// Poll every 3 seconds
setInterval(pollDownloads, 3000);

// Stats every 2 minutes
setInterval(() => {
  if (gidInfo.size > 0) {
    console.log(`📊 ARIA2 STATS: ${gidInfo.size} downloads across ${userGids.size} users`);
  }
}, 2 * 60 * 1000);

// ===================== STARTUP STATE RESTORE =====================

async function restoreStateFromAria2() {
  // Wait until aria2 is reachable (spawned locally it needs a few seconds;
  // in Docker mode it may already be up but can still take a moment).
  const MAX_RETRIES = 15;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await rpc('getVersion');
      break; // connected
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.warn('⚠️ STARTUP RESTORE: Could not connect to aria2 — skipping state restore');
        // Still clean up all active reservations since nothing is running
        await database.reservations.cleanupStaleReservations([]).catch(() => {});
        return;
      }
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  try {
    // tellWaiting covers both queued AND paused downloads in aria2
    const [active, waiting] = await Promise.all([
      rpc('tellActive').catch(() => []),
      rpc('tellWaiting', 0, 1000).catch(() => [])
    ]);

    const allDownloads = [...active, ...waiting];
    let restored = 0;

    for (const status of allDownloads) {
      const infoHash = status.infoHash;
      if (!infoHash) continue; // metadata GIDs not yet resolved — skip

      const reservation = await database.reservations.getActiveReservationByInfoHash(infoHash);
      if (!reservation) continue; // no DB record → not our download

      const userId = reservation.user_id;
      const gid = status.gid;

      if (!userGids.has(userId)) userGids.set(userId, new Set());
      userGids.get(userId).add(gid);

      gidInfo.set(gid, {
        userId,
        gid,
        isMetadata: false,
        infoHash,
        name: status.bittorrent?.info?.name || '',
        addedAt: Date.now(),
        quotaValidated: true, // already validated when originally added
        done: false
      });

      infoHashToGid.set(infoHash, gid);
      restored++;
    }

    console.log(`🔄 STARTUP RESTORE: Recovered ${restored} download(s) from aria2`);

    // Now cleanup reservations for torrents that are no longer in aria2
    const activeHashes = [...gidInfo.values()].filter(m => m.infoHash).map(m => m.infoHash);
    const cleanedCount = await database.reservations.cleanupStaleReservations(activeHashes);
    if (cleanedCount > 0) {
      console.log(`✅ STARTUP CLEANUP: Released ${cleanedCount} stale reservation(s)`);
      await database.logActivity({
        userId: null,
        username: 'system',
        actionType: 'reservation_cleanup',
        fileSize: cleanedCount,
        torrentName: 'smart_cleanup_startup'
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Startup restore error:', err.message);
  }
}

// Give aria2 time to start before attempting restore.
// Docker mode: aria2 is usually already running, so a shorter delay is fine.
setTimeout(restoreStateFromAria2, DOCKER_MODE ? 3000 : 5000);

// ===================== PUBLIC API =====================

async function addMagnet(magnet, userId) {
  // Extract infoHash from the magnet URI — always available in a valid magnet link.
  const infoHashFromMagnet = extractInfoHashFromMagnet(magnet);

  // Deduplicate: if this infoHash is already tracked in memory, return the live status
  // instead of queuing a second aria2 task for the same torrent.
  if (infoHashFromMagnet && infoHashToGid.has(infoHashFromMagnet)) {
    const existingGid = infoHashToGid.get(infoHashFromMagnet);
    const existingMeta = gidInfo.get(existingGid);
    if (existingMeta && existingMeta.userId === userId) {
      try {
        const status = await rpc('tellStatus', existingGid);
        console.log(`♻️ Duplicate add ignored — returning existing download: ${existingMeta.name}`);
        return toSummary(status, existingMeta);
      } catch (e) {
        // GID is stale (aria2 lost it) — fall through to re-add
        cleanupGid(existingGid, userId);
      }
    }
  }

  const aria2Dir = getAria2Dir(userId);
  const trackers = getTrackers();

  console.log(`📁 Adding torrent for user ${userId} → ${aria2Dir}`);

  const options = {
    dir: aria2Dir,
    'seed-ratio': '0',
    'seed-time': '0',
    'max-connection-per-server': '16',
    'split': '16',
    'min-split-size': '1M',
    'bt-tracker': trackers.join(',')
  };

  const gid = await rpc('addUri', [magnet], options);
  console.log(`✅ Torrent queued in aria2, gid=${gid}`);

  if (!userGids.has(userId)) userGids.set(userId, new Set());
  userGids.get(userId).add(gid);

  // Pre-populate infoHash from the magnet link so we don't have to wait for aria2
  if (infoHashFromMagnet) {
    infoHashToGid.set(infoHashFromMagnet, gid);
  }

  // Mark as metadata GID — the real content download comes later via followedBy
  gidInfo.set(gid, {
    userId,
    gid,
    isMetadata: true,
    infoHash: infoHashFromMagnet,
    name: extractNameFromMagnet(magnet),
    addedAt: Date.now(),
    quotaValidated: false,
    done: false
  });

  // Wait for aria2 to fetch metadata and report the content GID in followedBy.
  // Once we have the content GID, switch tracking and resolve with its summary.
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 120000; // 2 min for metadata fetch

    const poll = setInterval(async () => {
      try {
        // Check if the polling loop already switched us to a content GID
        const contentGid = infoHashFromMagnet ? infoHashToGid.get(infoHashFromMagnet) : null;
        if (contentGid && contentGid !== gid && gidInfo.has(contentGid)) {
          clearInterval(poll);
          try {
            const contentStatus = await rpc('tellStatus', contentGid);
            return resolve(toSummary(contentStatus, gidInfo.get(contentGid)));
          } catch (e) {
            return resolve({ id: infoHashFromMagnet || contentGid, gid: contentGid, name: gidInfo.get(contentGid)?.name || 'Loading...', progress: 0, downloaded: '0 B', length: '0 B', downloadSpeed: '0 B/s', uploadSpeed: '0 B/s', numPeers: 0, files: [], done: false, status: 'active', infoHash: infoHashFromMagnet });
          }
        }

        const status = await rpc('tellStatus', gid);

        if (status.status === 'error') {
          clearInterval(poll);
          cleanupGid(gid, userId);
          return reject(new Error(`Torrent error: ${status.errorMessage || 'unknown'}`));
        }

        if (status.status === 'removed') {
          clearInterval(poll);
          return reject(new Error('Torrent was removed'));
        }

        // Update name while waiting
        const btName = status.bittorrent?.info?.name;
        const meta = gidInfo.get(gid);
        if (meta && btName) meta.name = btName;

        // followedBy means metadata is fetched and content download has started
        if (status.followedBy && status.followedBy.length > 0) {
          clearInterval(poll);
          const newContentGid = status.followedBy[0];
          await switchToContentGid(gid, newContentGid, userId);

          try {
            const contentStatus = await rpc('tellStatus', newContentGid);
            return resolve(toSummary(contentStatus, gidInfo.get(newContentGid)));
          } catch (e) {
            const m = gidInfo.get(newContentGid);
            return resolve({ id: infoHashFromMagnet || newContentGid, gid: newContentGid, name: m?.name || 'Loading...', progress: 0, downloaded: '0 B', length: '0 B', downloadSpeed: '0 B/s', uploadSpeed: '0 B/s', numPeers: 0, files: [], done: false, status: 'active', infoHash: infoHashFromMagnet });
          }
        }

        if (Date.now() > deadline) {
          clearInterval(poll);
          // Timeout — return partial info, polling loop will handle the rest
          return resolve({ id: infoHashFromMagnet || gid, gid, name: gidInfo.get(gid)?.name || 'Loading...', progress: 0, downloaded: '0 B', length: '0 B', downloadSpeed: '0 B/s', uploadSpeed: '0 B/s', numPeers: 0, files: [], done: false, status: 'active', infoHash: infoHashFromMagnet });
        }
      } catch (err) {
        clearInterval(poll);
        reject(err);
      }
    }, 1000);
  });
}

async function getTorrent(infoHash, userId) {
  const gid = infoHashToGid.get(infoHash);
  if (!gid) return null;

  const meta = gidInfo.get(gid);
  if (!meta || meta.userId !== userId) return null;

  try {
    const status = await rpc('tellStatus', gid);
    return toSummary(status, meta);
  } catch (err) {
    return null;
  }
}

async function listTorrents(userId) {
  const gids = userGids.get(userId);
  if (!gids || gids.size === 0) return [];

  const results = [];
  const toRemove = [];

  for (const gid of gids) {
    try {
      const status = await rpc('tellStatus', gid);
      const meta = gidInfo.get(gid);

      if (status.status === 'removed' || status.status === 'error') {
        toRemove.push(gid);
        continue;
      }
      results.push(toSummary(status, meta));
    } catch (err) {
      // Only cleanup when aria2 definitively says this GID doesn't exist.
      // Transient errors (RPC timeout, ECONNREFUSED) must not wipe a live download.
      const isGidNotFound = err.message?.includes('not found') || err.message?.includes('GID');
      if (isGidNotFound) {
        toRemove.push(gid);
      }
      // Otherwise: skip this GID silently and keep tracking it
    }
  }

  toRemove.forEach(gid => cleanupGid(gid, userId));
  return results;
}

async function pauseTorrent(infoHash, userId) {
  const gid = infoHashToGid.get(infoHash);
  if (!gid) return false;

  const meta = gidInfo.get(gid);
  if (!meta || meta.userId !== userId) return false;

  try {
    await rpc('pause', gid);
    console.log(`⏸️ Paused: ${meta.name}`);
    listTorrents(userId).then(t => pushToUser(userId, 'torrent_update', t)).catch(() => {});
    return true;
  } catch (err) {
    try {
      await rpc('forcePause', gid);
      listTorrents(userId).then(t => pushToUser(userId, 'torrent_update', t)).catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }
}

async function resumeTorrent(infoHash, userId) {
  const gid = infoHashToGid.get(infoHash);
  if (!gid) return false;

  const meta = gidInfo.get(gid);
  if (!meta || meta.userId !== userId) return false;

  await rpc('unpause', gid);
  console.log(`▶️ Resumed: ${meta.name}`);
  listTorrents(userId).then(t => pushToUser(userId, 'torrent_update', t)).catch(() => {});
  return true;
}

async function stopTorrent(infoHash, userId) {
  if (!userId) throw new Error('userId is required for stopTorrent');

  const gid = infoHashToGid.get(infoHash);
  if (!gid) return false;

  const meta = gidInfo.get(gid);
  if (!meta || meta.userId !== userId) return false;

  try { await database.releaseReservation(userId, infoHash); } catch (err) {}
  try { await rpc('forceRemove', gid); } catch (err) {}
  try { await rpc('removeDownloadResult', gid); } catch (err) {}

  cleanupGid(gid, userId);
  listTorrents(userId).then(t => pushToUser(userId, 'torrent_update', t)).catch(() => {});
  return true;
}

async function removeTorrent(infoHash, userId) {
  return stopTorrent(infoHash, userId); // Same as stop — keeps files on disk
}

// ===================== DEPRECATED SHIMS =====================

async function getUserClient(userId) {
  throw new Error('getUserClient() is deprecated — aria2 migration complete');
}

async function getClient() {
  throw new Error('getClient() is deprecated — use listTorrents(userId) instead');
}

// ===================== NOTIFICATIONS =====================

function addQuotaExceededNotification(userId, notification) {
  if (!quotaExceededNotifications.has(userId)) quotaExceededNotifications.set(userId, []);
  const list = quotaExceededNotifications.get(userId);
  const entry = { id: Date.now().toString(), type: 'quota_exceeded', ...notification };
  list.push(entry);
  if (list.length > 10) list.splice(0, list.length - 10);
  console.log(`📢 Quota exceeded notification for user ${userId}: ${notification.torrentName}`);
  pushToUser(userId, 'notification', entry);
}

function addCompletionNotification(userId, notification) {
  if (!quotaExceededNotifications.has(userId)) quotaExceededNotifications.set(userId, []);
  const list = quotaExceededNotifications.get(userId);
  const entry = { id: Date.now().toString(), type: 'download_completed', ...notification };
  list.push(entry);
  if (list.length > 10) list.splice(0, list.length - 10);
  console.log(`🎉 Completion notification for user ${userId}: ${notification.torrentName}`);
  pushToUser(userId, 'notification', entry);
}

function getQuotaExceededNotifications(userId) {
  return quotaExceededNotifications.get(userId) || [];
}

function clearQuotaExceededNotification(userId, notificationId) {
  const list = quotaExceededNotifications.get(userId);
  if (!list) return false;
  const idx = list.findIndex(n => n.id === notificationId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  console.log(`🗑️ Cleared notification ${notificationId} for user ${userId}`);
  return true;
}

function clearAllQuotaExceededNotifications(userId) {
  const existing = quotaExceededNotifications.get(userId) || [];
  if (existing.length > 0) {
    console.log(`🗑️ Clearing ${existing.length} notifications for user ${userId.substring(0, 8)}...`);
  }
  quotaExceededNotifications.set(userId, []);
}

// ===================== INITIALIZATION =====================

if (DOCKER_MODE) {
  console.log(`🐳 ARIA2: Docker mode — connecting to aria2 at ${ARIA2_RPC_URL}`);
} else {
  startAria2();
}

module.exports = {
  addMagnet,
  getTorrent,
  listTorrents,
  stopTorrent,
  removeTorrent,
  pauseTorrent,
  resumeTorrent,
  getUserClient,
  getClient,
  getQuotaExceededNotifications,
  clearQuotaExceededNotification,
  clearAllQuotaExceededNotifications,
  registerSSEClient,
  unregisterSSEClient,
};
