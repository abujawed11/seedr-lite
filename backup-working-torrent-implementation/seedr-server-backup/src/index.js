require('dotenv').config();
const { ensureDirs } = require('./utils/ensureDirs');
const { logger } = require('./utils/logger');

ensureDirs();
require('./server');

logger.info('Seedr server booting…');
