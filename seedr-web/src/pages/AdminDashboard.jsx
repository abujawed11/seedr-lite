import { useState, useEffect } from 'react';
import {
  getAdminStats,
  getAllUsers,
  getAllUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
  updateUserQuota,
  updateUserStatus,
  deleteUser
} from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard({ onBackToMain }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModal, setEditModal] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      alert('Admin access required');
      return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, requestsData] = await Promise.all([
        getAdminStats(),
        getAllUsers(),
        getAllUpgradeRequests()
      ]);
      setStats(statsData.stats);
      setUsers(usersData.users);
      setRequests(requestsData.requests);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      alert('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!confirm('Approve this upgrade request?')) return;

    try {
      await approveUpgradeRequest(requestId, 'Approved by admin');
      alert('Request approved successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert(error.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await rejectUpgradeRequest(requestId, reason);
      alert('Request rejected successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await updateUserStatus(userId, !currentStatus);
      alert(`User ${action}d successfully`);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await deleteUser(userId);
      alert('User deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 B';

    // Handle negative values (over quota)
    const isNegative = bytes < 0;
    const absBytes = Math.abs(bytes);

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(absBytes) / Math.log(k));
    const formatted = parseFloat((absBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

    return isNegative ? `-${formatted}` : formatted;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <div className="ml-4 text-sm text-gray-400">Control Panel</div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                Admin: <span className="text-red-400 font-medium">{user?.username}</span>
              </div>
              {onBackToMain && (
                <button
                  onClick={onBackToMain}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  ← Back to Main
                </button>
              )}
              <button
                onClick={logout}
                className="px-4 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              👥 Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              📝 Upgrade Requests ({requests.filter(r => r.status === 'pending').length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        )}

        {!loading && activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">System Overview</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Total Users</div>
                <div className="text-3xl font-bold text-white">{stats.total_users}</div>
                <div className="text-green-400 text-sm mt-2">
                  {stats.active_users} active
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Storage Allocated</div>
                <div className="text-3xl font-bold text-white">
                  {formatBytes(stats.total_storage_allocated)}
                </div>
                <div className="text-blue-400 text-sm mt-2">
                  Total capacity
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Storage Used</div>
                <div className="text-3xl font-bold text-white">
                  {formatBytes(stats.total_storage_used)}
                </div>
                <div className="text-orange-400 text-sm mt-2">
                  {((stats.total_storage_used / stats.total_storage_allocated) * 100).toFixed(1)}% used
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Pending Requests</div>
                <div className="text-3xl font-bold text-white">
                  {stats.pending_upgrade_requests}
                </div>
                <div className="text-yellow-400 text-sm mt-2">
                  Awaiting approval
                </div>
              </div>
            </div>

            {/* Users by Plan */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Users by Plan</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{stats.users_by_plan.free}</div>
                  <div className="text-sm text-gray-500">Free</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.users_by_plan.basic}</div>
                  <div className="text-sm text-gray-500">Basic</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.users_by_plan.pro}</div>
                  <div className="text-sm text-gray-500">Pro</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{stats.users_by_plan.premium}</div>
                  <div className="text-sm text-gray-500">Premium</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Storage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Max Downloads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{u.username}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            u.plan === 'free' ? 'bg-gray-700 text-gray-300' :
                            u.plan === 'basic' ? 'bg-blue-900/30 text-blue-400' :
                            u.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                            'bg-yellow-900/30 text-yellow-400'
                          }`}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">
                            {formatBytes(u.storage_used)} / {formatBytes(u.storage_quota)}
                          </div>
                          <div className={`text-xs ${u.effective_available < 0 ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                            {u.effective_available < 0 ? (
                              <>⚠️ Quota over-used ({formatBytes(Math.abs(u.effective_available))} over)</>
                            ) : (
                              <>{formatBytes(u.effective_available)} available</>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-white">
                          {u.max_concurrent_downloads}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            u.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setEditModal(true);
                              }}
                              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                              className={`px-3 py-1 text-xs ${
                                u.is_active
                                  ? 'bg-yellow-600 hover:bg-yellow-700'
                                  : 'bg-green-600 hover:bg-green-700'
                              } text-white rounded transition-colors`}
                            >
                              {u.is_active ? 'Disable' : 'Enable'}
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Upgrade Requests</h2>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Requests Grid */}
            <div className="grid grid-cols-1 gap-6">
              {requests.filter(r => r.status === 'pending').length === 0 && (
                <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                  <p className="text-gray-400">No pending upgrade requests</p>
                </div>
              )}

              {requests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{request.username}</h3>
                      <p className="text-sm text-gray-400">{request.user_email}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                      request.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Current Plan</div>
                      <div className="text-sm text-white font-medium">{request.current_plan}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Requested Plan</div>
                      <div className="text-sm text-yellow-400 font-medium">{request.target_plan}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Duration</div>
                      <div className={`text-sm font-medium ${request.duration === 'yearly' ? 'text-green-400' : 'text-blue-400'}`}>
                        {request.duration === 'yearly' ? 'Yearly (20% off)' : 'Monthly'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Full Name</div>
                      <div className="text-sm text-white">{request.full_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Email</div>
                      <div className="text-sm text-white">{request.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Phone</div>
                      <div className="text-sm text-white">{request.phone}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Requested At</div>
                      <div className="text-sm text-white">{formatDate(request.requested_at)}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">Address</div>
                    <div className="text-sm text-white">{request.address}</div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {request.status !== 'pending' && (
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Admin Notes</div>
                      <div className="text-sm text-white">{request.admin_notes || 'No notes'}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        Processed at: {formatDate(request.processed_at)}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Show processed requests */}
              {requests.filter(r => r.status !== 'pending').length > 0 && (
                <>
                  <h3 className="text-xl font-bold text-white mt-8">Processed Requests</h3>
                  {requests.filter(r => r.status !== 'pending').map((request) => (
                    <div key={request.id} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-400">{request.username}</h3>
                          <p className="text-sm text-gray-500">{request.user_email}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                          'bg-red-900/30 text-red-400'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {request.current_plan} → {request.target_plan} ({request.duration || 'monthly'})
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Processed: {formatDate(request.processed_at)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {editModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setEditModal(false);
            setSelectedUser(null);
          }}
          onSave={async () => {
            await fetchDashboardData();
            setEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSave }) {
  const [quota, setQuota] = useState(user.storage_quota);
  const [plan, setPlan] = useState(user.plan);
  const [maxDownloads, setMaxDownloads] = useState(user.max_concurrent_downloads);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plans = [
    { id: 'free', name: 'Free', storage: 5 * 1024 * 1024 * 1024 },
    { id: 'basic', name: 'Basic', storage: 25 * 1024 * 1024 * 1024 },
    { id: 'pro', name: 'Pro', storage: 100 * 1024 * 1024 * 1024 },
    { id: 'premium', name: 'Premium', storage: 500 * 1024 * 1024 * 1024 }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check if this is a downgrade scenario
    const usageInGB = Math.round(user.storage_used / (1024 * 1024 * 1024));
    const newQuotaInGB = Math.round(quota / (1024 * 1024 * 1024));

    if (user.storage_used > quota) {
      const overage = user.storage_used - quota;
      const overageGB = (overage / (1024 * 1024 * 1024)).toFixed(2);

      const confirmDowngrade = confirm(
        `⚠️ WARNING: Downgrade with Overage\n\n` +
        `User's current usage: ${usageInGB} GB\n` +
        `New quota: ${newQuotaInGB} GB\n` +
        `Overage: ${overageGB} GB\n\n` +
        `The user is using MORE than the new quota!\n\n` +
        `If you proceed:\n` +
        `✓ User will be in "over-quota" state\n` +
        `✓ User CANNOT download new files\n` +
        `✓ User must delete ${overageGB} GB to resume downloads\n\n` +
        `Do you want to FORCE this downgrade?`
      );

      if (!confirmDowngrade) {
        setLoading(false);
        return;
      }

      // User confirmed - proceed with force downgrade
      try {
        await updateUserQuota(user.id, quota, plan, maxDownloads, true); // Pass forceDowngrade = true
        alert(
          `✅ User downgraded successfully!\n\n` +
          `⚠️ User is now ${overageGB} GB over quota.\n` +
          `They cannot download new files until they free up space.`
        );
        onSave();
      } catch (err) {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update user');
        console.error('Update error:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal update (no overage)
    try {
      await updateUserQuota(user.id, quota, plan, maxDownloads, false);
      alert('User updated successfully');
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update user');
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-2xl w-full border border-gray-700 shadow-2xl">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Edit User: {user.username}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-6 bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => {
                const selectedPlan = plans.find(p => p.id === e.target.value);
                setPlan(e.target.value);
                setQuota(selectedPlan.storage);
              }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Storage Quota (GB)
            </label>
            <input
              type="number"
              value={Math.round(quota / (1024 * 1024 * 1024))}
              onChange={(e) => setQuota(parseInt(e.target.value) * 1024 * 1024 * 1024)}
              min="1"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Current usage: {Math.round(user.storage_used / (1024 * 1024 * 1024))} GB
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Concurrent Downloads
            </label>
            <input
              type="number"
              value={maxDownloads}
              onChange={(e) => setMaxDownloads(parseInt(e.target.value))}
              min="1"
              max="50"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
