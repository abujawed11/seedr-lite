

import { useState } from "react";
import {
  addTorrent,
  stopTorrent,
  deleteTorrent,
} from "../api";

export default function TorrentSection({ torrents, onTorrentAdded }) {
  const [magnet, setMagnet] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingState, setAddingState] = useState('idle'); // idle, connecting, fetching, added
  const [lastAddedName, setLastAddedName] = useState('');

  async function handleAddTorrent(e) {
    e.preventDefault();
    if (!magnet.trim()) return;

    setLoading(true);
    setAddingState('connecting');

    try {
      console.log('🚀 Frontend: Starting torrent addition process...');
      console.log('🔗 Frontend: Magnet link:', magnet.substring(0, 80) + '...');

      // Simulate connection phase
      await new Promise(resolve => setTimeout(resolve, 500));
      setAddingState('fetching');

      console.log('📡 Frontend: Sending add torrent request...');
      const response = await addTorrent(magnet.trim());
      console.log('✅ Frontend: Torrent addition response:', response);

      // Extract torrent name from magnet link for display
      const nameMatch = magnet.match(/dn=([^&]+)/);
      const torrentName = nameMatch ? decodeURIComponent(nameMatch[1]) : 'New Torrent';
      setLastAddedName(torrentName);
      console.log('📝 Frontend: Extracted torrent name:', torrentName);

      setAddingState('added');
      setMagnet("");

      // Wait a bit before refreshing to allow backend to process
      console.log('⏳ Frontend: Waiting for backend to process...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔄 Frontend: Refreshing torrent list...');
      onTorrentAdded();

      // Show success state briefly
      setTimeout(() => {
        setAddingState('idle');
        console.log('✨ Frontend: Torrent addition process complete');
      }, 1500);

    } catch (err) {
      console.error('❌ Frontend: Torrent addition failed:', err);
      console.error('❌ Frontend: Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      setAddingState('idle');
      alert("Failed to add torrent: " + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Torrent Form */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Add New Torrent
        </h2>
        <form onSubmit={handleAddTorrent} className="space-y-4">
          <div>
            <label htmlFor="magnet" className="block text-sm font-medium text-gray-300 mb-2">
              Magnet Link
            </label>
            <input
              id="magnet"
              type="text"
              placeholder="magnet:?xt=urn:btih:..."
              value={magnet}
              onChange={(e) => setMagnet(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !magnet.trim()}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center ${
              addingState === 'added'
                ? 'bg-green-500 text-white'
                : loading
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
            }`}
          >
            {addingState === 'connecting' && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mr-2"></div>
                <span className="animate-pulse">Connecting to network...</span>
              </>
            )}
            {addingState === 'fetching' && (
              <>
                <div className="flex space-x-1 mr-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="animate-pulse">Fetching torrent metadata...</span>
              </>
            )}
            {addingState === 'added' && (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>✨ {lastAddedName} added successfully!</span>
              </>
            )}
            {addingState === 'idle' && !loading && (
              <>
                <span className="mr-2">🚀</span>
                Add Torrent
              </>
            )}
          </button>
        </form>
      </div>

      {/* Adding Progress Notification */}
      {addingState !== 'idle' && (
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            {addingState === 'connecting' && (
              <>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <p className="text-blue-300 font-medium">🌐 Connecting to torrent network...</p>
                  <p className="text-blue-400/70 text-sm">Initializing peer connections</p>
                </div>
              </>
            )}
            {addingState === 'fetching' && (
              <>
                <div className="flex-shrink-0">
                  <div className="flex space-x-1">
                    <div className="w-2 h-8 bg-purple-400 rounded animate-pulse"></div>
                    <div className="w-2 h-6 bg-purple-400 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-4 bg-purple-400 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-6 bg-purple-400 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    <div className="w-2 h-8 bg-purple-400 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
                <div>
                  <p className="text-purple-300 font-medium">📋 Fetching torrent metadata...</p>
                  <p className="text-purple-400/70 text-sm">Processing torrent information and files</p>
                </div>
              </>
            )}
            {addingState === 'added' && (
              <>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-green-300 font-medium">🎉 Torrent added successfully!</p>
                  <p className="text-green-400/70 text-sm">{lastAddedName} is now downloading</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
            <p className="text-gray-500 text-sm mt-2">Add a magnet link above to get started</p>
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
                  : isConnecting
                  ? "bg-blue-900 text-blue-300"
                  : "bg-yellow-900 text-yellow-300"
              }`}
            >
              {isComplete
                ? "Completed"
                : isConnecting
                ? "🔍 Connecting..."
                : "📥 Downloading"
              }
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">

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
