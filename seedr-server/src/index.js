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

    // Ensure storage directories
    ensureDirs();

    // Initialize torrent manager (triggers startup cleanup)
    require('./services/torrentManager');

    // Start subscription monitor
    const subscriptionMonitor = require('./utils/subscriptionMonitor');
    subscriptionMonitor.start();

    // Start server
    require('./server');

    logger.info('Seedr server booting…');
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

initServer();
