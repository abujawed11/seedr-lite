import { useState, useEffect } from 'react';
import { getActivityLogs, deleteActivityLog, clearOldActivityLogs, deleteUserFile } from '../api';

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [limit, setLimit] = useState(100);
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  useEffect(() => {
    fetchLogs();
  }, [filterType, limit]);

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (filterType !== 'all') {
        params.actionType = filterType;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await getActivityLogs(params);
      setLogs(response.logs);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      alert('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchLogs();
  };

  const handleDeleteLog = async (logId) => {
    if (!confirm('Delete this activity log entry?')) return;

    try {
      await deleteActivityLog(logId);
      alert('Activity log deleted successfully');
      fetchLogs();
    } catch (error) {
      console.error('Failed to delete log:', error);
      alert('Failed to delete activity log');
    }
  };

  const handleCleanupOldLogs = async () => {
    const days = prompt('Clear logs older than how many days?', '90');
    if (!days) return;

    try {
      const response = await clearOldActivityLogs(parseInt(days));
      alert(response.message);
      fetchLogs();
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
      alert('Failed to cleanup old logs');
    }
  };

  const handleDeleteFile = async (log) => {
    if (!log.file_path) {
      alert('No file path available for this log entry');
      return;
    }

    const confirmMsg = `Are you sure you want to delete this file?\n\nUser: ${log.username}\nTorrent: ${log.torrent_name}\nFile: ${log.file_path}\n\nThis action cannot be undone!`;

    if (!confirm(confirmMsg)) return;

    try {
      const response = await deleteUserFile(log.user_id, log.file_path);
      alert(`File deleted successfully!\n\nDeleted: ${response.deletedFile}\nSize: ${response.deletedSize}`);
      // Optionally refresh logs after deletion
      fetchLogs();
    } catch (error) {
      console.error('Failed to delete file:', error);
      const errorMsg = error.response?.data?.error || 'Failed to delete file';
      alert(`Error: ${errorMsg}`);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getActionBadgeColor = (actionType) => {
    if (!actionType) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    
    if (actionType.startsWith('torrent_')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (actionType.startsWith('file_') || actionType.startsWith('folder_') || actionType === 'direct_link_access') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (actionType.startsWith('admin_')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (actionType.startsWith('security_') || actionType.includes('dmca')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (actionType.includes('login') || actionType.includes('register') || actionType.includes('otp') || actionType === 'logout') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Activity Logs</h2>
        <button
          onClick={handleCleanupOldLogs}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          🧹 Cleanup Old Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Search</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username, torrent name, file path..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Action Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
            >
              <option value="all">All Actions</option>
              
              <optgroup label="Authentication">
                <option value="login_success">Login Success</option>
                <option value="login_failure">Login Failure</option>
                <option value="logout">Logout</option>
                <option value="register_success">Register Success</option>
                <option value="register_failure">Register Failure</option>
                <option value="otp_verify_success">OTP Verify Success</option>
                <option value="otp_verify_failure">OTP Verify Failure</option>
                <option value="password_reset_request">Pass Reset Request</option>
                <option value="password_reset_complete">Pass Reset Complete</option>
              </optgroup>

              <optgroup label="Torrent Operations">
                <option value="torrent_add">Torrent Add</option>
                <option value="torrent_complete">Torrent Complete</option>
                <option value="torrent_stop">Torrent Stop</option>
                <option value="torrent_delete">Torrent Delete</option>
                <option value="torrent_error">Torrent Error</option>
                <option value="reservation_cleanup">Reservation Cleanup</option>
              </optgroup>

              <optgroup label="File Operations">
                <option value="file_download">File Download</option>
                <option value="file_stream">File Stream</option>
                <option value="file_delete">File Delete</option>
                <option value="folder_download">Folder Download</option>
                <option value="direct_link_access">Direct Link Access</option>
              </optgroup>

              <optgroup label="Security Events">
                <option value="security_quota_exceeded">Quota Exceeded</option>
                <option value="security_concurrent_limit_exceeded">Concurrent Limit Exceeded</option>
                <option value="security_path_traversal_attempt">Path Traversal Attempt</option>
                <option value="dmca_report_submit">DMCA Report Submit</option>
              </optgroup>

              <optgroup label="Admin Actions">
                <option value="admin_login">Admin Login</option>
                <option value="admin_quota_update">Quota Update</option>
                <option value="admin_status_update">Status Update</option>
                <option value="admin_user_delete">User Delete</option>
                <option value="admin_storage_clear">Storage Clear</option>
                <option value="admin_upgrade_approve">Upgrade Approve</option>
                <option value="admin_upgrade_reject">Upgrade Reject</option>
                <option value="admin_subscription_activate">Sub Activate</option>
                <option value="admin_subscription_cancel">Sub Cancel</option>
                <option value="admin_dmca_action">DMCA Action</option>
              </optgroup>

              <optgroup label="Plans">
                <option value="upgrade_request_submit">Upgrade Request</option>
                <option value="current_plan_view">Plan View</option>
              </optgroup>
            </select>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
            >
              <option value="50">50 logs</option>
              <option value="100">100 logs</option>
              <option value="200">200 logs</option>
              <option value="500">500 logs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading activity logs...</p>
        </div>
      )}

      {/* Logs Table */}
      {!loading && logs.length === 0 && (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <p className="text-gray-400">No activity logs found</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Details</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">IP Address</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs.map((log, index) => (
                  <tr key={log.id || `log-${index}-${log.created_at}`} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{log.username}</div>
                      <div className="text-xs text-gray-500">{log.user_id?.substring(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getActionBadgeColor(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md text-sm">
                      {/* Generic Detail Renderer */}
                      {log.torrent_name && (
                        <div className="text-gray-300 font-medium truncate" title={log.torrent_name}>
                          {log.torrent_name}
                        </div>
                      )}
                      
                      {log.file_path && (
                        <div className="text-xs text-gray-500 truncate mt-0.5" title={log.file_path}>
                          <span className="text-gray-600 mr-1">File:</span> {log.file_path}
                        </div>
                      )}

                      {log.file_size > 0 && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          Size: {formatBytes(log.file_size)}
                        </div>
                      )}

                      {log.magnet_link && log.action_type !== 'torrent_add' && (
                        <div 
                          className={`text-xs text-gray-600 mt-0.5 cursor-pointer hover:text-gray-400 transition-colors ${expandedLogs.has(log.id) ? 'whitespace-normal break-all' : 'truncate'}`}
                          title="Click to expand/collapse"
                          onClick={() => toggleExpand(log.id)}
                        >
                          Note: {log.magnet_link}
                        </div>
                      )}

                      {/* Fallback for specific complex types if needed in future */}
                      {log.action_type === 'torrent_add' && log.magnet_link && (
                         <div 
                           className={`text-xs text-gray-600 mt-0.5 cursor-pointer hover:text-gray-400 transition-colors ${expandedLogs.has(log.id) ? 'whitespace-normal break-all' : 'truncate'}`}
                           onClick={() => toggleExpand(log.id)}
                           title="Click to expand/collapse"
                         >
                           Magnet: {log.magnet_link}
                         </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.ip_address}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Show delete file button for file-related actions if path exists */}
                        {['file_download', 'file_stream', 'file_delete', 'folder_download', 'admin_file_delete'].includes(log.action_type) && log.file_path && (
                          <button
                            onClick={() => handleDeleteFile(log)}
                            className="px-3 py-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded text-xs transition-colors"
                            title="Delete the actual file from user's storage"
                          >
                            Delete File
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors"
                          title="Delete log entry"
                        >
                          Delete Log
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-900 px-4 py-3 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Showing {logs.length} activity logs
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
