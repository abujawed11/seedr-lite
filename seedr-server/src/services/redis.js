// src/services/redis.js
// Redis connection management for BullMQ

const Redis = require('ioredis');

/**
 * Create a new Redis connection for BullMQ
 * BullMQ requires specific settings for reliable operation
 */
const createRedisConnection = () => {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,    // Required for BullMQ
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis connection retry #${times}, waiting ${delay}ms...`);
      return delay;
    },
  };

  // Remove password if empty
  if (!config.password) {
    delete config.password;
  }

  return new Redis(config);
};

// Singleton connection for general use
let redisClient = null;

/**
 * Get or create the singleton Redis client
 */
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisConnection();

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }
  return redisClient;
};

/**
 * Check if Redis is available and connected
 */
const isRedisAvailable = async () => {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis availability check failed:', error.message);
    return false;
  }
};

/**
 * Close the Redis connection gracefully
 */
const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis connection closed gracefully');
  }
};

/**
 * Get Redis connection info for monitoring
 */
const getRedisInfo = async () => {
  try {
    const client = getRedisClient();
    const info = await client.info();

    // Parse some useful metrics
    const lines = info.split('\r\n');
    const metrics = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (['connected_clients', 'used_memory_human', 'used_memory_peak_human', 'uptime_in_seconds'].includes(key)) {
          metrics[key] = value;
        }
      }
    }

    return {
      connected: true,
      ...metrics
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
};

module.exports = {
  createRedisConnection,
  getRedisClient,
  isRedisAvailable,
  closeRedisConnection,
  getRedisInfo
};
