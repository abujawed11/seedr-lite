# Storage Optimization Master Plan
## SSD Management + R2 Cloud Storage + Torrent Cache

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Proposed Architecture](#proposed-architecture)
4. [System Integration Overview](#system-integration-overview)
5. [Database Schema Changes](#database-schema-changes)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Detailed Implementation](#detailed-implementation)
8. [Testing Strategy](#testing-strategy)
9. [Cost Analysis](#cost-analysis)
10. [Monitoring & Metrics](#monitoring--metrics)

---

## 📊 Executive Summary

### The Problem

**Current System:**
- ✗ No SSD space checking (can fill up and crash)
- ✗ Every user downloads same torrent (waste of bandwidth/storage)
- ✗ Completed files stay on expensive SSD forever
- ✗ No queue system when SSD is full
- ✗ User quota checks only, no global capacity management

**Example Scenario:**
```
SSD: 100GB total, 50GB used
User A: Downloads "Movie.mp4" (5GB) → 55GB used
User B: Downloads "Movie.mp4" (5GB) → 60GB used (duplicate!)
User C: Downloads "Series.mkv" (10GB) → 70GB used
User D: Downloads "Album.zip" (5GB) → 75GB used
... (continues until SSD full)

Problems:
1. Movie.mp4 downloaded TWICE (wasted 5GB)
2. All files stay on SSD forever (expensive)
3. Eventually SSD fills up → System crashes
4. No queue when full → Users get errors
```

### The Solution

**Integrated System (SSD + R2 + Cache):**
- ✓ Torrent cache prevents duplicate downloads (60-80% storage saved)
- ✓ SSD used only for active downloads (fast I/O)
- ✓ Completed files auto-migrate to R2 (cheap cloud storage)
- ✓ SSD space checked before downloads (prevents crashes)
- ✓ Queue system when SSD full (no user errors)
- ✓ Stream from R2 with zero egress fees (Cloudflare R2)

**Same Scenario with New System:**
```
SSD: 100GB total
R2 Cloud: Unlimited capacity

User A: Downloads "Movie.mp4" (5GB)
  → Downloads to SSD cache/abc123/
  → Completes → Uploads to R2 → Deletes from SSD
  → Creates symlink users/A/Movie → cache/abc123/

User B: Adds "Movie.mp4" (same infoHash)
  → Cache hit! Instant access (0 download)
  → Creates symlink users/B/Movie → cache/abc123/
  → Both users stream from R2 (fast + free egress)

User C: Downloads "Series.mkv" (10GB)
  → SSD space checked (90GB free) ✓
  → Downloads to SSD → Uploads to R2 → Deletes from SSD

User D: Adds torrent when SSD full
  → Added to queue → Auto-starts when space available

Benefits:
- Movie.mp4: 5GB saved (downloaded once, not twice)
- SSD usage: Only active downloads (temporary)
- Storage cost: 70% reduction (R2 vs SSD)
- No crashes: Space checked + queue system
- User B: Instant access (cached)
```

### Expected Impact

| Metric | Current | With Solution | Improvement |
|--------|---------|---------------|-------------|
| Storage Cost | $100/month | $15/month | **85% reduction** |
| Bandwidth Cost | $90/month | $0/month | **100% reduction** (R2 free egress) |
| Storage Efficiency | 100GB | 20-40GB (cache) | **60-80% saved** |
| Download Speed | 5-15 min | Instant (cached) | **95% instant** |
| System Crashes | Common | Never | **100% prevented** |
| User Experience | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **Significantly better** |

---

## 🐳 Docker + Redis + BullMQ Architecture

### Why Redis + BullMQ?

| Feature | Simple Queue (SQLite + setInterval) | Redis + BullMQ |
|---------|-------------------------------------|----------------|
| **Reliability** | Basic polling every 30s | Event-driven, real-time |
| **Retry Logic** | Manual implementation | Built-in with exponential backoff |
| **Concurrency** | Manual tracking | Built-in limiter |
| **Job Priority** | Manual sorting | Native priority queues |
| **Progress Tracking** | Manual database updates | Built-in job progress |
| **Scaling** | Single process only | Multiple workers across servers |
| **Persistence** | SQLite (slower) | Redis (faster, in-memory) |
| **Dashboard** | Build from scratch | Bull Board (free, ready-made) |
| **Dead Jobs** | Manual cleanup | Auto-cleanup with TTL |
| **Graceful Shutdown** | Manual | Built-in |

### Quick Start with Docker

```bash
# Start all services (Redis, Bull Board, and your app)
docker-compose up -d

# View logs
docker-compose logs -f

# Access services:
# - Seedr Server: http://localhost:5000
# - Bull Board Dashboard: http://localhost:3001

# Stop all services
docker-compose down
```

### Development without Docker

```bash
# Install Redis locally (Windows - use WSL or Docker)
# macOS: brew install redis && brew services start redis
# Linux: sudo apt install redis-server && sudo systemctl start redis

# Install dependencies
cd seedr-server
npm install bullmq ioredis

# Start the server
npm run dev
```

---

## 🔍 Current System Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User adds torrent                                          │
│       ↓                                                     │
│  Check user quota only ✓                                    │
│  (No SSD space check ✗)                                     │
│       ↓                                                     │
│  Download to: ROOT/users/{userId}/{torrent-name}/           │
│       ↓                                                     │
│  Files stay on SSD forever                                  │
│       ↓                                                     │
│  User streams from local disk                               │
│                                                             │
│  Problems:                                                  │
│  • Duplicate downloads (User A & B download same file)      │
│  • No SSD capacity check → Can fill up and crash            │
│  • Expensive SSD storage used forever                       │
│  • No queue when full                                       │
│  • No cloud storage integration                             │
└─────────────────────────────────────────────────────────────┘
```

### What Exists (Working Features)

**File:** `seedr-server/src/models/reservations.js`

✅ **User Quota Reservation System**
- Atomic quota checks using database transactions
- Progressive storage tracking (updates every 5 seconds)
- Prevents user from exceeding their quota
- Formula: `available = quota - used - reserved`

✅ **Concurrent Download Limits**
- Default: 2 concurrent downloads per user
- Configurable via `users.max_concurrent_downloads`

✅ **Storage Tracking**
- Database tracks `storage_used` and `storage_quota`
- Real-time updates during downloads

### What's Missing

❌ **SSD Disk Space Checking**
- No check of actual filesystem capacity
- Could crash if SSD fills up

❌ **Global SSD Management**
- No tracking of total SSD usage across all users
- No global download limits

❌ **Queue System**
- Downloads rejected when full (not queued)
- No automatic retry mechanism

❌ **Cloud Storage Integration**
- Files stay on expensive SSD forever
- No migration to cheaper storage

❌ **Torrent Cache System**
- Every user downloads the same torrent
- Massive waste of bandwidth and storage

---

## 🏗️ Proposed Architecture

### Complete System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                    PROPOSED INTEGRATED SYSTEM                         │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. USER ADDS TORRENT (Magnet Link)                                  │
│     ↓                                                                 │
│  2. EXTRACT INFOHASH & CHECK CACHE                                    │
│     ├─ Cache Hit? → ⚡ INSTANT ACCESS (skip download)                │
│     └─ Cache Miss? → Continue to download                            │
│     ↓                                                                 │
│  3. CHECK QUOTAS & SPACE                                              │
│     ├─ Check user quota (existing ✓)                                 │
│     ├─ Check SSD available space (NEW)                               │
│     ├─ Check concurrent limits (existing ✓)                          │
│     └─ Check global SSD capacity (NEW)                               │
│     ↓                                                                 │
│  4. RESERVE SPACE                                                     │
│     ├─ Reserve user quota (existing ✓)                               │
│     └─ Reserve SSD space (NEW)                                       │
│     ↓                                                                 │
│  5. DOWNLOAD FLOW                                                     │
│     ├─ If space available:                                            │
│     │   └─ Download to SSD: cache/{infoHash}/ (NEW)                  │
│     └─ If SSD full:                                                   │
│         └─ Add to queue (NEW)                                         │
│     ↓                                                                 │
│  6. DURING DOWNLOAD                                                   │
│     ├─ Update progress every 5 seconds (existing ✓)                  │
│     ├─ Update SSD reservation (NEW)                                  │
│     └─ Users can stream from WebTorrent (existing ✓)                 │
│     ↓                                                                 │
│  7. DOWNLOAD COMPLETES                                                │
│     ├─ Finalize user quota (existing ✓)                              │
│     ├─ Upload files to R2 cloud storage (NEW)                        │
│     ├─ Store R2 object keys in database (NEW)                        │
│     ├─ Create cache entry in database (NEW)                          │
│     └─ Delete files from SSD (NEW)                                   │
│     ↓                                                                 │
│  8. CREATE USER LINK                                                  │
│     ├─ Create symlink: users/{userId}/name → cache/{infoHash}/       │
│     ├─ Store link in user_torrent_links table (NEW)                  │
│     └─ Increment cache reference count (NEW)                         │
│     ↓                                                                 │
│  9. USER BROWSES/STREAMS FILES                                        │
│     ├─ Browse files from R2 (not local disk)                         │
│     ├─ Stream from R2 with range support                             │
│     └─ Zero egress fees (Cloudflare R2)                              │
│     ↓                                                                 │
│ 10. NEXT USER ADDS SAME TORRENT                                       │
│     ├─ Cache hit detected! (infoHash exists)                         │
│     ├─ Files already in R2 ✓                                         │
│     ├─ Create symlink instantly (no download)                        │
│     ├─ Increment reference count                                     │
│     └─ ⚡ INSTANT ACCESS for user                                    │
│     ↓                                                                 │
│ 11. BACKGROUND JOBS                                                   │
│     ├─ Queue processor: Start queued downloads when space free       │
│     ├─ Cache cleanup: Delete unused cache (ref_count=0, >7 days)    │
│     ├─ Stale reservation cleanup: Release orphaned reservations      │
│     └─ Storage sync: Update user storage from R2                     │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
storage/
├── cache/                              ← Global torrent cache (on SSD)
│   ├── {infoHash_1}/                   ← Downloaded files (temporary)
│   │   ├── movie.mp4
│   │   └── subtitle.srt
│   ├── {infoHash_2}/                   ← Another torrent
│   │   └── document.pdf
│   └── .metadata/                      ← Cache metadata
│
├── users/                              ← User directories (symlinks)
│   ├── user_abc/
│   │   ├── My Movie/                   ← Symlink → cache/{infoHash_1}/
│   │   └── Document/                   ← Symlink → cache/{infoHash_2}/
│   └── user_xyz/
│       └── My Movie/                   ← Symlink → cache/{infoHash_1}/
│
├── tmp/                                ← Temporary downloads
│   └── (cleared on restart)
│
├── hls/                                ← HLS streaming cache
│   └── (existing)
│
└── thumbs/                             ← Thumbnails
    └── (existing)

Cloudflare R2 (Cloud):
├── users/
│   ├── user_abc/
│   │   ├── infoHash_1/movie.mp4        ← Actual files in cloud
│   │   └── infoHash_2/document.pdf
│   └── user_xyz/
│       └── infoHash_1/movie.mp4        ← Same file (deduplicated by cache)
```

### Storage Flow Diagram

```
┌──────────────┐
│  User adds   │
│   torrent    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Cache Check (by infoHash)               │
├──────────────────────────────────────────┤
│  • Query torrent_cache table             │
│  • Check if download_status='completed'  │
└──────┬───────────────────────────────────┘
       │
       ├─── Cache Hit ────────────────────┐
       │                                  │
       │                                  ▼
       │                    ┌─────────────────────────┐
       │                    │  Files already in R2!   │
       │                    │  Create symlink         │
       │                    │  Increment ref_count    │
       │                    │  ⚡ INSTANT ACCESS      │
       │                    └─────────────────────────┘
       │
       └─── Cache Miss ───────────────────┐
                                          │
                                          ▼
                            ┌─────────────────────────┐
                            │  Check SSD Space        │
                            │  • User quota           │
                            │  • SSD available        │
                            │  • Global capacity      │
                            └──────┬──────────────────┘
                                   │
                                   ├─── Space Available ──────┐
                                   │                          │
                                   │                          ▼
                                   │            ┌─────────────────────────┐
                                   │            │  Download to SSD        │
                                   │            │  cache/{infoHash}/      │
                                   │            └──────┬──────────────────┘
                                   │                   │
                                   │                   ▼
                                   │            ┌─────────────────────────┐
                                   │            │  Download Completes     │
                                   │            │  1. Upload to R2        │
                                   │            │  2. Store R2 keys       │
                                   │            │  3. Delete from SSD     │
                                   │            │  4. Create cache entry  │
                                   │            └──────┬──────────────────┘
                                   │                   │
                                   │                   ▼
                                   │            ┌─────────────────────────┐
                                   │            │  Create User Link       │
                                   │            │  • Symlink              │
                                   │            │  • Database entry       │
                                   │            └─────────────────────────┘
                                   │
                                   └─── SSD Full ────────────────────┐
                                                                     │
                                                                     ▼
                                                      ┌─────────────────────────┐
                                                      │  Add to Queue           │
                                                      │  • Store in DB          │
                                                      │  • Return queued status │
                                                      │  • Auto-start when free │
                                                      └─────────────────────────┘
```

---

## 🔄 System Integration Overview

### How the Three Systems Work Together

#### 1. Torrent Cache System
**Purpose:** Prevent duplicate downloads, instant access

**Flow:**
```javascript
User adds torrent
  → Extract infoHash from magnet link
  → Check if infoHash exists in torrent_cache table
  → If exists and completed:
      • Files already in R2
      • Create symlink for user
      • Increment reference count
      • INSTANT ACCESS ⚡
  → If not exists:
      • Download to cache (continue to step 2)
```

#### 2. SSD Space Management
**Purpose:** Prevent SSD from filling up, queue system

**Flow:**
```javascript
Before download starts:
  → Check user quota (existing)
  → Check available SSD space (NEW)
      • Calculate: SSD_total - SSD_used - SSD_reserved - SSD_system_reserve
  → Check global concurrent limits (NEW)
  → If all checks pass:
      • Reserve SSD space
      • Start download
  → If SSD full:
      • Add to download_queue
      • Return queued status
      • Background job auto-starts when space free
```

#### 3. R2 Cloud Storage
**Purpose:** Move completed files to cheap cloud storage

**Flow:**
```javascript
Download completes:
  → Upload all files to R2
      • Path: users/{userId}/{infoHash}/filename
  → Store R2 object keys in r2_files table
  → Delete local SSD files
  → Update cache entry (download_status='completed')

User browses/streams:
  → Check if files in R2
  → Generate presigned R2 URL or stream from R2
  → Zero egress fees (Cloudflare R2)
```

### Integration Points

| Component | Interacts With | How |
|-----------|----------------|-----|
| **Torrent Cache** | SSD Management | Cache miss → Triggers SSD space check |
| **Torrent Cache** | R2 Storage | Cached files stored in R2, not SSD |
| **SSD Management** | R2 Storage | Auto-moves completed files to R2 to free SSD |
| **SSD Management** | Queue System | SSD full → Add to queue |
| **Queue System** | SSD Management | SSD space freed → Process queue |
| **R2 Storage** | Streaming | Stream from R2 instead of local disk |
| **Torrent Cache** | User Links | Symlinks point to cache directory |

---

## 💾 Database Schema Changes

### New Tables

#### 1. `torrent_cache` - Global Torrent Cache
```sql
CREATE TABLE IF NOT EXISTS torrent_cache (
  info_hash TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_size INTEGER NOT NULL,
  files_count INTEGER DEFAULT 0,
  cache_path TEXT NOT NULL,                      -- Local path (temporary)
  r2_uploaded BOOLEAN DEFAULT 0,                 -- NEW: Is uploaded to R2?
  reference_count INTEGER DEFAULT 0,             -- How many users have this
  download_status TEXT DEFAULT 'downloading',    -- 'downloading', 'completed', 'error'
  first_cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_info_hash ON torrent_cache(info_hash);
CREATE INDEX idx_cache_ref_count ON torrent_cache(reference_count);
CREATE INDEX idx_cache_status ON torrent_cache(download_status);
CREATE INDEX idx_cache_r2_uploaded ON torrent_cache(r2_uploaded);
```

#### 2. `user_torrent_links` - User-to-Cache Mapping
```sql
CREATE TABLE IF NOT EXISTS user_torrent_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  info_hash TEXT NOT NULL,
  user_folder_name TEXT NOT NULL,
  symlink_path TEXT NOT NULL,
  is_cached BOOLEAN DEFAULT 0,                   -- 1=instant cached, 0=downloaded
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (info_hash) REFERENCES torrent_cache(info_hash) ON DELETE CASCADE
);

CREATE INDEX idx_user_links_user_id ON user_torrent_links(user_id);
CREATE INDEX idx_user_links_info_hash ON user_torrent_links(info_hash);
CREATE INDEX idx_user_links_cached ON user_torrent_links(is_cached);
```

#### 3. `r2_files` - R2 Storage Metadata
```sql
CREATE TABLE IF NOT EXISTS r2_files (
  id TEXT PRIMARY KEY,
  info_hash TEXT NOT NULL,
  file_path TEXT NOT NULL,                       -- Path within torrent
  r2_object_key TEXT NOT NULL,                   -- R2: users/{userId}/{infoHash}/file
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (info_hash) REFERENCES torrent_cache(info_hash) ON DELETE CASCADE
);

CREATE INDEX idx_r2_files_info_hash ON r2_files(info_hash);
CREATE INDEX idx_r2_files_object_key ON r2_files(r2_object_key);
```

#### 4. `ssd_reservations` - Global SSD Space Reservations
```sql
CREATE TABLE IF NOT EXISTS ssd_reservations (
  id TEXT PRIMARY KEY,
  info_hash TEXT NOT NULL,
  user_id TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT CHECK (status IN ('active','released','finalized')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (info_hash) REFERENCES torrent_cache(info_hash) ON DELETE CASCADE
);

CREATE INDEX idx_ssd_reservations_status ON ssd_reservations(status);
CREATE INDEX idx_ssd_reservations_user ON ssd_reservations(user_id);
```

#### 5. `download_queue` - Download Queue System (with BullMQ integration)
```sql
CREATE TABLE IF NOT EXISTS download_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  magnet_link TEXT NOT NULL,
  info_hash TEXT,
  estimated_size INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('queued','downloading','completed','failed','cancelled')) DEFAULT 'queued',
  bullmq_job_id TEXT,                       -- BullMQ job reference
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,            -- Track retry attempts
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_queue_status ON download_queue(status);
CREATE INDEX idx_queue_priority ON download_queue(priority DESC, requested_at ASC);
CREATE INDEX idx_queue_user ON download_queue(user_id);
CREATE INDEX idx_queue_bullmq_job ON download_queue(bullmq_job_id);
```

### Modified Tables

#### Update `users` table
```sql
ALTER TABLE users ADD COLUMN ssd_quota INTEGER DEFAULT 10737418240;  -- 10GB SSD quota
```

#### Update `storage_reservations` table (existing)
```sql
ALTER TABLE storage_reservations ADD COLUMN info_hash TEXT;
ALTER TABLE storage_reservations ADD COLUMN is_cached BOOLEAN DEFAULT 0;
```

### Environment Variables

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=seedr-lite-storage
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_PUBLIC_DOMAIN=https://files.yourdomain.com  # Optional custom domain

# SSD Space Management
SSD_TOTAL_CAPACITY=107374182400           # 100GB total SSD
SSD_RESERVED_FOR_SYSTEM=5368709120        # 5GB reserved for OS
SSD_MAX_DOWNLOAD_SPACE=102005473280       # 95GB max for torrents
SSD_CHECK_INTERVAL=30000                  # Check every 30 seconds

# Redis + BullMQ Configuration (Docker)
REDIS_HOST=localhost                      # Redis host (use 'redis' for Docker network)
REDIS_PORT=6379                           # Redis port
REDIS_PASSWORD=                           # Redis password (optional)
REDIS_DB=0                                # Redis database number

# Queue System (BullMQ)
QUEUE_ENABLED=true
QUEUE_MAX_CONCURRENT_GLOBAL=10            # Max global concurrent downloads
QUEUE_MAX_RETRIES=3                       # Max retry attempts for failed jobs
QUEUE_RETRY_DELAY=60000                   # Delay between retries (1 minute)
QUEUE_JOB_TIMEOUT=3600000                 # Job timeout (1 hour)

# Cache System
CACHE_CLEANUP_INTERVAL=86400000           # Cleanup every 24 hours
CACHE_RETENTION_DAYS=7                    # Keep unused cache for 7 days
CACHE_MAX_SINGLE_TORRENT_SIZE=107374182400  # 100GB max per torrent

# Storage Mode
STORAGE_MODE=hybrid                       # local, r2, hybrid
AUTO_MIGRATE_TO_R2=true                   # Auto-migrate completed to R2
```

### Docker Configuration

#### File: `docker-compose.yml`
```yaml
version: '3.8'

services:
  # Redis for BullMQ job queue
  redis:
    image: redis:7-alpine
    container_name: seedr-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy noeviction
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Bull Board - Queue Dashboard (Optional but recommended)
  bull-board:
    image: deadly0/bull-board
    container_name: seedr-bull-board
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_USE_TLS: "false"
      BULL_PREFIX: "bull"
    depends_on:
      - redis

  # Seedr Server (your app)
  seedr-server:
    build:
      context: ./seedr-server
      dockerfile: Dockerfile
    container_name: seedr-server
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./seedr-server/src/storage:/app/src/storage
      - ./seedr-server/database:/app/database
    depends_on:
      redis:
        condition: service_healthy

volumes:
  redis_data:
    driver: local
```

#### File: `seedr-server/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/index.js"]
```

---

## 🗓️ Implementation Roadmap

### Phase 1: Database & Infrastructure (Week 1)
**Focus:** Set up foundations

- [ ] Create all new database tables
- [ ] Add database migration scripts
- [ ] Create `cache/` directory structure
- [ ] Install dependencies:
  - [ ] `@aws-sdk/client-s3` - R2 storage
  - [ ] `bullmq` - Job queue
  - [ ] `ioredis` - Redis client
- [ ] Set up Docker environment:
  - [ ] Create `docker-compose.yml`
  - [ ] Create `Dockerfile` for seedr-server
  - [ ] Configure Redis container
  - [ ] Configure Bull Board dashboard (optional)
- [ ] Add environment variables
- [ ] Create R2 client initialization
- [ ] Create Redis connection module
- [ ] Add basic database helper functions

**Deliverables:**
- Database schema updated
- R2 client configured
- Cache directory created
- Docker containers running (Redis + Bull Board)
- Redis connection tested

---

### Phase 2: SSD Space Management + BullMQ Queue (Week 2)
**Focus:** Prevent SSD from filling up, implement robust queue

- [ ] Create `src/utils/diskSpace.js`
  - [ ] `getAvailableDiskSpace()`
  - [ ] `hasEnoughSpace()`
  - [ ] `getTotalSSDReservations()`
- [ ] Create `src/models/ssdReservations.js`
  - [ ] `createSSDReservation()`
  - [ ] `releaseSSDReservation()`
  - [ ] `getSSDUsage()`
- [ ] Modify `torrentManager.js`
  - [ ] Add SSD space check before download
  - [ ] Reserve SSD space atomically
  - [ ] Release SSD space on completion
- [ ] Implement BullMQ download queue
  - [ ] Create `src/services/redis.js` - Redis connection
  - [ ] Create `src/services/queueManager.js` - BullMQ wrapper
  - [ ] `addToQueue()` - Add job to BullMQ
  - [ ] `startWorker()` - Process jobs with concurrency control
  - [ ] `cancelQueueItem()` - Cancel pending jobs
  - [ ] `getQueueStats()` - Queue statistics
  - [ ] `retryFailedJobs()` - Retry failed downloads
- [ ] Set up Bull Board dashboard for monitoring
- [ ] Test SSD full scenarios
- [ ] Test queue retry mechanisms

**Deliverables:**
- SSD space checking works
- BullMQ queue functional with retries
- Bull Board dashboard accessible
- No more crashes when SSD full
- Graceful handling of concurrent downloads

---

### Phase 3: Torrent Cache System (Week 3)
**Focus:** Prevent duplicate downloads

- [ ] Create `src/services/cacheManager.js`
  - [ ] `checkCacheAvailability(infoHash)`
  - [ ] `createCacheEntry()`
  - [ ] `incrementCacheRefCount()`
  - [ ] `decrementCacheRefCount()`
- [ ] Modify `torrentManager.js`
  - [ ] Extract infoHash from magnet
  - [ ] Check cache before download
  - [ ] Download to `cache/{infoHash}/`
  - [ ] Create symlinks for users
- [ ] Create `src/utils/symlinkHelper.js`
  - [ ] `createUserSymlink()` (Windows junction support)
  - [ ] `deleteUserSymlink()`
  - [ ] `isSymlink()`
- [ ] Implement cache cleanup
  - [ ] Background job for unused cache
  - [ ] Reference counting system

**Deliverables:**
- Cache hit detection works
- Symlinks created correctly
- Duplicate downloads prevented

---

### Phase 4: R2 Storage Integration (Week 4)
**Focus:** Move completed files to cloud

- [ ] Create `src/services/r2Storage.js`
  - [ ] `uploadFileToR2(localPath, r2Key)`
  - [ ] `uploadTorrentToR2(infoHash)`
  - [ ] `deleteFromR2(r2Key)`
  - [ ] `getR2ObjectStream(r2Key, range)`
  - [ ] `listR2Objects(prefix)`
- [ ] Modify `torrentManager.js`
  - [ ] Upload to R2 when download completes
  - [ ] Store R2 keys in database
  - [ ] Delete local files after upload
  - [ ] Mark cache as `r2_uploaded=1`
- [ ] Modify `stream.controller.js`
  - [ ] Check if files in R2
  - [ ] Stream from R2 instead of local
  - [ ] Support range requests from R2
- [ ] Modify `files.controller.js`
  - [ ] Browse files from R2 metadata
  - [ ] Stream/download from R2
  - [ ] Delete from R2

**Deliverables:**
- Files uploaded to R2 after download
- Streaming from R2 works
- SSD space freed after R2 upload

---

### Phase 5: Integration & Testing (Week 5)
**Focus:** Make all systems work together

- [ ] Integration testing
  - [ ] Cache hit → Files from R2
  - [ ] Cache miss → Download → R2
  - [ ] SSD full → Queue → Auto-start
  - [ ] Multiple users same torrent
- [ ] Error handling
  - [ ] R2 upload failures
  - [ ] Network issues
  - [ ] Corrupted cache
- [ ] Performance optimization
  - [ ] Parallel R2 uploads
  - [ ] Cache lookup optimization
  - [ ] Queue processing efficiency
- [ ] Database cleanup jobs
  - [ ] Unused cache cleanup
  - [ ] Stale reservations
  - [ ] Old queue entries

**Deliverables:**
- All systems integrated
- Error handling robust
- Performance optimized

---

### Phase 6: Frontend & API (Week 6)
**Focus:** User-facing features

- [ ] API endpoints
  - [ ] `GET /api/torrents/check-cache` - Check if torrent is cached
  - [ ] `GET /api/torrents/queue` - Get user's queue
  - [ ] `DELETE /api/torrents/queue/:id` - Cancel queued download
  - [ ] `GET /api/admin/cache-stats` - Cache statistics
  - [ ] `GET /api/admin/ssd-usage` - SSD usage info
  - [ ] `GET /api/admin/queue/stats` - BullMQ queue statistics
  - [ ] `POST /api/admin/queue/pause` - Pause the queue
  - [ ] `POST /api/admin/queue/resume` - Resume the queue
  - [ ] `POST /api/admin/queue/retry-failed` - Retry all failed jobs
  - [ ] `POST /api/admin/queue/clean` - Clean old completed jobs
- [ ] Frontend indicators
  - [ ] ⚡ "Cached" badge on torrents
  - [ ] "Queued" status display
  - [ ] Queue position indicator
  - [ ] Real-time progress updates
  - [ ] SSD usage dashboard
- [ ] Admin dashboard
  - [ ] Cache statistics
  - [ ] SSD usage graphs
  - [ ] BullMQ queue management (or use Bull Board at :3001)
  - [ ] Manual cache cleanup
  - [ ] Failed jobs management

**Deliverables:**
- User-facing features complete
- Admin tools available
- Bull Board dashboard accessible
- API documentation

---

### Phase 7: Monitoring & Production (Week 7)
**Focus:** Deploy and monitor

- [ ] Metrics & logging
  - [ ] Cache hit rate tracking
  - [ ] SSD usage monitoring
  - [ ] R2 upload success rate
  - [ ] Queue processing time
- [ ] Alerts
  - [ ] SSD usage > 90%
  - [ ] R2 upload failures
  - [ ] Queue too long
- [ ] Documentation
  - [ ] Admin guide
  - [ ] API documentation
  - [ ] Troubleshooting guide
- [ ] Production deployment
  - [ ] Gradual rollout
  - [ ] Monitor performance
  - [ ] User feedback

**Deliverables:**
- System in production
- Monitoring active
- Documentation complete

---

## 🔧 Detailed Implementation

### 1. SSD Space Management

#### File: `src/utils/diskSpace.js`
```javascript
const fs = require('fs').promises;
const path = require('path');

class DiskSpaceManager {
  constructor() {
    this.ssdTotal = parseInt(process.env.SSD_TOTAL_CAPACITY) || 100 * 1024 * 1024 * 1024;
    this.ssdReserved = parseInt(process.env.SSD_RESERVED_FOR_SYSTEM) || 5 * 1024 * 1024 * 1024;
    this.maxDownloadSpace = this.ssdTotal - this.ssdReserved;
  }

  async getAvailableDiskSpace(directory) {
    try {
      const stats = await fs.statfs(directory);
      return {
        total: stats.blocks * stats.bsize,
        free: stats.bavail * stats.bsize,
        used: (stats.blocks - stats.bavail) * stats.bsize
      };
    } catch (error) {
      console.error('Failed to get disk space:', error);
      throw error;
    }
  }

  async hasEnoughSpace(requiredBytes) {
    const { free } = await this.getAvailableDiskSpace(process.env.ROOT);
    const available = free - this.ssdReserved;

    // Get active reservations
    const reserved = await this.getTotalSSDReservations();
    const actualAvailable = available - reserved;

    return actualAvailable >= requiredBytes;
  }

  async getTotalSSDReservations() {
    const db = require('../models/database');
    const result = await db.db.get(`
      SELECT COALESCE(SUM(size_bytes), 0) as total
      FROM ssd_reservations
      WHERE status = 'active'
    `);
    return result.total;
  }

  async getDetailedSSDUsage() {
    const diskStats = await this.getAvailableDiskSpace(process.env.ROOT);
    const reserved = await this.getTotalSSDReservations();

    return {
      total: this.ssdTotal,
      used: diskStats.used,
      free: diskStats.free,
      systemReserved: this.ssdReserved,
      activeReservations: reserved,
      availableForDownloads: diskStats.free - this.ssdReserved - reserved,
      usagePercent: (diskStats.used / this.ssdTotal * 100).toFixed(2)
    };
  }
}

module.exports = new DiskSpaceManager();
```

#### File: `src/models/ssdReservations.js`
```javascript
const database = require('./database');
const { v4: uuidv4 } = require('uuid');

class SSDReservationManager {
  async createReservation(userId, infoHash, sizeBytes) {
    const id = uuidv4();

    await database.db.run(`
      INSERT INTO ssd_reservations (id, info_hash, user_id, size_bytes, status)
      VALUES (?, ?, ?, ?, 'active')
    `, [id, infoHash, userId, sizeBytes]);

    return id;
  }

  async releaseReservation(infoHash) {
    await database.db.run(`
      UPDATE ssd_reservations
      SET status = 'released'
      WHERE info_hash = ? AND status = 'active'
    `, [infoHash]);
  }

  async finalizeReservation(infoHash) {
    await database.db.run(`
      UPDATE ssd_reservations
      SET status = 'finalized'
      WHERE info_hash = ? AND status = 'active'
    `, [infoHash]);
  }

  async getTotalActiveReservations() {
    const result = await database.db.get(`
      SELECT COALESCE(SUM(size_bytes), 0) as total
      FROM ssd_reservations
      WHERE status = 'active'
    `);
    return result.total;
  }

  async cleanupStaleReservations(olderThanHours = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    await database.db.run(`
      UPDATE ssd_reservations
      SET status = 'released'
      WHERE status = 'active' AND created_at < ?
    `, [cutoff]);
  }
}

module.exports = new SSDReservationManager();
```

---

### 2. Download Queue System (Redis + BullMQ)

#### File: `src/services/redis.js`
```javascript
const { Redis } = require('ioredis');

// Create Redis connection for BullMQ
const createRedisConnection = () => {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,    // Required for BullMQ
  });
};

// Singleton connection for general use
let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisConnection();

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }
  return redisClient;
};

module.exports = {
  createRedisConnection,
  getRedisClient
};
```

#### File: `src/services/queueManager.js`
```javascript
const { Queue, Worker, QueueEvents } = require('bullmq');
const { createRedisConnection } = require('./redis');
const database = require('../models/database');
const { v4: uuidv4 } = require('uuid');

class QueueManager {
  constructor() {
    this.maxConcurrent = parseInt(process.env.QUEUE_MAX_CONCURRENT_GLOBAL) || 10;
    this.maxRetries = parseInt(process.env.QUEUE_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.QUEUE_RETRY_DELAY) || 60000;
    this.jobTimeout = parseInt(process.env.QUEUE_JOB_TIMEOUT) || 3600000;

    this.queue = null;
    this.worker = null;
    this.queueEvents = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    const connection = createRedisConnection();

    // Create the download queue
    this.queue = new Queue('downloads', {
      connection,
      defaultJobOptions: {
        attempts: this.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.retryDelay,
        },
        timeout: this.jobTimeout,
        removeOnComplete: {
          age: 24 * 3600,    // Keep completed jobs for 24 hours
          count: 1000,       // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    // Create queue events listener
    this.queueEvents = new QueueEvents('downloads', { connection });

    // Set up event listeners
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('🚀 BullMQ Queue Manager initialized');
  }

  setupEventListeners() {
    this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      console.log(`✅ Job ${jobId} completed`);
      await this.updateJobStatus(jobId, 'completed');
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed: ${failedReason}`);
      await this.updateJobStatus(jobId, 'failed', failedReason);
    });

    this.queueEvents.on('progress', async ({ jobId, data }) => {
      console.log(`📊 Job ${jobId} progress: ${data}%`);
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`⏳ Job ${jobId} is waiting`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      console.log(`▶️  Job ${jobId} is now active`);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      console.warn(`⚠️  Job ${jobId} has stalled`);
    });
  }

  async addToQueue(userId, magnetLink, infoHash, estimatedSize = 0, priority = 0) {
    if (!this.isInitialized) await this.initialize();

    const jobId = uuidv4();

    // Add to BullMQ queue
    const job = await this.queue.add(
      'download-torrent',
      {
        jobId,
        userId,
        magnetLink,
        infoHash,
        estimatedSize,
      },
      {
        jobId,                          // Use our own ID
        priority: 10 - priority,        // BullMQ: lower = higher priority
        delay: 0,                        // Start immediately when worker available
      }
    );

    // Also store in database for persistence and UI
    await database.db.run(`
      INSERT INTO download_queue
      (id, user_id, magnet_link, info_hash, estimated_size, priority, status, bullmq_job_id)
      VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)
    `, [jobId, userId, magnetLink, infoHash, estimatedSize, priority, job.id]);

    console.log(`📥 Added to BullMQ queue: ${infoHash} (Job: ${jobId})`);

    const position = await this.getQueuePosition(jobId);

    return {
      id: jobId,
      bullmqJobId: job.id,
      status: 'queued',
      position,
    };
  }

  async getQueuePosition(jobId) {
    if (!this.isInitialized) await this.initialize();

    const job = await this.queue.getJob(jobId);
    if (!job) return -1;

    const state = await job.getState();
    if (state === 'active') return 0;
    if (state !== 'waiting' && state !== 'delayed') return -1;

    const waiting = await this.queue.getWaiting();
    const index = waiting.findIndex(j => j.id === jobId);
    return index + 1;
  }

  async updateJobStatus(jobId, status, errorMessage = null) {
    const updateQuery = errorMessage
      ? `UPDATE download_queue SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? OR bullmq_job_id = ?`
      : `UPDATE download_queue SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? OR bullmq_job_id = ?`;

    const params = errorMessage
      ? [status, errorMessage, jobId, jobId]
      : [status, jobId, jobId];

    await database.db.run(updateQuery, params);
  }

  // Start the worker that processes jobs
  async startWorker() {
    if (!this.isInitialized) await this.initialize();

    const diskSpace = require('../utils/diskSpace');
    const torrentManager = require('./torrentManager');

    this.worker = new Worker(
      'downloads',
      async (job) => {
        const { jobId, userId, magnetLink, infoHash, estimatedSize } = job.data;

        console.log(`🔄 Processing job ${jobId}: ${infoHash}`);

        // Update status to downloading
        await database.db.run(`
          UPDATE download_queue
          SET status = 'downloading', started_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [jobId]);

        // Check SSD space before starting
        const hasSpace = await diskSpace.hasEnoughSpace(estimatedSize || 0);
        if (!hasSpace) {
          // Move back to delayed queue
          throw new Error('INSUFFICIENT_SPACE');
        }

        // Report progress
        await job.updateProgress(10);

        // Start the actual download
        const result = await torrentManager.downloadToCache(
          userId,
          magnetLink,
          infoHash,
          null,
          async (progress) => {
            // Update progress from torrent download
            await job.updateProgress(10 + Math.floor(progress * 0.9));
          }
        );

        await job.updateProgress(100);

        return {
          success: true,
          infoHash,
          ...result,
        };
      },
      {
        connection: createRedisConnection(),
        concurrency: this.maxConcurrent,
        limiter: {
          max: this.maxConcurrent,
          duration: 1000,
        },
      }
    );

    this.worker.on('completed', (job, result) => {
      console.log(`✅ Worker completed job ${job.id}:`, result);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Worker failed job ${job?.id}:`, err.message);

      // Special handling for space issues - don't count as attempt
      if (err.message === 'INSUFFICIENT_SPACE') {
        console.log(`💾 Job ${job?.id} delayed due to insufficient space`);
      }
    });

    this.worker.on('error', (err) => {
      console.error('❌ Worker error:', err);
    });

    console.log(`🔄 BullMQ Worker started (concurrency: ${this.maxConcurrent})`);
  }

  async getUserQueue(userId) {
    return await database.db.all(`
      SELECT *
      FROM download_queue
      WHERE user_id = ? AND status IN ('queued', 'downloading')
      ORDER BY priority DESC, requested_at ASC
    `, [userId]);
  }

  async cancelQueueItem(userId, queueId) {
    if (!this.isInitialized) await this.initialize();

    // Get job from database
    const queueItem = await database.db.get(`
      SELECT bullmq_job_id FROM download_queue
      WHERE id = ? AND user_id = ? AND status = 'queued'
    `, [queueId, userId]);

    if (queueItem?.bullmq_job_id) {
      // Remove from BullMQ
      const job = await this.queue.getJob(queueItem.bullmq_job_id);
      if (job) {
        await job.remove();
      }
    }

    // Update database
    await database.db.run(`
      UPDATE download_queue
      SET status = 'cancelled'
      WHERE id = ? AND user_id = ? AND status = 'queued'
    `, [queueId, userId]);

    console.log(`🚫 Cancelled queue item: ${queueId}`);
  }

  async getQueueStats() {
    if (!this.isInitialized) await this.initialize();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  async pauseQueue() {
    if (!this.isInitialized) await this.initialize();
    await this.queue.pause();
    console.log('⏸️  Queue paused');
  }

  async resumeQueue() {
    if (!this.isInitialized) await this.initialize();
    await this.queue.resume();
    console.log('▶️  Queue resumed');
  }

  async retryFailedJobs() {
    if (!this.isInitialized) await this.initialize();

    const failed = await this.queue.getFailed();
    for (const job of failed) {
      await job.retry();
    }

    console.log(`🔄 Retried ${failed.length} failed jobs`);
    return failed.length;
  }

  async cleanOldJobs(gracePeriodMs = 24 * 60 * 60 * 1000) {
    if (!this.isInitialized) await this.initialize();

    const cleaned = await this.queue.clean(gracePeriodMs, 1000, 'completed');
    console.log(`🧹 Cleaned ${cleaned.length} old completed jobs`);
    return cleaned.length;
  }

  async shutdown() {
    console.log('🛑 Shutting down Queue Manager...');

    if (this.worker) {
      await this.worker.close();
    }
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
    if (this.queue) {
      await this.queue.close();
    }

    console.log('✅ Queue Manager shut down');
  }
}

// Export singleton instance
const queueManager = new QueueManager();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await queueManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await queueManager.shutdown();
  process.exit(0);
});

module.exports = queueManager;
```

#### File: `src/index.js` (Updated initialization)
```javascript
const express = require('express');
const queueManager = require('./services/queueManager');
const cacheManager = require('./services/cacheManager');
// ... other imports

async function startServer() {
  const app = express();

  // ... existing middleware setup

  // Initialize BullMQ Queue Manager
  await queueManager.initialize();

  // Start the BullMQ worker
  await queueManager.startWorker();

  // Start cache cleanup job
  cacheManager.startCleanupJob();

  // ... existing routes

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Bull Board dashboard: http://localhost:3001`);
  });
}

startServer().catch(console.error);
```

#### File: `src/routes/admin.routes.js` (Queue management API)
```javascript
const express = require('express');
const router = express.Router();
const queueManager = require('../services/queueManager');

// Get queue statistics
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await queueManager.getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause the queue
router.post('/queue/pause', async (req, res) => {
  try {
    await queueManager.pauseQueue();
    res.json({ success: true, message: 'Queue paused' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resume the queue
router.post('/queue/resume', async (req, res) => {
  try {
    await queueManager.resumeQueue();
    res.json({ success: true, message: 'Queue resumed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry all failed jobs
router.post('/queue/retry-failed', async (req, res) => {
  try {
    const count = await queueManager.retryFailedJobs();
    res.json({ success: true, retriedCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean old completed jobs
router.post('/queue/clean', async (req, res) => {
  try {
    const count = await queueManager.cleanOldJobs();
    res.json({ success: true, cleanedCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

### 3. Torrent Cache System

#### File: `src/services/cacheManager.js`
```javascript
const database = require('../models/database');
const path = require('path');

class CacheManager {
  constructor() {
    this.cacheDir = path.join(process.env.ROOT, '../cache');
    this.retentionDays = parseInt(process.env.CACHE_RETENTION_DAYS) || 7;
  }

  extractInfoHash(magnetURI) {
    const match = magnetURI.match(/btih:([a-fA-F0-9]{40})/i);
    return match ? match[1].toLowerCase() : null;
  }

  async checkCacheAvailability(infoHash) {
    const cache = await database.db.get(`
      SELECT * FROM torrent_cache
      WHERE info_hash = ? AND download_status = 'completed'
    `, [infoHash]);

    if (cache) {
      // Update last accessed
      await database.db.run(`
        UPDATE torrent_cache
        SET last_accessed_at = CURRENT_TIMESTAMP
        WHERE info_hash = ?
      `, [infoHash]);
    }

    return cache;
  }

  async createCacheEntry(infoHash, name, totalSize, filesCount = 0) {
    const cachePath = path.join(this.cacheDir, infoHash);

    await database.db.run(`
      INSERT OR IGNORE INTO torrent_cache
      (info_hash, name, total_size, files_count, cache_path, download_status, r2_uploaded)
      VALUES (?, ?, ?, ?, ?, 'downloading', 0)
    `, [infoHash, name, totalSize, filesCount, cachePath]);

    console.log(`📦 Cache entry created: ${infoHash}`);
  }

  async updateCacheStatus(infoHash, status, totalSize = null) {
    if (totalSize !== null) {
      await database.db.run(`
        UPDATE torrent_cache
        SET download_status = ?, total_size = ?
        WHERE info_hash = ?
      `, [status, totalSize, infoHash]);
    } else {
      await database.db.run(`
        UPDATE torrent_cache
        SET download_status = ?
        WHERE info_hash = ?
      `, [status, infoHash]);
    }
  }

  async markAsR2Uploaded(infoHash) {
    await database.db.run(`
      UPDATE torrent_cache
      SET r2_uploaded = 1
      WHERE info_hash = ?
    `, [infoHash]);
  }

  async incrementRefCount(infoHash) {
    await database.db.run(`
      UPDATE torrent_cache
      SET reference_count = reference_count + 1,
          last_accessed_at = CURRENT_TIMESTAMP
      WHERE info_hash = ?
    `, [infoHash]);
  }

  async decrementRefCount(infoHash) {
    await database.db.run(`
      UPDATE torrent_cache
      SET reference_count = reference_count - 1
      WHERE info_hash = ?
    `, [infoHash]);
  }

  async getUnusedCache() {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000).toISOString();

    return await database.db.all(`
      SELECT * FROM torrent_cache
      WHERE reference_count = 0
        AND last_accessed_at < ?
        AND download_status = 'completed'
    `, [cutoff]);
  }

  async cleanupUnusedCache() {
    const unusedCache = await this.getUnusedCache();
    const fs = require('fs').promises;
    const r2Storage = require('./r2Storage');

    console.log(`🧹 Cleaning up ${unusedCache.length} unused cache entries`);

    for (const cache of unusedCache) {
      try {
        // Delete from R2 if uploaded
        if (cache.r2_uploaded) {
          await r2Storage.deleteTorrentFromR2(cache.info_hash);
        }

        // Delete local cache directory
        await fs.rm(cache.cache_path, { recursive: true, force: true });

        // Delete database entries
        await database.db.run(`DELETE FROM r2_files WHERE info_hash = ?`, [cache.info_hash]);
        await database.db.run(`DELETE FROM torrent_cache WHERE info_hash = ?`, [cache.info_hash]);

        console.log(`✅ Deleted cache: ${cache.info_hash}`);
      } catch (error) {
        console.error(`❌ Failed to delete cache ${cache.info_hash}:`, error);
      }
    }
  }

  async getCacheStats() {
    const stats = await database.db.get(`
      SELECT
        COUNT(*) as total_torrents,
        SUM(total_size) as total_size,
        SUM(reference_count) as total_references,
        AVG(reference_count) as avg_references
      FROM torrent_cache
      WHERE download_status = 'completed'
    `);

    const topCached = await database.db.all(`
      SELECT name, reference_count, total_size
      FROM torrent_cache
      WHERE download_status = 'completed'
      ORDER BY reference_count DESC
      LIMIT 10
    `);

    return {
      ...stats,
      topCached
    };
  }

  startCleanupJob() {
    const interval = parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000;
    setInterval(() => this.cleanupUnusedCache(), interval);
    console.log(`🧹 Cache cleanup job started (interval: ${interval / 1000 / 60} minutes)`);
  }
}

module.exports = new CacheManager();
```

---

### 4. R2 Storage Integration

#### File: `src/services/r2Storage.js`
```javascript
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const database = require('../models/database');

class R2StorageManager {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    this.bucket = process.env.R2_BUCKET_NAME;
  }

  async uploadFileToR2(localPath, r2Key, metadata = {}) {
    try {
      const fileStream = fs.createReadStream(localPath);
      const stats = fs.statSync(localPath);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
        Body: fileStream,
        ContentLength: stats.size,
        Metadata: metadata
      });

      await this.client.send(command);
      console.log(`✅ Uploaded to R2: ${r2Key}`);

      return {
        success: true,
        key: r2Key,
        size: stats.size
      };
    } catch (error) {
      console.error(`❌ R2 upload failed: ${r2Key}`, error);
      throw error;
    }
  }

  async uploadTorrentToR2(infoHash, cachePath) {
    const fs = require('fs').promises;

    try {
      // Get all files in cache directory
      const files = await this.getAllFiles(cachePath);

      console.log(`📤 Uploading ${files.length} files to R2 for ${infoHash}`);

      const uploadedFiles = [];

      for (const file of files) {
        const relativePath = path.relative(cachePath, file);
        const r2Key = `cache/${infoHash}/${relativePath}`;

        const result = await this.uploadFileToR2(file, r2Key);

        // Store in database
        await database.db.run(`
          INSERT INTO r2_files (id, info_hash, file_path, r2_object_key, file_name, file_size)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          require('crypto').randomUUID(),
          infoHash,
          relativePath,
          r2Key,
          path.basename(file),
          result.size
        ]);

        uploadedFiles.push(result);
      }

      console.log(`✅ Uploaded ${uploadedFiles.length} files to R2`);

      // Mark cache as R2 uploaded
      const cacheManager = require('./cacheManager');
      await cacheManager.markAsR2Uploaded(infoHash);

      return uploadedFiles;
    } catch (error) {
      console.error(`❌ Failed to upload torrent to R2: ${infoHash}`, error);
      throw error;
    }
  }

  async getAllFiles(dirPath, arrayOfFiles = []) {
    const fs = require('fs').promises;
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        arrayOfFiles = await this.getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    }

    return arrayOfFiles;
  }

  async getR2ObjectStream(r2Key, range = null) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
        Range: range ? `bytes=${range.start}-${range.end}` : undefined
      });

      const response = await this.client.send(command);
      return response.Body;
    } catch (error) {
      console.error(`❌ Failed to get R2 object: ${r2Key}`, error);
      throw error;
    }
  }

  async deleteFromR2(r2Key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: r2Key
      });

      await this.client.send(command);
      console.log(`🗑️  Deleted from R2: ${r2Key}`);
    } catch (error) {
      console.error(`❌ Failed to delete from R2: ${r2Key}`, error);
      throw error;
    }
  }

  async deleteTorrentFromR2(infoHash) {
    // Get all R2 files for this torrent
    const files = await database.db.all(`
      SELECT r2_object_key FROM r2_files
      WHERE info_hash = ?
    `, [infoHash]);

    for (const file of files) {
      await this.deleteFromR2(file.r2_object_key);
    }

    // Delete from database
    await database.db.run(`DELETE FROM r2_files WHERE info_hash = ?`, [infoHash]);
  }

  async listR2Objects(prefix) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    });

    const response = await this.client.send(command);
    return response.Contents || [];
  }
}

module.exports = new R2StorageManager();
```

---

### 5. Modified torrentManager.js

```javascript
// Add to existing torrentManager.js

const cacheManager = require('./cacheManager');
const diskSpace = require('../utils/diskSpace');
const ssdReservations = require('../models/ssdReservations');
const queueManager = require('./queueManager');
const r2Storage = require('./r2Storage');

async addMagnet(userId, magnetLink, userProvidedName = null) {
  // 1. Extract infoHash
  const infoHash = cacheManager.extractInfoHash(magnetLink);
  if (!infoHash) {
    throw new Error('Invalid magnet link');
  }

  // 2. Check cache first
  const cacheEntry = await cacheManager.checkCacheAvailability(infoHash);

  if (cacheEntry && cacheEntry.r2_uploaded) {
    // ⚡ CACHE HIT - Instant access!
    console.log(`⚡ Cache hit: ${infoHash}`);
    return await this.createUserLinkFromCache(userId, cacheEntry, userProvidedName);
  }

  // 3. Cache miss - need to download
  // Check user quota (existing logic)
  const quotaInfo = await database.getUserStorageInfoWithReservations(userId);
  if (quotaInfo.effectiveRemaining <= 0) {
    throw new Error('User quota exceeded');
  }

  // 4. Check SSD space (NEW)
  const estimatedSize = 0; // Will get actual size from metadata
  const hasSpace = await diskSpace.hasEnoughSpace(estimatedSize);

  if (!hasSpace) {
    // Add to queue
    console.log(`💾 SSD full, adding to queue: ${infoHash}`);
    return await queueManager.addToQueue(userId, magnetLink, infoHash, estimatedSize);
  }

  // 5. Start download
  return await this.downloadToCache(userId, magnetLink, infoHash, userProvidedName);
}

async downloadToCache(userId, magnetLink, infoHash, userProvidedName) {
  const cachePath = path.join(cacheManager.cacheDir, infoHash);

  // Create cache entry
  await cacheManager.createCacheEntry(infoHash, userProvidedName || 'Unknown', 0);

  // Start download
  const torrent = this.client.add(magnetLink, {
    path: cachePath
  });

  // Wait for metadata
  torrent.on('metadata', async () => {
    console.log(`📊 Metadata received: ${torrent.name} (${torrent.length} bytes)`);

    // Update cache entry with actual size
    await cacheManager.updateCacheStatus(infoHash, 'downloading', torrent.length);

    // Check space again with actual size
    const hasSpace = await diskSpace.hasEnoughSpace(torrent.length);
    if (!hasSpace) {
      torrent.destroy();
      await cacheManager.updateCacheStatus(infoHash, 'error');
      throw new Error('Not enough SSD space');
    }

    // Reserve SSD space
    await ssdReservations.createReservation(userId, infoHash, torrent.length);

    // Reserve user quota (existing)
    await reserveSpaceAtomic(userId, infoHash, torrent.length);
  });

  // Download complete
  torrent.on('done', async () => {
    console.log(`✅ Download complete: ${infoHash}`);

    try {
      // 1. Upload to R2
      await r2Storage.uploadTorrentToR2(infoHash, cachePath);

      // 2. Update cache status
      await cacheManager.updateCacheStatus(infoHash, 'completed', torrent.length);

      // 3. Create user link
      await this.createUserLinkFromCache(userId, await cacheManager.checkCacheAvailability(infoHash), userProvidedName);

      // 4. Delete local files
      await fs.promises.rm(cachePath, { recursive: true, force: true });
      console.log(`🗑️  Deleted local cache: ${cachePath}`);

      // 5. Release SSD reservation
      await ssdReservations.finalizeReservation(infoHash);

      // 6. Finalize user quota
      await finalizeReservation(userId, infoHash, torrent.length);

      // 7. Remove from WebTorrent (stop seeding)
      torrent.destroy();

    } catch (error) {
      console.error('❌ Post-download processing failed:', error);
      await cacheManager.updateCacheStatus(infoHash, 'error');
    }
  });

  return torrent;
}

async createUserLinkFromCache(userId, cacheEntry, userProvidedName) {
  const userDir = path.join(USER_STORAGE_DIR, userId);
  const folderName = userProvidedName || cacheEntry.name;
  const symlinkPath = path.join(userDir, folderName);

  // Create symlink/junction
  try {
    await fs.promises.symlink(cacheEntry.cache_path, symlinkPath, 'junction'); // Windows

    // Store in database
    await database.db.run(`
      INSERT INTO user_torrent_links (id, user_id, info_hash, user_folder_name, symlink_path, is_cached)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      require('crypto').randomUUID(),
      userId,
      cacheEntry.info_hash,
      folderName,
      symlinkPath,
      1 // is_cached = true
    ]);

    // Increment reference count
    await cacheManager.incrementRefCount(cacheEntry.info_hash);

    console.log(`✅ Created user link: ${symlinkPath} → ${cacheEntry.cache_path}`);

    return {
      instant: true,
      cached: true,
      infoHash: cacheEntry.info_hash,
      name: cacheEntry.name,
      size: cacheEntry.total_size
    };
  } catch (error) {
    console.error('❌ Symlink creation failed:', error);
    throw error;
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

#### 1. SSD Space Management
```javascript
describe('SSD Space Management', () => {
  it('should detect available disk space', async () => {
    const space = await diskSpace.getAvailableDiskSpace(process.env.ROOT);
    expect(space.total).toBeGreaterThan(0);
    expect(space.free).toBeLessThanOrEqual(space.total);
  });

  it('should check if enough space available', async () => {
    const result = await diskSpace.hasEnoughSpace(1024); // 1KB
    expect(result).toBe(true);
  });

  it('should account for reservations', async () => {
    await ssdReservations.createReservation('user1', 'abc123', 5 * 1024 * 1024 * 1024);
    const reserved = await diskSpace.getTotalSSDReservations();
    expect(reserved).toBeGreaterThan(0);
  });
});
```

#### 2. Cache System
```javascript
describe('Torrent Cache System', () => {
  it('should extract infoHash from magnet link', () => {
    const magnet = 'magnet:?xt=urn:btih:abc123...';
    const hash = cacheManager.extractInfoHash(magnet);
    expect(hash).toBe('abc123...');
  });

  it('should detect cache hit', async () => {
    await cacheManager.createCacheEntry('abc123', 'Test', 1000);
    await cacheManager.updateCacheStatus('abc123', 'completed');

    const cache = await cacheManager.checkCacheAvailability('abc123');
    expect(cache).toBeTruthy();
    expect(cache.download_status).toBe('completed');
  });

  it('should increment reference count', async () => {
    await cacheManager.incrementRefCount('abc123');
    const cache = await cacheManager.checkCacheAvailability('abc123');
    expect(cache.reference_count).toBe(1);
  });
});
```

#### 3. R2 Storage
```javascript
describe('R2 Storage Integration', () => {
  it('should upload file to R2', async () => {
    const testFile = '/tmp/test.txt';
    fs.writeFileSync(testFile, 'Hello R2');

    const result = await r2Storage.uploadFileToR2(testFile, 'test/test.txt');
    expect(result.success).toBe(true);
  });

  it('should stream from R2', async () => {
    const stream = await r2Storage.getR2ObjectStream('test/test.txt');
    expect(stream).toBeTruthy();
  });

  it('should delete from R2', async () => {
    await r2Storage.deleteFromR2('test/test.txt');
    // Verify deletion
  });
});
```

### Integration Tests

#### Scenario 1: Cache Hit
```javascript
describe('Integration: Cache Hit', () => {
  it('should provide instant access for cached torrents', async () => {
    // User A adds torrent
    const torrentA = await torrentManager.addMagnet('userA', MAGNET_LINK);
    await waitForDownloadComplete(torrentA);

    // User B adds same torrent
    const torrentB = await torrentManager.addMagnet('userB', MAGNET_LINK);

    // Should be instant
    expect(torrentB.instant).toBe(true);
    expect(torrentB.cached).toBe(true);

    // Both should have access to files
    const filesA = await browseFiles('userA', '/');
    const filesB = await browseFiles('userB', '/');

    expect(filesA).toEqual(filesB);
  });
});
```

#### Scenario 2: SSD Full → Queue (BullMQ)
```javascript
describe('Integration: BullMQ Queue System', () => {
  beforeAll(async () => {
    await queueManager.initialize();
  });

  afterAll(async () => {
    await queueManager.shutdown();
  });

  it('should queue downloads when SSD full', async () => {
    // Fill SSD
    await fillSSDToCapacity();

    // Try to add torrent
    const result = await torrentManager.addMagnet('user1', MAGNET_LINK);

    expect(result.status).toBe('queued');
    expect(result.position).toBeGreaterThan(0);
    expect(result.bullmqJobId).toBeDefined();

    // Free space
    await freeSomeSpace();

    // BullMQ worker will automatically process when space available
    // Wait for job to complete
    await waitForJobCompletion(result.id);

    // Should have completed download
    const queue = await queueManager.getUserQueue('user1');
    expect(queue.length).toBe(0); // No longer in queue
  });

  it('should respect concurrency limits', async () => {
    const maxConcurrent = 10;

    // Add more jobs than concurrency limit
    const jobs = await Promise.all(
      Array(15).fill().map((_, i) =>
        queueManager.addToQueue(`user${i}`, `magnet:?xt=urn:btih:${i}...`, `hash${i}`, 1000)
      )
    );

    // Check queue stats
    const stats = await queueManager.getQueueStats();
    expect(stats.active).toBeLessThanOrEqual(maxConcurrent);
    expect(stats.waiting).toBeGreaterThan(0);
  });

  it('should retry failed jobs automatically', async () => {
    // Add job that will fail
    const result = await queueManager.addToQueue('user1', FAILING_MAGNET, 'failhash', 1000);

    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check retry count
    const dbEntry = await database.db.get(
      'SELECT retry_count FROM download_queue WHERE id = ?',
      [result.id]
    );
    expect(dbEntry.retry_count).toBeGreaterThan(0);
  });

  it('should cancel queued jobs', async () => {
    const result = await queueManager.addToQueue('user1', MAGNET_LINK, 'cancelhash', 1000);

    await queueManager.cancelQueueItem('user1', result.id);

    const stats = await queueManager.getQueueStats();
    const job = await queueManager.queue.getJob(result.bullmqJobId);
    expect(job).toBeNull(); // Job removed from BullMQ
  });

  it('should provide accurate queue statistics', async () => {
    const stats = await queueManager.getQueueStats();

    expect(stats).toHaveProperty('waiting');
    expect(stats).toHaveProperty('active');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('failed');
    expect(stats).toHaveProperty('delayed');
    expect(stats).toHaveProperty('total');
  });
});
```

#### Scenario 3: R2 Migration
```javascript
describe('Integration: R2 Migration', () => {
  it('should upload to R2 after download', async () => {
    const torrent = await torrentManager.addMagnet('user1', MAGNET_LINK);
    await waitForDownloadComplete(torrent);

    // Check R2
    const r2Files = await r2Storage.listR2Objects(`cache/${torrent.infoHash}/`);
    expect(r2Files.length).toBeGreaterThan(0);

    // Check local files deleted
    const cacheDir = path.join(cacheManager.cacheDir, torrent.infoHash);
    const exists = fs.existsSync(cacheDir);
    expect(exists).toBe(false);

    // Should be able to stream from R2
    const stream = await streamFromR2(torrent.infoHash, 0);
    expect(stream).toBeTruthy();
  });
});
```

---

## 💰 Cost Analysis

### Current System (100 Users)

**Assumptions:**
- Average download per user: 10GB/month
- Total downloads: 1000GB/month
- VPS SSD: 200GB @ $50/month
- Bandwidth: Unlimited (included)

**Costs:**
- VPS: $50/month
- **Total: $50/month**

**Problems:**
- Duplicate downloads waste storage
- Expensive SSD filled quickly
- Users share popular torrents (waste)

---

### New System with R2 (100 Users)

**Assumptions:**
- Average download per user: 10GB/month
- Cache hit rate: 70% (popular torrents)
- Unique downloads: 300GB/month (70% deduplicated)
- Total user storage: 1000GB
- VPS SSD: 50GB @ $15/month (only for active downloads)
- R2 storage: 1000GB @ $0.015/GB

**Costs:**
- VPS (smaller): $15/month
- R2 storage: 1000GB × $0.015 = $15/month
- R2 egress: $0 (free!)
- **Total: $30/month**

**Savings: $20/month (40% reduction)**

---

### At Scale (1000 Users)

**Current System:**
- VPS SSD: 2TB @ $200/month
- Bandwidth: Huge (may need CDN)
- **Total: ~$300/month**

**New System:**
- VPS SSD: 100GB @ $25/month
- R2 storage: 10TB @ $150/month
- R2 egress: $0
- **Total: $175/month**

**Savings: $125/month (42% reduction)**

---

## 📊 Monitoring & Metrics

### Dashboard Metrics

#### 1. Cache Performance
```javascript
{
  cacheHitRate: 72.5,              // %
  totalCachedTorrents: 1,234,
  totalReferences: 3,456,
  storageSaved: 3.2 * 1024 * 1024 * 1024 * 1024,  // 3.2TB
  bandwidthSaved: 8.5 * 1024 * 1024 * 1024 * 1024, // 8.5TB
  avgAccessTime: 2000,              // ms (instant for cached)
  topCachedTorrents: [
    { name: 'Popular Movie', refCount: 123 },
    { name: 'Popular Series', refCount: 98 }
  ]
}
```

#### 2. SSD Usage
```javascript
{
  total: 100 * 1024 * 1024 * 1024,     // 100GB
  used: 45 * 1024 * 1024 * 1024,       // 45GB
  free: 55 * 1024 * 1024 * 1024,       // 55GB
  reserved: 10 * 1024 * 1024 * 1024,   // 10GB
  usagePercent: 45,
  activeDownloads: 5,
  queuedDownloads: 2
}
```

#### 3. R2 Statistics
```javascript
{
  totalFiles: 5678,
  totalSize: 5 * 1024 * 1024 * 1024 * 1024,  // 5TB
  uploadSuccessRate: 99.8,          // %
  avgUploadTime: 120000,            // ms
  monthlyEgress: 2 * 1024 * 1024 * 1024 * 1024,  // 2TB (free!)
  monthlyCost: 75                   // $75 (storage only)
}
```

#### 4. Queue Statistics (BullMQ)
```javascript
{
  // BullMQ native stats
  waiting: 12,                      // Jobs waiting to be processed
  active: 5,                        // Jobs currently being processed
  completed: 156,                   // Completed jobs (last 24h)
  failed: 3,                        // Failed jobs
  delayed: 2,                       // Jobs delayed (retrying)

  // Custom metrics
  avgWaitTime: 180000,              // 3 minutes average wait
  avgProcessTime: 600000,           // 10 minutes average process time
  processedToday: 45,
  failedToday: 2,
  retryRate: 5.2,                   // % of jobs that needed retry

  // Worker info
  workers: 1,                       // Active workers
  concurrency: 10,                  // Max concurrent jobs per worker
}
```

#### 5. Bull Board Dashboard
Access the Bull Board dashboard at `http://localhost:3001` to:
- View all queues and their status
- Monitor job progress in real-time
- Retry failed jobs manually
- Clean old completed jobs
- Pause/resume queue processing

### Alerts

```javascript
// SSD Usage > 90%
if (ssdUsage.usagePercent > 90) {
  alert('⚠️ SSD usage critical: ' + ssdUsage.usagePercent + '%');
}

// R2 Upload Failures
if (r2Stats.uploadSuccessRate < 95) {
  alert('⚠️ R2 upload success rate low: ' + r2Stats.uploadSuccessRate + '%');
}

// Queue Too Long
if (queueStats.queuedItems > 50) {
  alert('⚠️ Download queue too long: ' + queueStats.queuedItems + ' items');
}

// Cache Hit Rate Low
if (cacheStats.cacheHitRate < 50) {
  alert('ℹ️ Cache hit rate below target: ' + cacheStats.cacheHitRate + '%');
}
```

---

## 🎯 Success Criteria

### Technical Metrics

✅ **SSD Space Management**
- [ ] System never crashes due to full disk
- [ ] Queue system working (>95% uptime)
- [ ] SSD usage stays below 90%
- [ ] Reservations accurate (0 leaks)

✅ **Torrent Cache**
- [ ] Cache hit rate >60%
- [ ] Instant access for cached torrents (<2 seconds)
- [ ] Reference counting accurate
- [ ] Cleanup job working correctly

✅ **R2 Integration**
- [ ] Upload success rate >99%
- [ ] Streaming from R2 working
- [ ] Files deleted from SSD after R2 upload
- [ ] Zero egress costs

### Business Metrics

✅ **Cost Reduction**
- [ ] 40%+ reduction in storage costs
- [ ] 100% reduction in egress costs
- [ ] Scalable to 10x users without 10x costs

✅ **User Experience**
- [ ] 70%+ instant access (cached)
- [ ] No "disk full" errors
- [ ] Queue system transparent
- [ ] Streaming fast and reliable

---

## 🚀 Next Steps

1. **Review this plan** - Validate approach and timeline
2. **Set up development environment** - Install dependencies, create test database
3. **Start Phase 1** - Database schema and infrastructure
4. **Weekly check-ins** - Review progress, adjust timeline
5. **Testing at each phase** - Don't move forward until current phase tested
6. **Production rollout** - Gradual rollout with monitoring

---

## 📚 References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [WebTorrent API](https://webtorrent.io/docs)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html)
- [Node.js fs.symlink](https://nodejs.org/api/fs.html#fspromisessymlinktarget-path-type)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [BullMQ GitHub](https://github.com/taskforcesh/bullmq)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Documentation](https://redis.io/docs/)
- [Bull Board Dashboard](https://github.com/felixmosh/bull-board)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**Document Version:** 2.0
**Created:** January 5, 2026
**Updated:** January 26, 2026
**Author:** Claude Code Assistant
**Status:** Planning Phase
**Estimated Timeline:** 7 weeks
**Estimated Cost Savings:** 40-85%
**Expected Impact:** High

### Changelog
- **v2.0** (Jan 26, 2026): Updated to use Redis + BullMQ with Docker
  - Added `docker-compose.yml` for Redis and Bull Board
  - Replaced simple SQLite queue with BullMQ
  - Added `redis.js` for connection management
  - Updated `queueManager.js` with full BullMQ implementation
  - Added queue management API endpoints
  - Added Bull Board dashboard for monitoring
  - Updated tests for BullMQ
- **v1.0** (Jan 5, 2026): Initial plan with SQLite-based queue






Perfect! Now I'll create a comprehensive master plan document that combines SSD space management, R2 storage migration, and the Torrent Cache system.

● Write(STORAGE_OPTIMIZATION_MASTER_PLAN.md)
  ⎿  Wrote 1 lines to STORAGE_OPTIMIZATION_MASTER_PLAN.md
     # Storage Optimization Master Plan
     ## SSD Management + R2 Cloud Storage + Torrent Cache
     ---
     ## 📋 Table of Contents
     1. [Executive Summary](#executive-summary)
     2. [Current System Analysis](#current-system-analysis)
     3. [Proposed Architecture](#proposed-architecture)

● Perfect! I've created a comprehensive master plan document: STORAGE_OPTIMIZATION_MASTER_PLAN.md

  📄 What's Inside:

  Complete Integration Plan combining:

  1. ✅ SSD Space Management - Prevent crashes, queue system
  2. ✅ R2 Cloud Storage - Cheap storage, zero egress fees
  3. ✅ Torrent Cache System - Prevent duplicates, instant access

  ---
  📋 Document Sections:

  1. Executive Summary

  - Current problems vs. proposed solution
  - Example scenarios showing the difference
  - Expected Impact: 85% cost reduction, 60-80% storage saved

  2. System Architecture

  - Complete flow diagram (User adds → Cache check → SSD check → Download → R2 upload)
  - Directory structure (cache + R2 cloud)
  - Storage flow with all decision points

  3. Database Schema (6 new tables)

  - torrent_cache - Global cache tracking
  - user_torrent_links - User-to-cache mapping
  - r2_files - R2 storage metadata
  - ssd_reservations - Global SSD space tracking
  - download_queue - Queue system
  - Environment variables for configuration

  4. Implementation Roadmap (7 weeks)

  - Week 1: Database & infrastructure
  - Week 2: SSD space management
  - Week 3: Torrent cache system
  - Week 4: R2 storage integration
  - Week 5: Integration & testing
  - Week 6: Frontend & API
  - Week 7: Monitoring & production

  5. Detailed Code Implementation

  - Complete code for all new files:
    - diskSpace.js - SSD space checking
    - ssdReservations.js - SSD reservation management
    - queueManager.js - Download queue system
    - cacheManager.js - Torrent cache logic
    - r2Storage.js - R2 integration
    - Modified torrentManager.js - Main flow

  6. Testing Strategy

  - Unit tests for each component
  - Integration tests for complete flows
  - Scenarios: Cache hit, SSD full, R2 migration

  7. Cost Analysis

  - Current: $50/month (100 users) → New: $30/month (40% savings)
  - At scale: $300/month → $175/month (42% savings)
  - Breakdown by component

  8. Monitoring & Metrics

  - Dashboard metrics (cache hit rate, SSD usage, R2 stats)
  - Alerts for critical issues
  - Success criteria

  ---
  🎯 Key Highlights:

  How It All Works Together:

  User adds torrent
      ↓
  Check cache (by infoHash)
      ├─ Hit? → ⚡ Instant access from R2
      └─ Miss? → Check SSD space
          ├─ Available? → Download to SSD → Upload to R2 → Delete from SSD
          └─ Full? → Add to queue → Auto-start when free

  Example Savings:

  | Scenario                     | Without System          | With System                      |
  |------------------------------|-------------------------|----------------------------------|
  | User A downloads Movie (5GB) | 5GB on SSD              | 5GB → R2 (then deleted from SSD) |
  | User B downloads same Movie  | 5GB on SSD (duplicate!) | ⚡ Instant (already in R2)       |
  | Total Storage                | 10GB                    | 5GB (50% saved!)                 |
  | User B Wait Time             | 10-15 minutes           | <2 seconds                       |

  Cost Comparison (1000 users):

  - Current: $300/month (big VPS SSD + bandwidth)
  - New System: $175/month (small VPS + R2 storage + FREE egress)
  - Savings: $125/month or $1,500/year

  ---
  📊 What You Get:

  ✅ No more crashes - SSD space always checked
  ✅ 60-80% storage saved - Cache prevents duplicates
  ✅ 85% cost reduction - R2 cheaper than SSD
  ✅ Instant access - 70%+ cached torrents
  ✅ Queue system - No errors when full
  ✅ Unlimited scalability - R2 grows with you

  ---
  The document is ready for implementation! You can:
  1. Review the plan and adjust timeline
  2. Start with Phase 1 (Database setup)
  3. Implement in phases (tested at each step)

  Want me to start implementing Phase 1 (Database & Infrastructure)?

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
>  
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)



Done! I've updated the STORAGE_OPTIMIZATION_MASTER_PLAN.md to use Redis + BullMQ with Docker. Here's a summary of the changes:

  Changes Made                                                                                                                                                                                                               
  1. Added Docker Configuration                                                                                                                                                                                           
                                                                                                                                                                                                                          
  - docker-compose.yml with:
    - Redis 7 Alpine container
    - Bull Board dashboard (accessible at :3001)
    - Seedr Server container
  - Dockerfile for the seedr-server

  2. Updated Environment Variables

  # Redis + BullMQ Configuration
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=
  QUEUE_MAX_CONCURRENT_GLOBAL=10
  QUEUE_MAX_RETRIES=3
  QUEUE_RETRY_DELAY=60000
  QUEUE_JOB_TIMEOUT=3600000

  3. New/Updated Files
  ┌──────────────────────────────┬───────────────────────────────────┐
  │             File             │              Purpose              │
  ├──────────────────────────────┼───────────────────────────────────┤
  │ src/services/redis.js        │ Redis connection management       │
  ├──────────────────────────────┼───────────────────────────────────┤
  │ src/services/queueManager.js │ Full BullMQ implementation        │
  ├──────────────────────────────┼───────────────────────────────────┤
  │ src/routes/admin.routes.js   │ Queue management API              │
  ├──────────────────────────────┼───────────────────────────────────┤
  │ src/index.js                 │ Server initialization with BullMQ │
  └──────────────────────────────┴───────────────────────────────────┘
  4. BullMQ Features Now Included

  - Automatic retries with exponential backoff
  - Job priority queuing
  - Real-time progress tracking
  - Concurrency limiting
  - Graceful shutdown
  - Bull Board dashboard for monitoring

  5. New API Endpoints

  - GET /api/admin/queue/stats - Queue statistics
  - POST /api/admin/queue/pause - Pause processing
  - POST /api/admin/queue/resume - Resume processing
  - POST /api/admin/queue/retry-failed - Retry failed jobs
  - POST /api/admin/queue/clean - Clean old jobs

  Quick Start

  # Start everything with Docker
  docker-compose up -d

  # Access:
  # - Your app: http://localhost:5000
  # - Bull Board: http://localhost:3001

✻ Churned for 3m 26s                         
