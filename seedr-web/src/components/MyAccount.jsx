import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserSubscription } from '../api';

export default function MyAccount({ isOpen, onClose }) {
  const { user, getStorageInfo } = useAuth();
  const [accountDetails, setAccountDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchAccountDetails();
    }
  }, [isOpen, user]);

  const fetchAccountDetails = async () => {
    setLoading(true);
    try {
      // Fetch real subscription data from backend
      const subscriptionData = await getUserSubscription();
      const storageInfo = getStorageInfo();

      setAccountDetails({
        user: subscriptionData.user,
        storage: storageInfo,
        subscription: subscriptionData.activeSubscription,
        subscriptionHistory: subscriptionData.subscriptionHistory || [],
        historyLog: subscriptionData.historyLog || []
      });
    } catch (error) {
      console.error('Failed to fetch account details:', error);
      // Fallback to basic user data
      const storageInfo = getStorageInfo();
      setAccountDetails({
        user,
        storage: storageInfo,
        subscription: null,
        subscriptionHistory: [],
        historyLog: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanDisplayName = (plan) => {
    const planNames = {
      free: 'Free',
      basic: 'Basic',
      pro: 'Pro',
      premium: 'Premium'
    };
    return planNames[plan] || plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'text-green-400 bg-green-400/10',
      pending: 'text-yellow-400 bg-yellow-400/10',
      cancelled: 'text-red-400 bg-red-400/10',
      expired: 'text-gray-400 bg-gray-400/10'
    };
    return colors[status] || colors.active;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[95vh] border border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">My Account</h2>
            <p className="text-gray-400 mt-1">Account and subscription details</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading account details...</p>
            </div>
          ) : accountDetails ? (
            <div className="p-6 space-y-6">
            {/* Profile Information */}
            <div className="bg-gray-700/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                  <p className="text-white font-medium">{accountDetails.user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <p className="text-white font-medium">{accountDetails.user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Account Type</label>
                  <div className="flex items-center">
                    <p className="text-white font-medium">{accountDetails.user.role}</p>
                    {accountDetails.user.role === 'admin' && (
                      <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Member Since</label>
                  <p className="text-white font-medium">{formatDate(accountDetails.user.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="bg-gray-700/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Subscription Details
              </h3>
              {accountDetails.subscription ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Current Plan</label>
                      <p className="text-white font-medium text-lg">{getPlanDisplayName(accountDetails.subscription.plan)} Plan</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Billing Cycle</label>
                      <p className="text-white font-medium capitalize">
                        {accountDetails.subscription.duration}
                        {accountDetails.subscription.duration === 'yearly' && (
                          <span className="text-green-400 text-sm ml-2">(20% off)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(accountDetails.subscription.status)}`}>
                        {accountDetails.subscription.status.charAt(0).toUpperCase() + accountDetails.subscription.status.slice(1)}
                        {accountDetails.subscription.isExpired && ' (Expired)'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Started On</label>
                      <p className="text-white font-medium">{formatDate(accountDetails.subscription.started_at)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Expires On</label>
                      <p className={`font-medium ${accountDetails.subscription.isExpired ? 'text-red-400' : 'text-white'}`}>
                        {formatDate(accountDetails.subscription.expires_at)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Days Remaining</label>
                      <p className={`font-medium ${
                        accountDetails.subscription.daysUntilExpiry <= 0 ? 'text-red-400' :
                        accountDetails.subscription.daysUntilExpiry <= 7 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {accountDetails.subscription.daysUntilExpiry <= 0 ?
                          'Expired' :
                          `${accountDetails.subscription.daysUntilExpiry} days`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Subscription progress bar */}
                  {accountDetails.subscription.started_at && accountDetails.subscription.expires_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Subscription Progress</label>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        {(() => {
                          const startDate = new Date(accountDetails.subscription.started_at);
                          const endDate = new Date(accountDetails.subscription.expires_at);
                          const now = new Date();
                          const total = endDate.getTime() - startDate.getTime();
                          const elapsed = now.getTime() - startDate.getTime();
                          const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);

                          return (
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                progress >= 100 ? 'bg-red-500' :
                                progress >= 80 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">No active subscription</p>
                  <p className="text-sm text-gray-500 mt-1">You are currently on the Free plan</p>
                </div>
              )}
            </div>

            {/* Storage Information */}
            {accountDetails.storage && (
              <div className="bg-gray-700/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Storage Usage
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{accountDetails.storage.quota}</div>
                    <div className="text-sm text-gray-400">Total Quota</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{accountDetails.storage.used}</div>
                    <div className="text-sm text-gray-400">Used Space</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{accountDetails.storage.available}</div>
                    <div className="text-sm text-gray-400">Available Space</div>
                  </div>
                </div>

                {/* Storage Progress Bar */}
                {accountDetails.storage.details && (
                  <div>
                    <div className="w-full h-3 bg-gray-600 rounded-full overflow-hidden">
                      {(() => {
                        const { usedBytes, reservedBytes, quotaBytes } = accountDetails.storage.details;
                        const totalUsed = usedBytes || 0;
                        const totalReserved = reservedBytes || 0;
                        const usedPercent = quotaBytes > 0 ? (totalUsed / quotaBytes) * 100 : 0;
                        const reservedPercent = quotaBytes > 0 ? (totalReserved / quotaBytes) * 100 : 0;

                        return (
                          <div className="flex h-full w-full">
                            {usedPercent > 0 && (
                              <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                                style={{ width: `${Math.min(usedPercent, 100)}%` }}
                              />
                            )}
                            {reservedPercent > 0 && (
                              <div
                                className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
                                style={{ width: `${Math.min(reservedPercent, 100 - usedPercent)}%` }}
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-center space-x-6 mt-3 text-sm text-gray-400">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mr-2"></div>
                        <span>Used</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full mr-2"></div>
                        <span>Reserved</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-600 rounded-full mr-2"></div>
                        <span>Free</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subscription History */}
            {accountDetails.historyLog && accountDetails.historyLog.length > 0 && (
              <div className="bg-gray-700/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Subscription History
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                  {accountDetails.historyLog.slice(0, 10).map((entry, index) => (
                    <div key={entry.id || index} className="flex items-center justify-between p-3 bg-gray-600/30 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          entry.action === 'created' ? 'bg-green-500' :
                          entry.action === 'renewed' ? 'bg-blue-500' :
                          entry.action === 'expired' ? 'bg-red-500' :
                          entry.action === 'cancelled' ? 'bg-gray-500' :
                          'bg-yellow-500'
                        }`}></div>
                        <div>
                          <p className="text-sm text-white font-medium">
                            {entry.action === 'created' ? 'Subscription Activated' :
                             entry.action === 'renewed' ? 'Subscription Renewed' :
                             entry.action === 'expired' ? 'Subscription Expired' :
                             entry.action === 'cancelled' ? 'Subscription Cancelled' :
                             entry.action === 'downgraded' ? 'Downgraded to Free' :
                             entry.action}
                          </p>
                          <p className="text-xs text-gray-400">
                            {entry.plan_from && entry.plan_to ?
                              `${entry.plan_from} → ${entry.plan_to}` :
                              entry.plan_to || entry.plan_from || ''
                            }
                            {entry.duration && ` (${entry.duration})`}
                          </p>
                          {entry.reason && (
                            <p className="text-xs text-gray-500">{entry.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(entry.performed_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-400">Unable to load account details.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6 bg-gray-800/30">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}