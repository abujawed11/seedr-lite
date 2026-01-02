# Torrent Cache System Implementation Plan

## Overview

Implement a "Cached Torrents" / "Instant Availability" system similar to Seedr, Real-Debrid, and Premiumize. When multiple users add the same torrent, it's downloaded once and shared among all users, providing instant access and saving bandwidth/storage.

## Current vs. Proposed System

### Current System
```
User A adds torrent X → Downloads to users/A/torrent_X (5 GB)
User B adds torrent X → Downloads to users/B/torrent_X (5 GB)
User C adds torrent X → Downloads to users/C/torrent_X (5 GB)

Total: 15 GB storage, 15 GB bandwidth, 3x download time
```

### Proposed Cached System
```
User A adds torrent X → Downloads to cache/infoHash_ABC/ (5 GB)
                      → Creates symlink users/A/torrent_X → cache/infoHash_ABC/
User B adds torrent X → Detects cache hit! (INSTANT)
                      → Creates symlink users/B/torrent_X → cache/infoHash_ABC/
User C adds torrent X → Detects cache hit! (INSTANT)
                      → Creates symlink users/C/torrent_X → cache/infoHash_ABC/

Total: 5 GB storage, 5 GB bandwidth, instant for users B & C ⚡
```

---

## Architecture Design

### Directory Structure

```
storage/
├── cache/                          ← Global cache directory
│   ├── {infoHash_1}/              ← Actual files (one copy)
│   │   ├── movie.mp4
│   │   └── subtitle.srt
│   ├── {infoHash_2}/
│   │   └── document.pdf
│   └── .cache_metadata.json       ← Cache statistics
│
└── users/                          ← User directories
    ├── userA/
    │   └── My Movie/               ← Symlink → cache/{infoHash_1}/
    ├── userB/
    │   └── My Movie/               ← Symlink → cache/{infoHash_1}/
    └── userC/
        └── Important Doc/          ← Symlink → cache/{infoHash_2}/
```

### Symlinks vs. Junctions (Windows Compatibility)

**Symlinks** (Unix/Linux/Mac):
```bash
ln -s /path/to/cache/{infoHash} /path/to/user/folder
```

**Junctions** (Windows - No admin required):
```javascript
const fs = require('fs');
await fs.promises.symlink(cacheDir, userDir, 'junction');
```

---

## Database Schema Changes

### New Tables

#### 1. `torrent_cache` Table
Tracks all cached torrents globally.

```sql
CREATE TABLE torrent_cache (
  info_hash TEXT PRIMARY KEY,                    -- Unique torrent identifier
  name TEXT NOT NULL,                            -- Torrent name
  total_size INTEGER NOT NULL,                   -- Total size in bytes
  files_count INTEGER DEFAULT 0,                 -- Number of files
  cache_path TEXT NOT NULL,                      -- Path to cache/{infoHash}
  reference_count INTEGER DEFAULT 0,             -- How many users using this
  download_status TEXT DEFAULT 'downloading',    -- 'downloading', 'completed', 'error'
  first_cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_info_hash ON torrent_cache(info_hash);
CREATE INDEX idx_cache_ref_count ON torrent_cache(reference_count);
CREATE INDEX idx_cache_status ON torrent_cache(download_status);
```

#### 2. `user_torrent_links` Table
Links users to cached torrents.

```sql
CREATE TABLE user_torrent_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  info_hash TEXT NOT NULL,
  user_folder_name TEXT NOT NULL,               -- What user named this torrent
  symlink_path TEXT NOT NULL,                   -- Path to user's symlink
  is_cached BOOLEAN DEFAULT 0,                  -- 1 = instant (cached), 0 = downloaded
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (info_hash) REFERENCES torrent_cache(info_hash) ON DELETE CASCADE
);

CREATE INDEX idx_user_links_user_id ON user_torrent_links(user_id);
CREATE INDEX idx_user_links_info_hash ON user_torrent_links(info_hash);
```

