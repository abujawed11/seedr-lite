// src/services/queueManager.js
// BullMQ-based Download Queue Manager

const { Queue, Worker, QueueEvents } = require('bullmq');
const { createRedisConnection, isRedisAvailable } = require('./redis');
const { nanoid } = require('nanoid');

class QueueManager {
  constructor() {
    // Configuration from environment
    this.maxConcurrent = parseInt(process.env.QUEUE_MAX_CONCURRENT_GLOBAL) || 10;
    this.maxRetries = parseInt(process.env.QUEUE_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.QUEUE_RETRY_DELAY) || 60000; // 1 minute
    this.jobTimeout = parseInt(process.env.QUEUE_JOB_TIMEOUT) || 3600000; // 1 hour
    this.enabled = process.env.QUEUE_ENABLED !== 'false';

    this.queue = null;
    this.worker = null;
    this.queueEvents = null;
    this.isInitialized = false;
    this.connection = null;
  }

  /**
   * Initialize the queue system
   */
  async initialize() {
    if (this.isInitialized) return true;

    if (!this.enabled) {
      console.log('⏸️  Queue system is disabled');
      return false;
    }

    try {
      // Check if Redis is available
      const redisAvailable = await isRedisAvailable();
      if (!redisAvailable) {
        console.warn('⚠️  Redis not available, queue system disabled');
        this.enabled = false;
        return false;
      }

      this.connection = createRedisConnection();

      // Create the download queue
      this.queue = new Queue('downloads', {
        connection: this.connection,
        defaultJobOptions: {
          attempts: this.maxRetries,
          backoff: {
            type: 'exponential',
            delay: this.retryDelay,
          },
          removeOnComplete: {
            age: 24 * 3600,     // Keep completed jobs for 24 hours
            count: 1000,        // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      });

      // Create queue events listener
      this.queueEvents = new QueueEvents('downloads', {
        connection: createRedisConnection()
      });

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ BullMQ Queue Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Queue Manager:', error.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Set up queue event listeners
   */
  setupEventListeners() {
    this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      console.log(`✅ Job ${jobId} completed`);
      await this.updateJobStatusInDB(jobId, 'completed');
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed: ${failedReason}`);
      await this.updateJobStatusInDB(jobId, 'failed', failedReason);
    });

    this.queueEvents.on('progress', async ({ jobId, data }) => {
      console.log(`📊 Job ${jobId} progress: ${data}%`);
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`⏳ Job ${jobId} is waiting`);
    });

    this.queueEvents.on('active', async ({ jobId }) => {
      console.log(`▶️  Job ${jobId} is now active`);
      await this.updateJobStatusInDB(jobId, 'downloading');
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      console.warn(`⚠️  Job ${jobId} has stalled`);
    });
  }

  /**
   * Update job status in the database
   */
  async updateJobStatusInDB(jobId, status, errorMessage = null) {
    try {
      const database = require('../models/database');

      const now = new Date().toISOString();
      let sql, params;

      if (status === 'downloading') {
        sql = `UPDATE download_queue SET status = ?, started_at = ? WHERE id = ? OR bullmq_job_id = ?`;
        params = [status, now, jobId, jobId];
      } else if (errorMessage) {
        sql = `UPDATE download_queue SET status = ?, error_message = ?, completed_at = ? WHERE id = ? OR bullmq_job_id = ?`;
        params = [status, errorMessage, now, jobId, jobId];
      } else {
        sql = `UPDATE download_queue SET status = ?, completed_at = ? WHERE id = ? OR bullmq_job_id = ?`;
        params = [status, now, jobId, jobId];
      }

      await new Promise((resolve, reject) => {
        database.db.run(sql, params, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.error('Error updating job status in DB:', error);
    }
  }

  /**
   * Add a download job to the queue
   */
  async addToQueue(userId, magnetLink, infoHash, estimatedSize = 0, priority = 0, folderName = null) {
    if (!this.enabled || !this.isInitialized) {
      return {
        success: false,
        error: 'Queue system is not available'
      };
    }

    const jobId = nanoid();

    try {
      // Add to BullMQ queue
      const job = await this.queue.add(
        'download-torrent',
        {
          jobId,
          userId,
          magnetLink,
          infoHash,
          estimatedSize,
          folderName,
        },
        {
          jobId,                        // Use our own ID
          priority: 10 - priority,      // BullMQ: lower number = higher priority
          delay: 0,
        }
      );

      // Store in database for tracking
      const database = require('../models/database');
      await new Promise((resolve, reject) => {
        database.db.run(
          `INSERT INTO download_queue
           (id, user_id, magnet_link, info_hash, estimated_size, priority, status, bullmq_job_id)
           VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)`,
          [jobId, userId, magnetLink, infoHash, estimatedSize, priority, job.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`📥 Added to queue: ${infoHash} (Job: ${jobId})`);

      const position = await this.getQueuePosition(jobId);

      return {
        success: true,
        id: jobId,
        bullmqJobId: job.id,
        status: 'queued',
        position,
      };
    } catch (error) {
      console.error('Error adding to queue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get queue position for a job
   */
  async getQueuePosition(jobId) {
    if (!this.queue) return -1;

    try {
      const job = await this.queue.getJob(jobId);
      if (!job) return -1;

      const state = await job.getState();
      if (state === 'active') return 0;
      if (state !== 'waiting' && state !== 'delayed') return -1;

      const waiting = await this.queue.getWaiting();
      const index = waiting.findIndex(j => j.id === jobId);
      return index + 1;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Start the worker that processes download jobs
   */
  async startWorker(processJobCallback) {
    if (!this.enabled || !this.isInitialized) {
      console.log('⏸️  Worker not started - queue system disabled');
      return false;
    }

    try {
      this.worker = new Worker(
        'downloads',
        async (job) => {
          const { jobId, userId, magnetLink, infoHash, estimatedSize, folderName } = job.data;

          console.log(`🔄 Processing job ${jobId}: ${infoHash}`);

          // Call the provided callback to process the download
          if (processJobCallback) {
            return await processJobCallback(job);
          }

          // Default: just return success (actual processing done elsewhere)
          return { success: true, jobId, infoHash };
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
        console.log(`✅ Worker completed job ${job.id}`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`❌ Worker failed job ${job?.id}:`, err.message);
      });

      this.worker.on('error', (err) => {
        console.error('❌ Worker error:', err);
      });

      console.log(`🔄 BullMQ Worker started (concurrency: ${this.maxConcurrent})`);
      return true;
    } catch (error) {
      console.error('Failed to start worker:', error);
      return false;
    }
  }

  /**
   * Get user's queue items
   */
  async getUserQueue(userId) {
    const database = require('../models/database');

    return new Promise((resolve, reject) => {
      database.db.all(
        `SELECT * FROM download_queue
         WHERE user_id = ? AND status IN ('queued', 'downloading')
         ORDER BY priority DESC, requested_at ASC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Cancel a queued job
   */
  async cancelQueueItem(userId, queueId) {
    if (!this.queue) {
      return { success: false, error: 'Queue not available' };
    }

    try {
      const database = require('../models/database');

      // Get job from database
      const queueItem = await new Promise((resolve, reject) => {
        database.db.get(
          `SELECT bullmq_job_id FROM download_queue
           WHERE id = ? AND user_id = ? AND status = 'queued'`,
          [queueId, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!queueItem) {
        return { success: false, error: 'Job not found or not cancellable' };
      }

      // Remove from BullMQ
      if (queueItem.bullmq_job_id) {
        const job = await this.queue.getJob(queueItem.bullmq_job_id);
        if (job) {
          await job.remove();
        }
      }

      // Update database
      await new Promise((resolve, reject) => {
        database.db.run(
          `UPDATE download_queue SET status = 'cancelled' WHERE id = ?`,
          [queueId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`🚫 Cancelled queue item: ${queueId}`);
      return { success: true };
    } catch (error) {
      console.error('Error cancelling queue item:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.queue) {
      return {
        available: false,
        error: 'Queue not initialized'
      };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        available: true,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    if (!this.queue) return false;
    await this.queue.pause();
    console.log('⏸️  Queue paused');
    return true;
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    if (!this.queue) return false;
    await this.queue.resume();
    console.log('▶️  Queue resumed');
    return true;
  }

  /**
   * Check if queue is paused
   */
  async isPaused() {
    if (!this.queue) return false;
    return await this.queue.isPaused();
  }

  /**
   * Retry all failed jobs
   */
  async retryFailedJobs() {
    if (!this.queue) return 0;

    try {
      const failed = await this.queue.getFailed();
      for (const job of failed) {
        await job.retry();
      }
      console.log(`🔄 Retried ${failed.length} failed jobs`);
      return failed.length;
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      return 0;
    }
  }

  /**
   * Clean old completed jobs
   */
  async cleanOldJobs(gracePeriodMs = 24 * 60 * 60 * 1000) {
    if (!this.queue) return 0;

    try {
      const cleaned = await this.queue.clean(gracePeriodMs, 1000, 'completed');
      console.log(`🧹 Cleaned ${cleaned.length} old completed jobs`);
      return cleaned.length;
    } catch (error) {
      console.error('Error cleaning old jobs:', error);
      return 0;
    }
  }

  /**
   * Get all jobs with their current state
   */
  async getAllJobs(limit = 100) {
    if (!this.queue) return [];

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaiting(0, limit),
        this.queue.getActive(0, limit),
        this.queue.getCompleted(0, limit),
        this.queue.getFailed(0, limit),
      ]);

      return {
        waiting: waiting.map(j => ({ id: j.id, data: j.data, state: 'waiting' })),
        active: active.map(j => ({ id: j.id, data: j.data, state: 'active' })),
        completed: completed.map(j => ({ id: j.id, data: j.data, state: 'completed' })),
        failed: failed.map(j => ({ id: j.id, data: j.data, state: 'failed', failedReason: j.failedReason })),
      };
    } catch (error) {
      console.error('Error getting all jobs:', error);
      return { waiting: [], active: [], completed: [], failed: [] };
    }
  }

  /**
   * Shutdown the queue manager gracefully
   */
  async shutdown() {
    console.log('🛑 Shutting down Queue Manager...');

    try {
      if (this.worker) {
        await this.worker.close();
      }
      if (this.queueEvents) {
        await this.queueEvents.close();
      }
      if (this.queue) {
        await this.queue.close();
      }
      if (this.connection) {
        await this.connection.quit();
      }

      this.isInitialized = false;
      console.log('✅ Queue Manager shut down');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Check if the queue system is available
   */
  isAvailable() {
    return this.enabled && this.isInitialized;
  }
}

// Export singleton instance
const queueManager = new QueueManager();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await queueManager.shutdown();
});

process.on('SIGINT', async () => {
  await queueManager.shutdown();
});

module.exports = queueManager;
