require('dotenv').config();
const { ensureDirs } = require('./utils/ensureDirs');
const { logger } = require('./utils/logger');
const database = require('./models/database');

async function initServer() {
  try {
    // Initialize database
    await database.init();
    logger.info('Database initialized');

    // Ensure storage directories
    ensureDirs();

    // Initialize torrent manager (triggers startup cleanup)
    require('./services/torrentManager');

    // Start server
    require('./server');

    logger.info('Seedr server booting…');
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

initServer();