#### 3. Update Existing `storage_reservations` Table
Add reference to cache system.

```sql
ALTER TABLE storage_reservations ADD COLUMN is_cached BOOLEAN DEFAULT 0;
ALTER TABLE storage_reservations ADD COLUMN info_hash TEXT;
```

---

## Implementation Steps

### Phase 1: Database & Core Infrastructure

**Step 1.1: Create Database Tables**
- Add `torrent_cache` table
- Add `user_torrent_links` table
- Add migrations for existing tables

**Step 1.2: Create Cache Directory**
```javascript
// src/utils/initDirectories.js
const CACHE_DIR = path.join(process.env.ROOT, '../cache');
await fs.promises.mkdir(CACHE_DIR, { recursive: true });
```

**Step 1.3: Add Database Functions**
```javascript
// database.js - New functions needed:
async checkCacheAvailability(infoHash)
async createCacheEntry(infoHash, name, totalSize, cachePath)
async incrementCacheRefCount(infoHash)
async decrementCacheRefCount(infoHash)
async createUserTorrentLink(userId, infoHash, folderName, symlinkPath, isCached)
async deleteUserTorrentLink(userId, infoHash)
async getCacheByInfoHash(infoHash)
async getUnusedCache(daysOld)
```

---

### Phase 2: Torrent Manager Modifications

**Step 2.1: Extract InfoHash from Magnet**
```javascript
// src/services/torrentManager.js

function extractInfoHash(magnetURI) {
  const match = magnetURI.match(/btih:([a-fA-F0-9]{40})/i);
  return match ? match[1].toLowerCase() : null;
}
```

**Step 2.2: Check Cache Before Download**
```javascript
async addTorrent(userId, magnetURI, userProvidedName) {
  // 1. Extract infoHash
  const infoHash = extractInfoHash(magnetURI);

  // 2. Check if cached
  const cacheEntry = await database.getCacheByInfoHash(infoHash);

  if (cacheEntry && cacheEntry.download_status === 'completed') {
    // ✅ CACHE HIT - Instant!
    return await this.createSymlinkFromCache(userId, cacheEntry, userProvidedName);
  } else {
    // ❌ CACHE MISS - Download
    return await this.downloadToCache(userId, magnetURI, infoHash, userProvidedName);
  }
}
```

**Step 2.3: Download to Cache**
```javascript
async downloadToCache(userId, magnetURI, infoHash, userProvidedName) {
  const cachePath = path.join(CACHE_DIR, infoHash);

  // 1. Create cache entry in database
  await database.createCacheEntry(infoHash, userProvidedName, 0, cachePath);

  // 2. Start download to cache directory
  const torrent = await this.client.add(magnetURI, {
    path: cachePath
  });

  // 3. When download completes, create symlink for user
  torrent.on('done', async () => {
    await database.updateCacheStatus(infoHash, 'completed', torrent.length);
    await this.createSymlinkFromCache(userId, await database.getCacheByInfoHash(infoHash), userProvidedName);
  });

  return torrent;
}
```

**Step 2.4: Create Symlink for User**
```javascript
async createSymlinkFromCache(userId, cacheEntry, userProvidedName) {
  const userDir = path.join(USER_STORAGE_DIR, userId);
  const userFolderPath = path.join(userDir, userProvidedName || cacheEntry.name);
  const cachePath = cacheEntry.cache_path;

  // Create symlink/junction
  try {
    await fs.promises.symlink(cachePath, userFolderPath, 'junction'); // Windows
    // or
    // await fs.promises.symlink(cachePath, userFolderPath); // Unix

    // Track in database
    await database.createUserTorrentLink(
      userId,
      cacheEntry.info_hash,
      userProvidedName || cacheEntry.name,
      userFolderPath,
      true // is_cached = true
    );

    // Increment reference count
    await database.incrementCacheRefCount(cacheEntry.info_hash);

    return {
      instant: true,
      cached: true,
      message: 'Torrent already available! Added instantly.',
      infoHash: cacheEntry.info_hash
    };
  } catch (error) {
    console.error('Symlink creation failed:', error);
    throw error;
  }
}
```

