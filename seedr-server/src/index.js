require('dotenv').config();
const { ensureDirs } = require('./utils/ensureDirs');
const { logger } = require('./utils/logger');
const database = require('./models/database');
const emailService = require('./services/emailService');

async function initServer() {
  try {
    // Initialize database
    await database.init();
    logger.info('Database initialized');

    // Initialize email service
    emailService.init();

    // Verify email service connection
    const emailVerification = await emailService.verifyConnection();
    if (emailVerification.success) {
      logger.info('Email service ready');
    } else {
      logger.warn('Email service verification failed:', emailVerification.error);
    }

    // Add downloaded_bytes column if it doesn't exist (migration)
    try {
      await database.reservations._run(`ALTER TABLE storage_reservations ADD COLUMN downloaded_bytes INTEGER DEFAULT 0`);
      logger.info('Added downloaded_bytes column to storage_reservations table');
    } catch (error) {
      // Column already exists, ignore the error
      if (!error.message.includes('duplicate column')) {
        logger.error('Error adding downloaded_bytes column:', error);
      }
    }

    // Ensure storage directories (including cache directory)
    ensureDirs();

    // ==================== Storage Optimization Services ====================

    // Initialize Cache Manager
    const cacheManager = require('./services/cacheManager');
    await cacheManager.initialize();
    logger.info('Cache Manager initialized');

    // Initialize R2 Storage (if enabled)
    const r2Storage = require('./services/r2Storage');
    if (process.env.R2_ENABLED === 'true') {
      const r2Initialized = r2Storage.initialize();
      if (r2Initialized) {
        logger.info('R2 Storage initialized');
      } else {
        logger.warn('R2 Storage initialization failed - running in local mode');
      }
    } else {
      logger.info('R2 Storage disabled - running in local mode');
    }

    // Start cache cleanup job
    cacheManager.startCleanupJob();
    logger.info('Cache cleanup job started');

    // Initialize torrent manager (triggers startup cleanup)
    const torrentManager = require('./services/torrentManager');

    // ==================== End Storage Optimization Services ====================

    // Initialize Queue Manager (BullMQ)
    const queueManager = require('./services/queueManager');
    if (process.env.QUEUE_ENABLED !== 'false') {
      const queueInitialized = await queueManager.initialize();
      if (queueInitialized) {
        logger.info('Queue Manager initialized');
        // Start the worker to process downloads
        await queueManager.startWorker(async (job) => {
          const { userId, magnetLink, infoHash } = job.data;
          logger.info(`📥 Queue Worker: Starting download for ${infoHash}`);
          try {
            await torrentManager.addMagnet(magnetLink, userId);
            return { success: true, infoHash };
          } catch (error) {
            logger.error(`❌ Queue Worker: Failed to start download for ${infoHash}:`, error.message);
            throw error; // Let BullMQ handle retry
          }
        });
        logger.info('Queue Worker started');
      } else {
        logger.warn('Queue Manager initialization failed - downloads will be immediate');
      }
    } else {
      logger.info('Queue Manager disabled');
    }

    // Start subscription monitor

    // Start subscription monitor
    const subscriptionMonitor = require('./utils/subscriptionMonitor');
    subscriptionMonitor.start();

    // Start server
    require('./server');

    logger.info('MyPeerCloud server booting…');
    logger.info('==========================================');
    logger.info('Storage Optimization Status:');
    logger.info(`  - Cache Manager: ✅ Ready`);
    logger.info(`  - R2 Storage: ${r2Storage.isAvailable() ? '✅ Ready' : '⚠️  Disabled'}`);
    logger.info(`  - Queue (BullMQ): ${queueManager.isAvailable() ? '✅ Ready' : '⚠️  Disabled'}`);
    logger.info('==========================================');

  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  const queueManager = require('./services/queueManager');
  await queueManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  const queueManager = require('./services/queueManager');
  await queueManager.shutdown();
  process.exit(0);
});

initServer();
