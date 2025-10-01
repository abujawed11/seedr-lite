// Subscription expiry monitoring service
const database = require('../models/database');

class SubscriptionMonitor {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    // Check every hour (3600000 ms)
    this.checkInterval = 60 * 60 * 1000;
  }

  /**
   * Start the subscription monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Subscription monitor is already running');
      return;
    }

    console.log('🕒 Starting subscription expiry monitor...');
    console.log(`   Checking every ${this.checkInterval / 1000 / 60} minutes`);

    // Run initial check
    this.checkExpiredSubscriptions();

    // Set up recurring checks
    this.intervalId = setInterval(() => {
      this.checkExpiredSubscriptions();
    }, this.checkInterval);

    this.isRunning = true;
    console.log('✅ Subscription monitor started');
  }

  /**
   * Stop the subscription monitoring service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Subscription monitor stopped');
  }

  /**
   * Check for expired subscriptions and downgrade users
   */
  async checkExpiredSubscriptions() {
    try {
      console.log('🔍 Checking for expired subscriptions...');

      const results = await database.downgradeExpiredUsers();

      if (results.length === 0) {
        console.log('✅ No expired subscriptions found');
        return;
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`📊 Subscription expiry check completed:`);
      console.log(`   📉 ${successful.length} users downgraded successfully`);

      if (failed.length > 0) {
        console.log(`   ❌ ${failed.length} users failed to downgrade`);
        failed.forEach(result => {
          console.log(`      - ${result.username}: ${result.error}`);
        });
      }

      // Log successful downgrades
      successful.forEach(result => {
        console.log(`   🔻 ${result.username} downgraded from ${result.plan} to free`);
      });

    } catch (error) {
      console.error('❌ Error during subscription expiry check:', error);
    }
  }

  /**
   * Manual trigger for checking expired subscriptions
   */
  async triggerCheck() {
    console.log('🔧 Manual subscription expiry check triggered...');
    return await this.checkExpiredSubscriptions();
  }

  /**
   * Get monitor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      checkIntervalMinutes: this.checkInterval / 1000 / 60,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null
    };
  }

  /**
   * Update check interval (requires restart to take effect)
   */
  setCheckInterval(intervalMs) {
    this.checkInterval = intervalMs;
    console.log(`🕒 Subscription check interval updated to ${intervalMs / 1000 / 60} minutes`);

    if (this.isRunning) {
      console.log('   ⚠️  Restart monitor for changes to take effect');
    }
  }
}

// Singleton instance
const subscriptionMonitor = new SubscriptionMonitor();

module.exports = subscriptionMonitor;