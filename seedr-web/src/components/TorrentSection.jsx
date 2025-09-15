import { useState } from "react";
import { addTorrent, pauseTorrent, resumeTorrent, stopTorrent, deleteTorrent } from "../api";

export default function TorrentSection({ torrents, onTorrentAdded }) {
  const [magnet, setMagnet] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAddTorrent(e) {
    e.preventDefault();
    if (!magnet.trim()) return;
    setLoading(true);
    try {
      await addTorrent(magnet.trim());
      setMagnet("");
      onTorrentAdded();
    } catch (err) {
      console.error(err);
      alert("Failed to add torrent");
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
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold text-gray-900 transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                Adding...
              </>
            ) : (
              <>
                <span className="mr-2">➕</span>
                Add Torrent
              </>
            )}
          </button>
        </form>
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
            <p className="text-gray-500 text-sm mt-2">Add a magnet link above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {torrents.map((torrent) => (
              <TorrentCard key={torrent.id} torrent={torrent} onTorrentUpdated={onTorrentAdded} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TorrentCard({ torrent, onTorrentUpdated }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const hasFiles = Array.isArray(torrent.files) && torrent.files.length > 0;

  const toggleExpanded = () => {
    if (!hasFiles) return;
    setIsAnimating(true);
    setIsExpanded(!isExpanded);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleTorrentAction = async (action, actionName) => {
    setActionLoading(actionName);
    try {
      await action(torrent.id);
      onTorrentUpdated();
    } catch (err) {
      console.error(`Failed to ${actionName} torrent:`, err);
      alert(`Failed to ${actionName} torrent`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all shadow-lg overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate mb-2">
              {torrent.name || torrent.id}
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              torrent.progress === 100
                ? 'bg-green-900 text-green-300'
                : 'bg-yellow-900 text-yellow-300'
            }`}>
              {torrent.progress === 100 ? 'Completed' : 'Downloading'}
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-1">
              {torrent.progress < 100 && (
                <>
                  <button
                    onClick={() => handleTorrentAction(pauseTorrent, 'pause')}
                    disabled={actionLoading}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                    title="Pause torrent"
                  >
                    {actionLoading === 'pause' ? (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3 text-gray-400 group-hover:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleTorrentAction(resumeTorrent, 'resume')}
                    disabled={actionLoading}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                    title="Resume torrent"
                  >
                    {actionLoading === 'resume' ? (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3 text-gray-400 group-hover:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => handleTorrentAction(stopTorrent, 'stop')}
                disabled={actionLoading}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                title="Stop torrent"
              >
                {actionLoading === 'stop' ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3 text-gray-400 group-hover:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${torrent.name}"?`)) {
                    handleTorrentAction(deleteTorrent, 'delete');
                  }
                }}
                disabled={actionLoading}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                title="Delete torrent"
              >
                {actionLoading === 'delete' ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Collapse/Expand Button */}
            {hasFiles && (
              <button
                onClick={toggleExpanded}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group"
                title={isExpanded ? 'Collapse files' : 'Expand files'}
              >
                <svg
                  className={`w-3 h-3 text-gray-400 group-hover:text-white transition-all duration-300 ${
                    isExpanded ? 'rotate-180' : 'rotate-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 h-2 rounded-full">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              torrent.progress === 100 ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${torrent.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Collapsible Files Section */}
      {hasFiles && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-300 flex items-center">
                <span className="mr-2">📁</span>
                Files ({torrent.files.length})
              </h4>
              {!isExpanded && (
                <button
                  onClick={toggleExpanded}
                  className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Show files →
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
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
                  <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    >
                      ⬇ Download
                    </a>
                    <button
                      onClick={(e) => {
                        navigator.clipboard.writeText(file.directUrl || "");
                        const btn = e.target;
                        const originalText = btn.textContent;
                        btn.textContent = "✓ Copied!";
                        btn.className = btn.className.replace('bg-gray-600', 'bg-green-600');
                        setTimeout(() => {
                          btn.textContent = originalText;
                          btn.className = btn.className.replace('bg-green-600', 'bg-gray-600');
                        }, 2000);
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
        </div>
      )}
    </div>
  );
}