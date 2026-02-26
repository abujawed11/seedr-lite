import { useState, useEffect, useRef } from "react";
import {
  addTorrent,
  addTorrentFile,
  stopTorrent,
  deleteTorrent,
  pauseTorrent,
  resumeTorrent,
  getNotifications,
  clearNotification,
  clearAllNotifications,
} from "../api";

function humanBytes(bytes) {
  const thresh = 1024;
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  if (Math.abs(bytes) < thresh) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  const fixed = u < 2 ? 0 : 2;
  return `${bytes.toFixed(fixed)} ${units[u]}`;
}

export default function TorrentSection({ torrents, onTorrentAdded }) {
  const [magnets, setMagnets] = useState([{ id: 1, value: "", state: 'idle', error: null }]);
  const [nextId, setNextId] = useState(2);
  const [notifications, setNotifications] = useState([]);
  const [showCopyrightWarning, setShowCopyrightWarning] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch notifications on component mount and periodically
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getNotifications();
        setNotifications(response.notifications || []);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();

    // Check for new notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleClearNotification = async (notificationId) => {
    try {
      await clearNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  const updateMagnetState = (magnetId, updates) => {
    setMagnets(prev => prev.map(m =>
      m.id === magnetId ? { ...m, ...updates } : m
    ));
  };

  const handleMagnetChange = (magnetId, value) => {
    updateMagnetState(magnetId, { value, error: null });
  };

  const addNewMagnetField = () => {
    setMagnets(prev => [...prev, {
      id: nextId,
      value: "",
      state: 'idle',
      error: null
    }]);
    setNextId(prev => prev + 1);
  };

  const removeMagnetField = (magnetId) => {
    setMagnets(prev => prev.filter(m => m.id !== magnetId));
  };

  const handleAddTorrent = async (magnetId) => {
    const magnet = magnets.find(m => m.id === magnetId);
    if (!magnet || !magnet.value.trim()) return;

    // Simple validation
    if (!magnet.value.trim().startsWith('magnet:')) {
      updateMagnetState(magnetId, {
        state: 'error',
        error: 'Please enter a valid magnet link'
      });
      return;
    }

    updateMagnetState(magnetId, { state: 'adding', error: null });

    try {
      console.log('[ADD] Starting torrent addition');
      const response = await addTorrent(magnet.value.trim());
      console.log('[ADD] Success:', response);

      updateMagnetState(magnetId, { state: 'added' });

      // Clear the magnet field after successful add
      setTimeout(() => {
        updateMagnetState(magnetId, {
          value: "",
          state: 'idle',
          error: null
        });
      }, 2000);

      // Refresh torrent list
      onTorrentAdded();

    } catch (err) {
      console.error('[ADD] Failed:', err);

      let errorMessage = 'Failed to add torrent';

      // Check for disabled account error
      if (err.response?.data?.code === 'ACCOUNT_DISABLED') {
        errorMessage = err.response.data.message || 'Your account has been disabled by an administrator. Please contact support for assistance.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      updateMagnetState(magnetId, {
        state: 'error',
        error: errorMessage
      });

      // Reset state after showing error (longer timeout for account disabled)
      const timeout = err.response?.data?.code === 'ACCOUNT_DISABLED' ? 8000 : 3000;
      setTimeout(() => {
        updateMagnetState(magnetId, { state: 'idle' });
      }, timeout);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.torrent')) {
      alert('Please select a valid .torrent file');
      return;
    }

    setUploadingFile(true);

    try {
      console.log('[UPLOAD] Starting torrent file upload');
      const response = await addTorrentFile(file);
      console.log('[UPLOAD] Success:', response);

      // Immediately refresh torrent list to show the new torrent
      // (it will appear with "Loading..." name initially, just like magnet links)
      onTorrentAdded();

      console.log('[UPLOAD] Torrent added to UI, metadata will load in background');
    } catch (err) {
      console.error('[UPLOAD] Failed:', err);

      let errorMessage = 'Failed to upload torrent file';

      // Check for disabled account error
      if (err.response?.data?.code === 'ACCOUNT_DISABLED') {
        errorMessage = err.response.data.message || 'Your account has been disabled by an administrator. Please contact support for assistance.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      alert(errorMessage);
    } finally {
      setUploadingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // CRITICAL FIX: Filter notifications by type to prevent showing completion notifications as quota exceeded
  const quotaExceededNotifications = notifications.filter(n => n.type === 'quota_exceeded');

  return (
    <div className="space-y-6">
      {/* Notifications Section - ONLY show quota_exceeded notifications */}
      {quotaExceededNotifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-red-400 flex items-center">
              <span className="mr-2">🚨</span>
              Quota Exceeded Alerts ({quotaExceededNotifications.length})
            </h2>
            {quotaExceededNotifications.length > 1 && (
              <button
                onClick={handleClearAllNotifications}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          {quotaExceededNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-red-400 text-lg mr-2">⚠️</span>
                  <h3 className="text-red-300 font-medium">Torrent Removed - Quota Exceeded</h3>
                </div>
                <div className="text-sm text-red-200/80 space-y-1">
                  <p><strong>Torrent:</strong> {notification.torrentName}</p>
                  <p><strong>Size:</strong> {notification.torrentSize}</p>
                  <p><strong>Available Space:</strong> {notification.availableSpace}</p>
                  <p className="text-xs text-red-300/60">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleClearNotification(notification.id)}
                className="ml-4 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-800/30 rounded-lg transition-colors"
                title="Dismiss notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Copyright Warning Section - Collapsible */}
      <div className="bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowCopyrightWarning(!showCopyrightWarning)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-yellow-900/30 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-yellow-300">
              ⚖️ <strong>Copyright Notice:</strong> You are solely responsible for ensuring you have legal rights to download content.
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-yellow-400 transition-transform ${showCopyrightWarning ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCopyrightWarning && (
          <div className="px-4 pb-4 pt-2 border-t border-yellow-600/30 space-y-3">
            <p className="text-sm text-yellow-200/90 leading-relaxed">
              You are <strong className="text-yellow-100">solely responsible</strong> for ensuring you have the legal right to download the content you add.
              Downloading copyrighted material without permission is <strong className="text-red-400">illegal</strong> and may result in:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-200/80 ml-4">
              <li>Account suspension or termination</li>
              <li>Legal action from copyright holders</li>
              <li>Criminal prosecution in some jurisdictions</li>
              <li>Financial penalties and damages</li>
            </ul>
            <p className="text-xs text-yellow-300/70 mt-3 p-3 bg-yellow-900/30 rounded border border-yellow-600/20">
              <strong className="text-yellow-300">Confirmation:</strong> By adding a torrent, you confirm that you have the legal right to download this content and will not use this service to infringe copyrights.
            </p>
          </div>
        )}
      </div>

      {/* Add Torrents Section */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Add New Torrents
        </h2>

        <div className="space-y-4">
          {magnets.map((magnet, index) => (
            <MagnetField
              key={magnet.id}
              magnet={magnet}
              index={index}
              onChange={(value) => handleMagnetChange(magnet.id, value)}
              onAdd={() => handleAddTorrent(magnet.id)}
              onRemove={() => removeMagnetField(magnet.id)}
              canRemove={magnets.length > 1}
            />
          ))}

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".torrent"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadingFile}
            />
            <button
              className={`w-full py-2 px-4 border-2 border-dashed rounded-lg transition-colors ${
                uploadingFile
                  ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                  : 'border-gray-600 hover:border-yellow-500 text-gray-400 hover:text-yellow-400 cursor-pointer'
              }`}
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                  Uploading Torrent File...
                </span>
              ) : (
                '📁 Upload Torrent File (.torrent)'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active Torrents */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-yellow-400 flex items-center">
          <span className="mr-2">📥</span>
          Active Downloads {torrents.length > 0 && `(${torrents.length})`}
        </h2>

        {torrents.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <p className="text-gray-400 text-lg">No active torrents</p>
            <p className="text-gray-500 text-sm mt-2">Add magnet links above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {torrents.map((t) => (
              <TorrentCard key={t.id} torrent={t} onTorrentUpdated={onTorrentAdded} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MagnetField({ magnet, index, onChange, onAdd, onRemove, canRemove }) {
  const { value, state, error } = magnet;

  const canAdd = value.trim() && value.trim().startsWith('magnet:') && state !== 'adding';
  const isLoading = state === 'adding';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="magnet:?xt=urn:btih:..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          onClick={onAdd}
          disabled={!canAdd || isLoading}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center min-w-[120px] ${
            state === 'added'
              ? 'bg-green-500 text-white'
              : canAdd
              ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
              : 'bg-gray-600 cursor-not-allowed text-gray-300'
          }`}
        >
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mr-2"></div>
          )}
          {state === 'added' ? '✓ Added' : 'Add'}
        </button>

        {canRemove && (
          <button
            onClick={onRemove}
            className="px-3 py-3 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
            title="Remove this magnet field"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status indicators */}
      {state === 'adding' && (
        <div className="flex items-center space-x-2 text-sm text-blue-400">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400"></div>
          <span>Adding torrent...</span>
        </div>
      )}

      {state === 'error' && error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-red-300 font-medium">Error</h4>
              <p className="text-red-400/70 text-sm">{error}</p>
            </div>
            <div className="text-red-400">⚠</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TorrentCard({ torrent, onTorrentUpdated }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const hasFiles = Array.isArray(torrent.files) && torrent.files.length > 0;

  const toggleExpanded = () => {
    if (!hasFiles) return;
    setIsExpanded((v) => !v);
  };

  const handleTorrentAction = async (action, actionName) => {
    setActionLoading(actionName);
    try {
      await action(torrent.id);
      onTorrentUpdated(); // refresh torrents only
    } catch (err) {
      console.error(`Failed to ${actionName} torrent:`, err);
      alert(`Failed to ${actionName} torrent`);
    } finally {
      setActionLoading(null);
    }
  };

  const isComplete = torrent.progress === 100;
  const isLoading = torrent.name === 'Loading...' || torrent.progress === 0;
  const isConnecting = torrent.progress === 0 && torrent.numPeers === 0;

  return (
    <div className={`bg-gray-800 rounded-xl border transition-all shadow-lg overflow-hidden ${
      isLoading || isConnecting
        ? 'border-yellow-500/50 shadow-yellow-500/10'
        : 'border-gray-700 hover:border-gray-600'
    }`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold truncate mb-2 ${
              isLoading || isConnecting ? 'text-yellow-300' : 'text-white'
            }`}>
              {torrent.name === 'Loading...' ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border border-yellow-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Initializing torrent...
                </span>
              ) : (
                torrent.name || torrent.id
              )}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="flex items-center">
                <span className="mr-1">📊</span>
                {torrent.progress}%
              </span>
              <span className="flex items-center">
                <span className="mr-1">💾</span>
                {torrent.downloaded} / {torrent.length}
              </span>
              <span className="flex items-center">
                <span className="mr-1">👥</span>
                {torrent.numPeers} peers
              </span>
              {isConnecting && (
                <span className="flex items-center text-blue-400 animate-pulse">
                  <span className="mr-1">🔍</span>
                  Searching for peers...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isComplete
                  ? "bg-green-900 text-green-300"
                  : torrent.status === 'paused'
                  ? "bg-gray-700 text-gray-300"
                  : isConnecting
                  ? "bg-blue-900 text-blue-300"
                  : "bg-yellow-900 text-yellow-300"
              }`}
            >
              {isComplete
                ? "Completed"
                : torrent.status === 'paused'
                ? "⏸ Paused"
                : isConnecting
                ? "🔍 Connecting..."
                : "📥 Downloading"
              }
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              {/* Pause/Resume Button */}
              {!isComplete && (
                torrent.status === 'paused' ? (
                  <button
                    onClick={() => handleTorrentAction(resumeTorrent, "resume")}
                    disabled={!!actionLoading}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                    title="Resume torrent"
                  >
                    {actionLoading === "resume" ? (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleTorrentAction(pauseTorrent, "pause")}
                    disabled={!!actionLoading || isLoading}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                    title="Pause torrent"
                  >
                    {actionLoading === "pause" ? (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3 text-gray-400 group-hover:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    )}
                  </button>
                )
              )}

              <button
                onClick={() => handleTorrentAction(stopTorrent, "stop")}
                disabled={!!actionLoading}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                title="Stop torrent"
              >
                {actionLoading === "stop" ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3 text-gray-400 group-hover:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${torrent.name || torrent.id}"?`)) {
                    handleTorrentAction(deleteTorrent, "delete");
                  }
                }}
                disabled={!!actionLoading}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                title="Delete torrent"
              >
                {actionLoading === "delete" ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Collapse/Expand */}
            {hasFiles && (
              <button
                onClick={toggleExpanded}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group"
                title={isExpanded ? "Collapse files" : "Expand files"}
              >
                <svg
                  className={`w-3 h-3 text-gray-400 group-hover:text-white transition-all duration-300 ${isExpanded ? "rotate-180" : "rotate-0"}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 h-2 rounded-full">
          {isConnecting ? (
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" style={{ width: '20%' }} />
          ) : (
            <div
              className={`h-2 rounded-full transition-all duration-300 ${isComplete ? "bg-green-500" : "bg-yellow-500"}`}
              style={{ width: `${torrent.progress || 0}%` }}
            />
          )}
        </div>
      </div>

      {/* Files (collapsible) */}
      {hasFiles && isExpanded && (
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300 flex items-center">
              <span className="mr-2">📁</span>Files ({torrent.files.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {torrent.files.map((file) => (
              <div
                key={file.index}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors group"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-blue-400 mr-2 flex-shrink-0">📄</span>
                  <span className="text-sm text-white truncate group-hover:text-yellow-300 transition-colors">
                    {file.name}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <a
                    href={file.streamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-medium text-white transition-colors"
                  >
                    ▶ Stream
                  </a>
                  <a
                    href={file.downloadUrl}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-xs font-medium text-white transition-colors"
                    download
                  >
                    ⬇ Download
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(file.directUrl || "");
                      alert("Direct link copied!");
                    }}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md text-xs font-medium text-white transition-colors"
                  >
                    🔗 Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}