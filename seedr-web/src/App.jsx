import { useState, useEffect } from "react";
import { listTorrents, browse } from "./api";
import TorrentSection from "./components/TorrentSection";
import FileExplorer from "./components/FileExplorer";

export default function App() {
  const [torrents, setTorrents] = useState([]);
  const [browseData, setBrowseData] = useState({ cwd: "", parent: null, dirs: [], files: [] });
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState({ torrents: false, files: false });

  async function fetchTorrents() {
    setLoading(prev => ({ ...prev, torrents: true }));
    try {
      const data = await listTorrents();
      setTorrents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Torrents fetch error:", err);
    } finally {
      setLoading(prev => ({ ...prev, torrents: false }));
    }
  }

  async function fetchBrowse(path = currentPath) {
    setLoading(prev => ({ ...prev, files: true }));
    try {
      const data = await browse(path);
      setBrowseData(data);
    } catch (err) {
      console.error("Browse fetch error:", err);
    } finally {
      setLoading(prev => ({ ...prev, files: false }));
    }
  }

  function navigateToPath(path) {
    setCurrentPath(path);
    fetchBrowse(path);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function handleTorrentAdded() {
    await Promise.all([fetchTorrents(), fetchBrowse()]);
  }

  // Initial load and path-based refresh
  useEffect(() => {
    fetchTorrents();
    fetchBrowse();
  }, [currentPath]);

  // Smart polling - only poll when there are active downloads
  useEffect(() => {
    const hasActiveDownloads = torrents.some(torrent => torrent.progress < 100);

    if (hasActiveDownloads) {
      const interval = setInterval(() => {
        fetchTorrents();
        fetchBrowse();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [torrents, currentPath]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Seedr-Lite
              </h1>
              <div className="ml-4 text-sm text-gray-400">
                Modern torrent client
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center space-x-4">
              {loading.torrents && (
                <div className="flex items-center text-sm text-yellow-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                  Syncing torrents...
                </div>
              )}
              {loading.files && (
                <div className="flex items-center text-sm text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                  Loading files...
                </div>
              )}
              <div className="flex items-center text-sm text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Online
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Torrents Section */}
        <section>
          <TorrentSection
            torrents={torrents}
            onTorrentAdded={handleTorrentAdded}
          />
        </section>

        {/* File Explorer Section */}
        <section>
          <FileExplorer
            browseData={browseData}
            currentPath={currentPath}
            onNavigate={navigateToPath}
            formatFileSize={formatFileSize}
            onFileDeleted={() => fetchBrowse()}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/50 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              © 2024 Seedr-Lite • Built with React & Tailwind CSS
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <span className="mr-1">⚡</span>
                {torrents.filter(t => t.progress < 100).length} active
              </span>
              <span className="flex items-center">
                <span className="mr-1">✅</span>
                {torrents.filter(t => t.progress === 100).length} completed
              </span>
              <span className="flex items-center">
                <span className="mr-1">📁</span>
                {browseData.files.length} files
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}