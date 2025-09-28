const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middlewares/errorHandler');
const { startGlobalQuotaMonitoring } = require('./utils/quotaMonitor');

const torrentsRoutes = require('./routes/torrents.routes');
const streamRoutes = require('./routes/stream.routes');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ ok: true }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/torrents', torrentsRoutes);
app.use('/', streamRoutes); // /stream /download /direct
app.use("/api/files", require("./routes/files.routes"));
app.use("/files", require("./routes/files.routes"));

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, async () => {
  console.log(`API on http://localhost:${PORT}`);

  // Initialize global quota monitoring
  try {
    // We need to get the WebTorrent client instance
    const { getClient } = require('./services/torrentManager');

    // Wait a moment for server to fully initialize
    setTimeout(async () => {
      try {
        const client = await getClient();
        await startGlobalQuotaMonitoring(client);
        console.log('🌍 Global quota monitoring initialized');

        // Reconcile storage reservations with active torrents
        try {
          console.log('🔄 Starting storage reservation reconciliation...');
          const database = require('./models/database');

          // Get all active torrents from WebTorrent client
          const activeTorrents = client.torrents.map(torrent => ({
            infoHash: torrent.infoHash,
            userId: torrent.userId || null, // torrent.userId is set when torrent is added
            sizeBytes: torrent.length || 0
          })).filter(t => t.userId); // Only process torrents with valid userId

          console.log(`📊 Found ${activeTorrents.length} active torrents for reconciliation`);

          // Reconcile reservations (cleanup stale + create missing)
          const reconcileStats = await database.reconcileReservations(activeTorrents);

          console.log(`✅ Reservation reconciliation completed:`);
          console.log(`   - Cleaned up ${reconcileStats.cleanedCount} stale reservations`);
          console.log(`   - Created ${reconcileStats.createdCount} missing reservations`);

        } catch (error) {
          console.error('💥 Error during reservation reconciliation:', error);
        }
      } catch (error) {
        console.error('💥 Error starting global quota monitoring:', error);
      }
    }, 2000);
  } catch (error) {
    console.error('💥 Error initializing quota monitoring:', error);
  }
});