---

### Phase 3: Deletion & Cleanup

**Step 3.1: User Deletes Torrent**
```javascript
async removeTorrent(userId, infoHash) {
  // 1. Get user's link
  const link = await database.getUserTorrentLink(userId, infoHash);

  // 2. Remove user's symlink
  await fs.promises.unlink(link.symlink_path);

  // 3. Delete from user_torrent_links
  await database.deleteUserTorrentLink(userId, infoHash);

  // 4. Decrement reference count
  await database.decrementCacheRefCount(infoHash);

  // 5. Check if cache should be deleted
  const cacheEntry = await database.getCacheByInfoHash(infoHash);

  if (cacheEntry.reference_count === 0) {
    // Option A: Delete immediately
    await this.deleteCacheEntry(infoHash);

    // Option B: Keep for 7 days (recommended)
    await database.updateCacheLastAccessed(infoHash);
  }
}
```

**Step 3.2: Automatic Cache Cleanup (Cron Job)**
```javascript
// src/utils/cacheCleanup.js

async function cleanupUnusedCache() {
  // Delete cache entries with ref_count = 0 and older than 7 days
  const unusedCache = await database.getUnusedCache(7);

  for (const cache of unusedCache) {
    console.log(`🧹 Deleting unused cache: ${cache.info_hash}`);

    // Delete physical files
    await fs.promises.rm(cache.cache_path, { recursive: true, force: true });

    // Delete from database
    await database.deleteCacheEntry(cache.info_hash);
  }
}

// Run every 24 hours
setInterval(cleanupUnusedCache, 24 * 60 * 60 * 1000);
```

---

### Phase 4: Quota Management

**Strategy: Cached files don't count toward user quota**

```javascript
// Quota calculation changes

async calculateUserStorage(userId) {
  const links = await database.getUserTorrentLinks(userId);

  let totalStorage = 0;

  for (const link of links) {
    if (link.is_cached) {
      // Cached torrent - don't count toward quota
      continue;
    } else {
      // User's unique download - count toward quota
      const size = await this.getFolderSize(link.symlink_path);
      totalStorage += size;
    }
  }

  return totalStorage;
}
```

**Alternative Strategies:**
1. **Free for all**: Cached = 0% quota usage (RECOMMENDED)
2. **Partial charge**: Cached = 10% quota usage
3. **First user pays**: First downloader pays 100%, others pay 0%

---

## Frontend Changes

### Indicate Cached Torrents

**UI Indicator:**
```javascript
// Show "⚡ INSTANT" badge for cached torrents

{torrent.cached && (
  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
    ⚡ Instant (Cached)
  </span>
)}
```

**Check Cache Before Adding**
```javascript
// New API endpoint: GET /api/torrents/check-cache
async function checkCacheAvailability(magnetURI) {
  const response = await api.get('/torrents/check-cache', {
    params: { magnetURI }
  });
  return response.data; // { cached: true/false, size: number }
}

// Show in UI:
if (cached) {
  alert('⚡ This torrent is cached! It will be added instantly.');
}
```

---

## API Endpoints

### New/Modified Endpoints

**1. Check Cache Availability**
```
GET /api/torrents/check-cache?magnetURI={magnet}

Response:
{
  cached: true,
  infoHash: "abc123...",
  name: "Movie Name",
  size: 5000000000,
  filesCount: 2,
  cachedAt: "2025-01-01T00:00:00Z"
}
```

**2. Get Cache Statistics (Admin)**
```
GET /api/admin/cache-stats

Response:
{
  totalCachedTorrents: 150,
  totalCacheSize: 500000000000,
  totalReferences: 450,
  topCachedTorrents: [...],
  storagesSaved: 350000000000
}
```

**3. Clear Cache (Admin)**
```
DELETE /api/admin/cache/:infoHash
```

---

## Testing Strategy

