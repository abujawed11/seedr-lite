# Downloader Improvements

Tracked issues and improvements for the aria2-based torrent downloader.
Status: `[ ]` pending · `[x]` done

---

## Speed

### S1 — Fix dead trackers in `trackers.js`
**File:** `seedr-server/src/utils/trackers.js`

Several trackers in `RELIABLE_TRACKERS` and `EXTENDED_TRACKERS` are permanently offline.
Dead trackers are queried on every announce and magnet metadata fetch, wasting time.

Dead entries to remove:
- `udp://9.rarbg.to:2710/announce` — RARBG shut down May 2023
- `udp://9.rarbg.me:2710/announce` — same
- `udp://tracker.coppersurfer.tk:6969/announce` — dead
- `udp://tracker.zer0day.to:1337/announce` — dead
- `udp://tracker.pirateparty.red:6969/announce` — dead
- `udp://tracker.internetwarriors.net:1337/announce` — dead
- `udp://tracker.leechers-paradise.org:6969/announce` — dead (listed twice)

Replace with currently alive trackers sourced from the trackerslist project.

---

### S2 — Add missing aria2 performance flags
**Files:** `seedr-server/Dockerfile.aria2`, `torrentManager.js:76–97` (`startAria2`)

Both the Dockerfile and the local `startAria2()` args are missing flags that
meaningfully increase BitTorrent download speed:

| Flag | Default | Recommended | Reason |
|------|---------|-------------|--------|
| `--bt-max-peers` | 55 | 150 | More peers = more parallel bandwidth |
| `--enable-peer-exchange` | true (implicit) | explicitly set | Ensures PEX is not disabled |
| `--bt-prioritize-piece=head,tail` | off | on | Prefetch file start/end for faster media playback |
| `--dht-entry-point` | 1 node | 3 nodes | More DHT bootstrap points = faster peer discovery |

Additional DHT entry points to add:
```
--dht-entry-point=router.bittorrent.com:6881
--dht-entry-point=router.utorrent.com:6881
```
Both Dockerfile and `startAria2()` must be kept in sync.

---

### S3 — Batch RPC calls in `listTorrents()`
**File:** `seedr-server/src/services/torrentManager.js:878–908`

`listTorrents()` calls `rpc('tellStatus', gid)` individually inside a `for` loop.
With N active downloads this is N sequential HTTP round-trips to aria2 on every
SSE push (every 2 seconds per connected user).

Fix: use `system.multicall` to send all `tellStatus` calls in a single HTTP request.

```js
// Current: N round-trips
for (const gid of gids) {
  const status = await rpc('tellStatus', gid);
}

// Improved: 1 round-trip
const calls = [...gids].map(gid => ({
  methodName: 'aria2.tellStatus',
  params: [`token:${ARIA2_SECRET}`, gid]
}));
const results = await rpc('system.multicall', calls);
```

---

## Robustness

### R1 — Add retry logic to `rpc()`
**File:** `seedr-server/src/services/torrentManager.js:140–159`

The `rpc()` function throws immediately on any error, including transient ones
(brief aria2 overload, single dropped packet). Under load this causes false
failures that bubble up to users.

Fix: retry up to 2 additional times with short linear backoff before throwing,
except on `ECONNREFUSED` (aria2 genuinely not running).

---

### R2 — Exponential backoff on WebSocket reconnect
**File:** `seedr-server/src/services/torrentManager.js:641–647`

`connectAria2Events()` always reconnects after a fixed 3 seconds regardless of
how many consecutive failures have occurred. If aria2 is restarting or overloaded
this hammers it with repeated connection attempts.

Fix: start at 3s, double on each failure, cap at 30s. Reset to 3s on successful open.

---

### R3 — Debounce progressive storage DB writes
**File:** `seedr-server/src/services/torrentManager.js:491–497`

`database.updateProgressiveStorage()` is called every 2 seconds for every active
download inside `pollDownloads()`. With 5 simultaneous downloads that's 2.5 DB
writes/second continuously. This is unnecessary since progress is only cosmetic
until the download completes.

Fix: debounce per GID — write at most once every 10 seconds instead of every
poll tick. Finalization at completion is unaffected (always writes immediately).

---

### R4 — Handle aria2 `stopped` state in poll loop
**File:** `seedr-server/src/services/torrentManager.js:505–529`

`tellActive` and `tellWaiting` do not return downloads in the `stopped` state.
When aria2 stops a download (e.g. manually via RPC, or on certain error types),
its GID disappears from both lists. The current "disappeared GID" handler calls
`tellStatus` individually per GID per poll cycle to check — but doesn't handle
`status === 'stopped'`, leaving orphaned entries in `gidInfo` / `userGids` /
`infoHashToGid` until the server restarts.

Fix: add an explicit `stopped` case in the disappeared-GID handler that calls
`cleanupGid()` and pushes an SSE update.

---

### R5 — Notify user on metadata fetch timeout
**File:** `seedr-server/src/services/torrentManager.js:850–854`

When the 2-minute metadata deadline expires, `addMagnet()` resolves with a
partial object (`name: 'Loading...'`). The background polling loop continues
trying, but if it never resolves the UI is left with a permanent zombie card
showing 0% with no way for the user to know something went wrong.

Fix: if the GID is still in `isMetadata: true` state after the deadline,
push an SSE error event with a human-readable message so the frontend can
show a "Metadata fetch timed out — check your connection" error on the card.

---

## Summary

| ID | Area | File | Impact | Status |
|----|------|------|--------|--------|
| S1 | Dead trackers | `utils/trackers.js` | Slow peer/metadata discovery | ✅ Done |
| S2 | Missing aria2 flags | `Dockerfile.aria2`, `torrentManager.js` | Speed cap on fast connections | ✅ Done |
| S3 | N RPC calls in listTorrents | `torrentManager.js:878` | Latency scales with download count | ✅ Done |
| R1 | No RPC retry | `torrentManager.js:140` | False failures under load | ✅ Done |
| R2 | Fixed WS reconnect delay | `torrentManager.js:643` | Hammers restarting aria2 | ✅ Done |
| R3 | Excessive DB writes | `torrentManager.js:491` | Unnecessary write pressure | ✅ Done |
| R4 | `stopped` state unhandled | `torrentManager.js:505` | Orphaned in-memory GID entries | ✅ Done |
| R5 | Silent metadata timeout | `torrentManager.js:850` | Zombie torrent cards in UI | ✅ Done |
