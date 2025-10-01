/**
 * Storage plan configuration
 * Define your storage tiers and pricing here
 */

const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    storage: 5 * 1024 * 1024 * 1024, // 5 GB
    price: 0,
    features: [
      '5 GB storage',
      'Basic torrent support',
      'Standard download speed'
    ],
    maxConcurrentDownloads: 2,
    color: 'gray'
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    storage: 25 * 1024 * 1024 * 1024, // 25 GB
    price: 4.99,
    features: [
      '25 GB storage',
      'Priority support',
      'Faster download speed',
      'Up to 5 concurrent downloads'
    ],
    maxConcurrentDownloads: 5,
    color: 'blue'
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    storage: 100 * 1024 * 1024 * 1024, // 100 GB
    price: 9.99,
    features: [
      '100 GB storage',
      'Priority support',
      'Maximum download speed',
      'Up to 10 concurrent downloads',
      'Advanced features'
    ],
    maxConcurrentDownloads: 10,
    color: 'purple'
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    storage: 500 * 1024 * 1024 * 1024, // 500 GB
    price: 19.99,
    features: [
      '500 GB storage',
      '24/7 Priority support',
      'Maximum download speed',
      'Unlimited concurrent downloads',
      'All advanced features',
      'Custom integrations'
    ],
    maxConcurrentDownloads: -1, // unlimited
    color: 'gold'
  }
};

// Helper function to get plan by ID
function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

// Helper function to get all plans as array
function getAllPlans() {
  return Object.values(PLANS);
}

// Helper function to validate plan upgrade
function canUpgradeTo(currentPlan, targetPlan) {
  const plans = getAllPlans();
  const currentIndex = plans.findIndex(p => p.id === currentPlan);
  const targetIndex = plans.findIndex(p => p.id === targetPlan);

  return targetIndex > currentIndex;
}

// Helper function to format storage size
function formatStorage(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb} GB`;
}

module.exports = {
  PLANS,
  getPlan,
  getAllPlans,
  canUpgradeTo,
  formatStorage
};
