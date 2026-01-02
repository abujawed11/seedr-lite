import { useState, useEffect } from 'react';
import {
  getAdminStats,
  getAllUsers,
  getAllPayments,
  updateUserQuota,
  updateUserStatus,
  deleteUser,
  clearUserStorage,
  getAllDMCAReports,
  processDMCAReport,
  deleteDMCAReport,
  getUserSubscription,
  getUsersWithFiles,
  deleteUserFile,
  getFolderContents
} from '../api';
import { useAuth } from '../context/AuthContext';
import AdminActivityLogs from './AdminActivityLogs';
import UserFilters from '../components/admin/UserFilters';

export default function AdminDashboard({ onBackToMain }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dmcaReports, setDmcaReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [usersFiles, setUsersFiles] = useState([]);
  const [filesPage, setFilesPage] = useState(1);
  const [filesPagination, setFilesPagination] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderContents, setFolderContents] = useState({});
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filterCriteria, setFilterCriteria] = useState({ search: '', plan: 'all', status: 'all', ip: 'all' });

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
      const [statsData, usersData, paymentsData, dmcaData] = await Promise.all([
        getAdminStats(),
        getAllUsers(),
        getAllPayments(),
        getAllDMCAReports()
      ]);
      setStats(statsData.stats);
      setUsers(usersData.users);
      setPayments(paymentsData.payments);
      setDmcaReports(dmcaData.reports || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      alert('Failed to load admin data');
    } finally {
      setLoading(false);
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

  const handleClearUserStorage = async (userId, username) => {
    if (!confirm(`Are you sure you want to clear ALL storage for user "${username}"?\n\nThis will:\n• Remove all active torrents\n• Delete all downloaded files\n• Reset storage usage to 0\n\nThis action cannot be undone.`)) return;

    try {
      const result = await clearUserStorage(userId);

      const message = `Storage cleared successfully!\n\n` +
        `Cleared: ${result.cleared.formatted}\n` +
        `Files deleted: ${result.cleared.files}\n` +
        `Torrents removed: ${result.cleared.torrentsRemoved}\n` +
        `Reservations released: ${result.cleared.reservationsReleased}`;

      alert(message);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to clear user storage:', error);
      alert(error.response?.data?.error || 'Failed to clear user storage');
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

  const handleProcessDMCA = async (reportId, action, notes = '') => {
    try {
      await processDMCAReport(reportId, action, notes);
      alert(`DMCA report ${action} successfully`);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to process DMCA report:', error);
      alert('Failed to process DMCA report');
    }
  };

  const handleDeleteDMCA = async (reportId) => {
    if (!confirm('Are you sure you want to delete this DMCA report?')) return;

    try {
      await deleteDMCAReport(reportId);
      alert('DMCA report deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to delete DMCA report:', error);
      alert('Failed to delete DMCA report');
    }
  };

  const handleViewSubscription = async (userId) => {
    try {
      const data = await getUserSubscription(userId);
      setSubscriptionData(data);
      setSubscriptionModal(true);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
      alert('Failed to load subscription information');
    }
  };

  const fetchUsersFiles = async (page = 1) => {
    setLoading(true);
    try {
      const data = await getUsersWithFiles(page, 20);
      setUsersFiles(data.users);
      setFilesPagination(data.pagination);
      setFilesPage(page);
    } catch (error) {
      console.error('Failed to fetch users files:', error);
      alert('Failed to load user files');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (userId, filePath) => {
    if (!confirm(`Are you sure you want to delete this file?\n\n${filePath}`)) return;

    try {
      await deleteUserFile(userId, filePath);
      alert('File deleted successfully');
      // Clear cached folder contents and expanded folders
      setFolderContents({});
      setExpandedFolders({});
      // Refresh the current page
      await fetchUsersFiles(filesPage);
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert(error.response?.data?.error || 'Failed to delete file');
    }
  };

  const handleToggleFolder = async (userId, folderPath) => {
    const folderKey = `${userId}-${folderPath}`;

    // If folder is already expanded, collapse it
    if (expandedFolders[folderKey]) {
      setExpandedFolders(prev => {
        const newState = { ...prev };
        delete newState[folderKey];
        return newState;
      });
      return;
    }

    // Expand folder and fetch contents if not already loaded
    if (!folderContents[folderKey]) {
      try {
        const data = await getFolderContents(userId, folderPath);
        setFolderContents(prev => ({
          ...prev,
          [folderKey]: data.files
        }));
      } catch (error) {
        console.error('Failed to fetch folder contents:', error);
        alert('Failed to load folder contents');
        return;
      }
    }

    setExpandedFolders(prev => ({
      ...prev,
      [folderKey]: true
    }));
  };

  const handleDeleteFolder = async (userId, folderPath, folderName) => {
    if (!confirm(`Are you sure you want to delete the entire folder?\n\nFolder: ${folderName}\n\nThis will delete all files inside this folder. This action cannot be undone.`)) return;

    try {
      await deleteUserFile(userId, folderPath);
      alert('Folder deleted successfully');
      // Clear cached folder contents and expanded folders
      setFolderContents({});
      setExpandedFolders({});
      // Refresh the current page
      await fetchUsersFiles(filesPage);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      alert(error.response?.data?.error || 'Failed to delete folder');
    }
  };

  // Fetch user files when switching to files tab
  useEffect(() => {
    if (activeTab === 'files' && usersFiles.length === 0) {
      fetchUsersFiles(1);
    }
  }, [activeTab]);

  // Apply filters whenever users or filter criteria changes
  useEffect(() => {
    let filtered = [...users];

    // Apply search filter
    if (filterCriteria.search) {
      const searchLower = filterCriteria.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply plan filter
    if (filterCriteria.plan !== 'all') {
      filtered = filtered.filter((u) => u.plan === filterCriteria.plan);
    }

    // Apply status filter
    if (filterCriteria.status !== 'all') {
      const isActive = filterCriteria.status === 'active';
      filtered = filtered.filter((u) => u.is_active === (isActive ? 1 : 0));
    }

    // Apply IP filter
    if (filterCriteria.ip !== 'all') {
      filtered = filtered.filter((u) => (u.registration_ip || 'Unknown') === filterCriteria.ip);
    }

    setFilteredUsers(filtered);
  }, [users, filterCriteria]);

  const handleFilterChange = (newFilters) => {
    setFilterCriteria(newFilters);
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
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              💳 Transactions
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              📋 Activity Logs
            </button>
            <button
              onClick={() => setActiveTab('dmca')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'dmca'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              ⚖️ DMCA Reports ({dmcaReports.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'files'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              📁 User Files
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

            {/* Filters */}
            <UserFilters
              onFilterChange={handleFilterChange}
              totalUsers={users.length}
              filteredCount={filteredUsers.length}
              users={users}
            />

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
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{u.username}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewSubscription(u.id)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                              u.plan === 'free' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' :
                              u.plan === 'basic' ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' :
                              u.plan === 'pro' ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50' :
                              'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                            }`}
                            title="Click to view subscription details"
                          >
                            {u.plan} 📊
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">
                            {formatBytes(u.storage_used)} / {formatBytes(u.storage_quota)}
                          </div>
                          {u.reserved_bytes > 0 ? (
                            <div className="text-xs text-blue-400">
                              📥 {formatBytes(u.reserved_bytes)} downloading
                            </div>
                          ) : (
                            <div className={`text-xs ${u.storage_used > u.storage_quota ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                              {u.storage_used > u.storage_quota ? (
                                <>⚠️ Over quota ({formatBytes(u.storage_used - u.storage_quota)} over)</>
                              ) : (
                                <>{formatBytes(u.storage_quota - u.storage_used)} available</>
                              )}
                            </div>
                          )}
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
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300 font-mono">
                            {u.registration_ip || 'N/A'}
                          </div>
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
                              <>
                                <button
                                  onClick={() => handleClearUserStorage(u.id, u.username)}
                                  className="px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                                  title="Clear all user storage and files"
                                >
                                  Clear Storage
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </>
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

        {!loading && activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Payment Transactions</h2>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.order_id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {new Date(payment.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-white">{payment.username || 'Unknown'}</div>
                            <div className="text-xs text-gray-400">{payment.email || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-white capitalize">{payment.plan_id}</span>
                            <span className="text-xs text-gray-400 ml-1">({payment.duration})</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-white font-mono">
                            {payment.currency} {(payment.amount / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              payment.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                              payment.status === 'created' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-red-900/30 text-red-400'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                            {payment.order_id}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                            {payment.payment_id || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'activity' && (
          <AdminActivityLogs />
        )}

        {/* DMCA Reports Tab */}
        {!loading && activeTab === 'dmca' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">DMCA Takedown Reports</h3>

              {dmcaReports.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No DMCA reports submitted yet</p>
              ) : (
                <div className="space-y-4">
                  {dmcaReports.map((report) => (
                    <div key={report.id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-semibold text-white">Report #{report.id}</h4>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              report.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                              report.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                              report.status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                              'bg-gray-900/30 text-gray-400'
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            Submitted: {new Date(report.submitted_at).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Reporter</div>
                          <div className="text-sm text-white">{report.reporter_name}</div>
                          <div className="text-xs text-gray-400">{report.reporter_email}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Contact</div>
                          <div className="text-sm text-white">{report.reporter_phone || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{report.client_ip || 'Unknown IP'}</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-xs text-gray-400 mb-1">Copyrighted Work</div>
                        <div className="text-sm text-white bg-gray-800/50 p-3 rounded border border-gray-600">
                          {report.copyrighted_work}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-xs text-gray-400 mb-1">Infringing Content</div>
                        <div className="text-sm text-white bg-gray-800/50 p-3 rounded border border-gray-600 break-all">
                          {report.infringing_content}
                        </div>
                      </div>

                      {report.admin_notes && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-400 mb-1">Admin Notes</div>
                          <div className="text-sm text-gray-300 bg-blue-900/20 p-3 rounded border border-blue-700/50">
                            {report.admin_notes}
                          </div>
                        </div>
                      )}

                      {report.status === 'pending' && (
                        <div className="flex space-x-2 pt-3 border-t border-gray-600">
                          <button
                            onClick={() => {
                              const notes = prompt('Add admin notes (optional):');
                              handleProcessDMCA(report.id, 'approved', notes || '');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            ✓ Approve & Remove Content
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Add reason for rejection:');
                              if (notes) handleProcessDMCA(report.id, 'rejected', notes);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            ✗ Reject
                          </button>
                          <button
                            onClick={() => handleDeleteDMCA(report.id)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium ml-auto"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}

                      {report.status !== 'pending' && (
                        <div className="flex justify-between items-center pt-3 border-t border-gray-600">
                          <div className="text-sm text-gray-400">
                            Processed: {report.processed_at ? new Date(report.processed_at).toLocaleString() : 'N/A'}
                          </div>
                          <button
                            onClick={() => handleDeleteDMCA(report.id)}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Files Tab */}
        {!loading && activeTab === 'files' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">User Files Management</h2>
              <button
                onClick={() => {
                  setFolderContents({});
                  setExpandedFolders({});
                  fetchUsersFiles(filesPage);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Users List with Files */}
            <div className="space-y-4">
              {usersFiles.map((user) => (
                <div key={user.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  {/* User Header */}
                  <div
                    className="p-4 bg-gray-800/50 flex justify-between items-center cursor-pointer hover:bg-gray-700/30 transition-colors"
                    onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-lg font-semibold text-white">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.plan === 'free' ? 'bg-gray-700 text-gray-300' :
                        user.plan === 'basic' ? 'bg-blue-900/30 text-blue-400' :
                        user.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                        'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {user.plan}
                      </span>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Storage</div>
                        <div className="text-white font-medium">
                          {formatBytes(user.storage_used)} / {formatBytes(user.storage_quota)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Folders</div>
                        <div className="text-white font-medium">{user.folder_count}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Files</div>
                        <div className="text-white font-medium">{user.file_count}</div>
                      </div>
                      <div className="text-gray-400">
                        {expandedUserId === user.id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {/* Folders and Root Files List (Expandable) */}
                  {expandedUserId === user.id && (
                    <div className="border-t border-gray-700">
                      {user.folders.length === 0 && (!user.root_files || user.root_files.length === 0) ? (
                        <div className="p-6 text-center text-gray-400">
                          No folders/downloads yet
                        </div>
                      ) : (
                        <div className="p-4 space-y-2">
                          {/* Root-level files (if any) */}
                          {user.root_files && user.root_files.length > 0 && (
                            <div className="bg-blue-900/20 rounded-lg border border-blue-700/50 p-3 mb-3">
                              <div className="text-sm text-blue-400 font-medium mb-2">📄 Root Files ({user.root_files.length})</div>
                              <div className="space-y-1">
                                {user.root_files.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-gray-800/50 rounded p-2 hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center space-x-3 flex-1">
                                      <span className="text-lg">📄</span>
                                      <div className="flex-1">
                                        <div className="text-sm text-white">{file.name}</div>
                                        <div className="text-xs text-gray-400">
                                          {formatBytes(file.size)} • {new Date(file.modified).toLocaleDateString()}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteFile(user.id, file.path)}
                                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Folders */}
                          {user.folders.map((folder, idx) => {
                            const folderKey = `${user.id}-${folder.path}`;
                            const isExpanded = expandedFolders[folderKey];
                            const files = folderContents[folderKey] || [];

                            return (
                              <div key={idx} className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                                {/* Folder Header */}
                                <div className="flex items-center justify-between p-3 bg-gray-800/50">
                                  <div
                                    className="flex items-center space-x-3 flex-1 cursor-pointer hover:bg-gray-700/30 -m-3 p-3 rounded-l-lg transition-colors"
                                    onClick={() => handleToggleFolder(user.id, folder.path)}
                                  >
                                    <div className="text-yellow-400 text-xl">
                                      {isExpanded ? '📂' : '📁'}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-white font-medium">{folder.name}</div>
                                      <div className="text-xs text-gray-400">
                                        {folder.file_count} files • {formatBytes(folder.size)}
                                      </div>
                                    </div>
                                    <div className="text-gray-400 text-sm">
                                      {isExpanded ? '▼' : '▶'}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteFolder(user.id, folder.path, folder.name)}
                                    className="px-3 py-1.5 ml-3 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                  >
                                    🗑️ Delete Folder
                                  </button>
                                </div>

                                {/* Files inside folder (when expanded) */}
                                {isExpanded && (
                                  <div className="border-t border-gray-700">
                                    {files.length === 0 ? (
                                      <div className="p-4 text-center text-gray-500 text-sm">
                                        Loading files...
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead className="bg-gray-900/30">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Modified</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-700/50">
                                            {files.map((file, fileIdx) => (
                                              <tr key={fileIdx} className="hover:bg-gray-700/20 transition-colors">
                                                <td className="px-4 py-2 text-sm text-gray-300" title={file.path}>
                                                  <div className="flex items-center space-x-2">
                                                    <span>📄</span>
                                                    <span>{file.name}</span>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-400">{formatBytes(file.size)}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                  {new Date(file.modified).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                  })}
                                                </td>
                                                <td className="px-4 py-2">
                                                  <button
                                                    onClick={() => handleDeleteFile(user.id, `${folder.path}/${file.path}`)}
                                                    className="px-2 py-1 text-xs bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors"
                                                  >
                                                    Delete
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {filesPagination && filesPagination.total_pages > 1 && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Page {filesPagination.current_page} of {filesPagination.total_pages}
                    <span className="ml-2">
                      ({filesPagination.total_users} total users)
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchUsersFiles(filesPage - 1)}
                      disabled={!filesPagination.has_prev}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        filesPagination.has_prev
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => fetchUsersFiles(filesPage + 1)}
                      disabled={!filesPagination.has_next}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        filesPagination.has_next
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
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

      {/* Subscription Details Modal */}
      {subscriptionModal && subscriptionData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                📊 Subscription Details
              </h2>
              <button
                onClick={() => {
                  setSubscriptionModal(false);
                  setSubscriptionData(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Active Subscription */}
              {subscriptionData.active_subscription ? (
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-green-400 flex items-center">
                      <span className="mr-2">✓</span> Active Subscription
                    </h3>
                    <span className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
                      {subscriptionData.active_subscription.status}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-green-300/70 mb-1">Plan</div>
                      <div className="text-lg font-bold text-white uppercase">
                        {subscriptionData.active_subscription.plan}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-300/70 mb-1">Duration</div>
                      <div className="text-lg font-semibold text-white capitalize">
                        {subscriptionData.active_subscription.duration}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-300/70 mb-1">Started</div>
                      <div className="text-sm text-white">
                        {new Date(subscriptionData.active_subscription.started_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-300/70 mb-1">Expires</div>
                      <div className="text-sm text-white font-medium">
                        {new Date(subscriptionData.active_subscription.expires_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-300/70 mb-1">Auto-Renew</div>
                      <div className="text-sm text-white">
                        {subscriptionData.active_subscription.auto_renew ? 'Yes ✓' : 'No ✗'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-300/70 mb-1">Activated By</div>
                      <div className="text-sm text-white">
                        {subscriptionData.active_subscription.created_by || 'User'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
                  <div className="text-gray-400 text-lg">No active subscription</div>
                  <div className="text-sm text-gray-500 mt-2">User is on Free plan</div>
                </div>
              )}

              {/* Subscription History */}
              {subscriptionData.subscription_history && subscriptionData.subscription_history.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">📜</span> Subscription History
                  </h3>
                  <div className="space-y-3">
                    {subscriptionData.subscription_history.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className={`p-4 rounded-lg border ${
                          sub.status === 'active'
                            ? 'bg-green-900/20 border-green-700/50'
                            : sub.status === 'expired'
                            ? 'bg-orange-900/20 border-orange-700/50'
                            : 'bg-gray-800/50 border-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                                sub.status === 'active' ? 'bg-green-600 text-white' :
                                sub.status === 'expired' ? 'bg-orange-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {sub.plan}
                              </span>
                              <span className="text-xs text-gray-400 capitalize">{sub.duration}</span>
                              <span className={`px-2 py-1 text-xs rounded ${
                                sub.status === 'active' ? 'bg-green-900/50 text-green-300' :
                                sub.status === 'expired' ? 'bg-orange-900/50 text-orange-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {sub.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-400">Started:</span>{' '}
                                <span className="text-white">{new Date(sub.started_at).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Expires:</span>{' '}
                                <span className="text-white">{new Date(sub.expires_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Logs */}
              {subscriptionData.subscription_logs && subscriptionData.subscription_logs.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">📋</span> Activity Logs
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {subscriptionData.subscription_logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            log.action === 'created' ? 'bg-blue-600 text-white' :
                            log.action === 'renewed' ? 'bg-green-600 text-white' :
                            log.action === 'expired' ? 'bg-orange-600 text-white' :
                            log.action === 'cancelled' ? 'bg-red-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(log.performed_at).toLocaleString()}
                          </span>
                        </div>
                        {(log.plan_from || log.plan_to) && (
                          <div className="text-gray-300">
                            {log.plan_from && log.plan_to ? (
                              <>{log.plan_from} → {log.plan_to}</>
                            ) : (
                              <>{log.plan_to || log.plan_from}</>
                            )}
                            {log.duration && <span className="text-gray-400"> ({log.duration})</span>}
                          </div>
                        )}
                        {log.reason && (
                          <div className="text-xs text-gray-400 mt-1">Reason: {log.reason}</div>
                        )}
                        {log.performed_by && (
                          <div className="text-xs text-gray-500">By: {log.performed_by}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