### Unit Tests

```javascript
describe('Torrent Cache System', () => {
  it('should detect cache hit', async () => {
    const infoHash = 'abc123...';
    await database.createCacheEntry(infoHash, 'Test', 1000, '/cache/abc');
    const result = await database.checkCacheAvailability(infoHash);
    expect(result).toBeTruthy();
  });

  it('should increment reference count', async () => {
    await database.incrementCacheRefCount('abc123');
    const cache = await database.getCacheByInfoHash('abc123');
    expect(cache.reference_count).toBe(1);
  });

  it('should create symlink correctly', async () => {
    // Test symlink creation
  });
});
```

### Integration Tests

1. **User A adds torrent** → Downloads to cache
2. **User B adds same torrent** → Instant link
3. **User A deletes** → Ref count decrements
4. **User B deletes** → Cache deleted or marked for cleanup

---

## Performance Optimizations

### 1. Cache Lookup Index
```sql
CREATE INDEX idx_cache_lookup ON torrent_cache(info_hash, download_status);
```

### 2. In-Memory Cache Map
```javascript
// Keep frequently accessed cache in memory
const cacheMap = new Map(); // infoHash -> cacheEntry

async function getCacheWithMemory(infoHash) {
  if (cacheMap.has(infoHash)) {
    return cacheMap.get(infoHash);
  }
  const entry = await database.getCacheByInfoHash(infoHash);
  if (entry) cacheMap.set(infoHash, entry);
  return entry;
}
```

### 3. Parallel Cache Checks
```javascript
// Check multiple torrents at once
async function checkMultipleTorrents(magnetURIs) {
  const infoHashes = magnetURIs.map(extractInfoHash);
  return await database.checkMultipleCache(infoHashes);
}
```

---

## Security & Privacy Considerations

### 1. Privacy Protection
- Users cannot see who else has the torrent
- Each user sees only their own torrents
- File paths are isolated per user

### 2. Abuse Prevention
```javascript
// Limit cache checks per user
const CACHE_CHECK_LIMIT = 100; // per hour

// Prevent cache poisoning
function validateInfoHash(infoHash) {
  return /^[a-fA-F0-9]{40}$/.test(infoHash);
}
```

### 3. Storage Limits
```javascript
// Maximum cache size (prevent abuse)
const MAX_CACHE_SIZE = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB

// Maximum single torrent size for caching
const MAX_TORRENT_CACHE_SIZE = 100 * 1024 * 1024 * 1024; // 100 GB
```

---

## Rollout Plan

### Phase 1: Foundation (Week 1)
- ✅ Create database tables
- ✅ Create cache directory structure
- ✅ Add database helper functions
- ✅ Test symlink/junction creation

### Phase 2: Core Logic (Week 2)
- ✅ Implement cache detection
- ✅ Implement download to cache
- ✅ Implement symlink creation
- ✅ Update torrent manager

### Phase 3: Cleanup & Management (Week 3)
- ✅ Implement deletion logic
- ✅ Implement cleanup cron job
- ✅ Update quota calculations
- ✅ Add cache statistics

### Phase 4: Frontend & Testing (Week 4)
- ✅ Add cache indicators in UI
- ✅ Add pre-add cache check
- ✅ Integration testing
- ✅ Performance testing

### Phase 5: Admin & Monitoring (Week 5)
- ✅ Admin cache dashboard
- ✅ Cache statistics
- ✅ Manual cache management
- ✅ Monitoring & alerts

---

## Metrics to Track

### Success Metrics
- **Cache Hit Rate**: % of torrents served from cache
- **Storage Saved**: Total GB saved by caching
- **Bandwidth Saved**: Total GB download saved
- **User Satisfaction**: Average time to access torrents

### Example Dashboard
```
📊 Cache Statistics:
- Total Cached Torrents: 1,234
- Cache Hit Rate: 67%
- Storage Saved: 3.2 TB (65% reduction)
- Bandwidth Saved: 8.5 TB
- Average Access Time: 2 seconds (vs 15 minutes)
- Top Cached Torrent: "Popular Movie" (123 users)
```

