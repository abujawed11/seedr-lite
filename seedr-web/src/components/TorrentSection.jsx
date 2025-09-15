import { useState } from "react";
import { addTorrent } from "../api";

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
              <TorrentCard key={torrent.id} torrent={torrent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TorrentCard({ torrent }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition-all shadow-lg">
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
        <div className="ml-4">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            torrent.progress === 100
              ? 'bg-green-900 text-green-300'
              : 'bg-yellow-900 text-yellow-300'
          }`}>
            {torrent.progress === 100 ? 'Completed' : 'Downloading'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 h-2 rounded-full mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            torrent.progress === 100 ? 'bg-green-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${torrent.progress || 0}%` }}
        />
      </div>

      {/* Files */}
      {Array.isArray(torrent.files) && torrent.files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Files ({torrent.files.length})</h4>
          {torrent.files.map((file) => (
            <div
              key={file.index}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
            >
              <div className="flex items-center min-w-0 flex-1">
                <span className="text-blue-400 mr-2">📄</span>
                <span className="text-sm text-white truncate">{file.name}</span>
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
                >
                  ⬇ Download
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(file.directUrl || "");
                    // Better notification
                    const btn = event.target;
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
      )}
    </div>
  );
}