---

## Challenges & Solutions

### Challenge 1: Windows Symlink Permissions
**Problem**: Symlinks require admin rights on Windows
**Solution**: Use junctions instead (no admin required)

### Challenge 2: Corrupted Cache
**Problem**: What if cache files get corrupted?
**Solution**:
- Hash verification on cache access
- Automatic re-download if verification fails
- Mark cache as "corrupted" and re-cache

### Challenge 3: Race Conditions
**Problem**: Two users add same torrent simultaneously
**Solution**:
- Use database transactions
- Lock on infoHash during cache creation
- Second user waits for first download to complete

### Challenge 4: Partial Downloads
**Problem**: User A adds torrent, still downloading, User B tries to add same
**Solution**:
- Track download status in cache table
- User B waits for User A's download to complete
- Show progress to User B: "Downloading... 45% (cached)"

---

## Future Enhancements

### 1. Pre-caching Popular Torrents
- Automatically cache trending torrents
- Machine learning to predict popular content

### 2. Distributed Cache
- Multiple cache servers
- Load balancing across cache nodes

### 3. Cache Sharing Network
- Share cache with other MyPeerCloud instances
- Federated caching system

### 4. Smart Cache Cleanup
- Keep popular torrents longer
- Delete least recently used (LRU) first
- Predict cache value using ML

---

## Conclusion

This torrent cache system will:
- ✅ **Drastically improve user experience** (instant access)
- ✅ **Reduce bandwidth costs** (download once, serve many)
- ✅ **Save storage space** (single copy instead of duplicates)
- ✅ **Increase platform competitiveness** (match Seedr/Real-Debrid)

**Estimated Impact:**
- 60-80% reduction in storage usage
- 70-90% reduction in bandwidth costs
- 95% of users get instant access (popular torrents)
- User satisfaction increases significantly

---

## References & Resources

- WebTorrent Documentation: https://webtorrent.io/docs
- Node.js fs.symlink: https://nodejs.org/api/fs.html#fspromisessymlinktarget-path-type
- Windows Junctions: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/mklink
- Seedr Architecture: https://www.seedr.cc/
- Real-Debrid: https://real-debrid.com/

---

**Document Version:** 1.0
**Last Updated:** January 2, 2025
**Author:** Claude (AI Assistant)
**Status:** Planning Phase




Perfect! I've created a comprehensive implementation plan document: TORRENT_CACHE_PLAN.md

  What's Inside:

  📋 Overview

  - Current vs. Proposed system comparison
  - Benefits breakdown (60-80% storage savings!)

  🏗️ Architecture

  - Directory structure with cache + symlinks
  - Windows compatibility (junctions instead of symlinks)

  💾 Database Schema

  - torrent_cache table - Global cache tracking
  - user_torrent_links table - User-to-cache mapping
  - All necessary indexes

  🔧 Implementation (5 Phases)

  1. Phase 1: Database & Infrastructure
  2. Phase 2: Torrent Manager modifications
  3. Phase 3: Deletion & Cleanup logic
  4. Phase 4: Frontend UI indicators
  5. Phase 5: Admin dashboard & monitoring

  💡 Key Features

  - ✅ Cache detection before download
  - ✅ Instant access for cached torrents (⚡)
  - ✅ Reference counting system
  - ✅ Automatic cleanup of unused cache
  - ✅ Quota management (cached files = free!)

  🛡️ Security

  - Privacy protection (users can't see who else has it)
  - Abuse prevention
  - Cache size limits

  📊 Metrics & Monitoring

  - Cache hit rate
  - Storage/bandwidth saved
  - User satisfaction tracking

  🎯 Expected Impact

  - 60-80% storage reduction
  - 70-90% bandwidth savings
  - 95% of users get instant access
  - Massive user satisfaction improvement

  The plan is ready for implementation whenever you want to tackle this feature! 🚀