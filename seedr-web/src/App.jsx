import { useState, useEffect, useRef } from "react";
import { listTorrents, browse, getNotifications, clearNotification } from "./api";
import { useAuth } from "./context/AuthContext";
import TorrentSection from "./components/TorrentSection";
import FileExplorer from "./components/FileExplorer";
import PlansModal from "./components/PlansModal";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  const { user, logout, getStorageInfo, refreshUserProfile, fetchDetailedQuota } = useAuth();
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'admin'
  const [torrents, setTorrents] = useState([]);
  const [browseData, setBrowseData] = useState({ cwd: "", parent: null, dirs: [], files: [] });
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState({ torrents: false, files: false });
  const [showPlansModal, setShowPlansModal] = useState(false);

  // Track previous torrent state for detecting changes
  const prevDoneRef = useRef(new Set());

  async function fetchTorrents() {
    //console.log('🔄 App: fetchTorrents called');
    setLoading((prev) => ({ ...prev, torrents: true }));
    try {
      //console.log('📡 App: Calling listTorrents API...');
      const data = await listTorrents();
      // console.log('📊 App: Received torrents data:', {
      //   isArray: Array.isArray(data),
      //   length: Array.isArray(data) ? data.length : 'N/A',
      //   data: data
      // });
      setTorrents(Array.isArray(data) ? data : []);
      //console.log('✅ App: Torrents state updated');
    } catch (err) {
      console.error("❌ App: Torrents fetch error:", err);
    } finally {
      setLoading((prev) => ({ ...prev, torrents: false }));
    }
  }

  async function fetchBrowse(path = currentPath) {
    setLoading((prev) => ({ ...prev, files: true }));
    try {
      const data = await browse(path);
      setBrowseData(data);
    } catch (err) {
      console.error("Browse fetch error:", err);
    } finally {
      setLoading((prev) => ({ ...prev, files: false }));
    }
  }

  function navigateToPath(path) {
    setCurrentPath(path);
    fetchBrowse(path); // on-demand (no polling)
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  async function handleTorrentAdded() {
    //console.log('🎯 App: handleTorrentAdded called');
    await fetchTorrents();
    fetchDetailedQuota(); // Refresh quota when torrent is added
    //console.log('✅ App: handleTorrentAdded completed');
    // No complex logic needed - just fetch torrents once like in working backup
  }

  // Initial load and refresh when path changes
  useEffect(() => {
    // Skip fetching if user is admin (they'll see admin panel)
    if (user?.role === 'admin') return;

    // Skip fetching if admin view is active
    if (currentView === 'admin') return;

    fetchTorrents();
    fetchBrowse();
    fetchDetailedQuota(); // Fetch detailed quota information
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, currentView, user?.role]);

  // Monitor notifications for download completions and refresh file explorer
  useEffect(() => {
    // Skip if user is admin
    if (user?.role === 'admin') return;

    // Skip if admin view is active
    if (currentView === 'admin') return;

    const checkNotifications = async () => {
      try {
        const response = await getNotifications();
        const notifications = response.notifications || [];

        // Look for completion notifications
        const completionNotifications = notifications.filter(n => n.type === 'download_completed');

        if (completionNotifications.length > 0) {
          console.log(`🎉 ${completionNotifications.length} download(s) completed - refreshing file explorer`);

          // Refresh file explorer to show new files
          fetchBrowse();

          // Also refresh quota/storage info
          refreshUserProfile();
          fetchDetailedQuota();

          // Auto-clear completion notifications after processing
          for (const notification of completionNotifications) {
            try {
              await clearNotification(notification.id);
              console.log(`✅ Cleared completion notification for: ${notification.torrentName}`);
            } catch (error) {
              console.error('Failed to clear completion notification:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check notifications:', error);
      }
    };

    // Check notifications every 5 seconds
    const interval = setInterval(checkNotifications, 5000);

    // Also check immediately
    checkNotifications();

    return () => clearInterval(interval);
  }, [refreshUserProfile, fetchDetailedQuota, currentView]);

  // Detect when torrents complete and refresh data
  useEffect(() => {
    // Skip if user is admin
    if (user?.role === 'admin') return;

    // Skip if admin view is active
    if (currentView === 'admin') return;

    const currentDone = new Set(torrents.filter(t => t.progress === 100).map(t => t.id));
    const newlyDone = [...currentDone].filter(id => !prevDoneRef.current.has(id));

    if (newlyDone.length > 0) {
      console.log(`🎉 ${newlyDone.length} torrent(s) completed - refreshing data`);

      // Refresh user profile (quota/storage info)
      refreshUserProfile();
      fetchDetailedQuota(); // Also refresh detailed quota

      // Refresh file browser to show new files
      fetchBrowse();
    }

    prevDoneRef.current = currentDone;
  }, [torrents, refreshUserProfile, currentView]);

  // Simple polling — Poll when there are active downloads (like working backup)
  useEffect(() => {
    // Skip if user is admin
    if (user?.role === 'admin') return;

    // Skip if admin view is active
    if (currentView === 'admin') return;

    const hasActiveDownloads = torrents.some((t) => t.progress < 100);

    if (hasActiveDownloads) {
      const interval = setInterval(() => {
        fetchTorrents();
      }, 5000); // Poll every 5 seconds like in backup

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torrents, currentView]);

  // Refresh files when torrent count decreases (indicates completion and removal)
  useEffect(() => {
    // Skip if user is admin
    if (user?.role === 'admin') return;

    // Skip if admin view is active
    if (currentView === 'admin') return;

    const currentCount = torrents.length;
    const prevCount = prevDoneRef.current.size || 0;

    // If we have fewer torrents than before, likely one completed and was removed
    if (currentCount < prevCount) {
      //console.log("Torrent count decreased, refreshing files...");
      fetchBrowse(); // refresh files when torrents are removed (completed)
    }

    // Also refresh when any torrent reaches 100% (backup mechanism)
    const nowDone = new Set(torrents.filter((t) => t.progress === 100).map((t) => t.id));
    const newlyDone = [...nowDone].filter((id) => !prevDoneRef.current.has(id));
    if (newlyDone.length > 0) {
      //console.log("Torrent completed, refreshing files...");
      fetchBrowse(); // refresh files once
    }

    // Store current torrent IDs for next comparison
    prevDoneRef.current = new Set(torrents.map(t => t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torrents, currentView]);

  // Auto-redirect admin users to admin panel on first load
  useEffect(() => {
    if (user?.role === 'admin' && currentView === 'main') {
      setCurrentView('admin');
    }
  }, [user?.role, currentView]);

  // If admin view is active, show admin dashboard
  if (currentView === 'admin') {
    return <AdminDashboard onBackToMain={() => setCurrentView('main')} />;
  }

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
              <div className="ml-4 text-sm text-gray-400">Modern torrent client</div>
            </div>

            {/* User info and storage */}
            <div className="flex items-center space-x-6">
              {/* Storage Usage */}
              {(() => {
                const storageInfo = getStorageInfo();
                return storageInfo ? (
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-300">
                      <div className="flex items-center space-x-3">
                        <span>💾</span>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Total Quota</div>
                            <div className="font-medium text-blue-400">{storageInfo.quota}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Used Space</div>
                            <div className="font-medium text-orange-400">{storageInfo.used}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Available Space</div>
                            <div className="font-medium text-green-400">{storageInfo.available}</div>
                          </div>
                          {storageInfo.reserved && storageInfo.reserved !== '0 B' && (
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">Reserved</div>
                              <div className="font-medium text-yellow-400">{storageInfo.reserved}</div>
                            </div>
                          )}
                          {storageInfo.inProgress && storageInfo.inProgress !== '0 B' && (
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">In Progress</div>
                              <div className="font-medium text-purple-400">{storageInfo.inProgress}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Multi-segment storage bar */}
                      <div className="w-48 h-2 bg-gray-600 rounded-full mt-2 relative overflow-hidden">
                        {(() => {
                          if (!storageInfo.details) return null;

                          const { usedBytes, reservedBytes, quotaBytes } = storageInfo.details;
                          const totalUsed = usedBytes || 0;
                          const totalReserved = reservedBytes || 0; // All reserved space (including in-progress)

                          // Calculate percentages
                          const usedPercent = quotaBytes > 0 ? (totalUsed / quotaBytes) * 100 : 0;
                          const reservedPercent = quotaBytes > 0 ? (totalReserved / quotaBytes) * 100 : 0;

                          return (
                            <div className="flex h-full w-full">
                              {/* Used Space (completed files) */}
                              {usedPercent > 0 && (
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                                  style={{ width: `${Math.min(usedPercent, 100)}%` }}
                                  title={`Used: ${storageInfo.used}`}
                                />
                              )}

                              {/* Reserved Space (all reserved space including downloads) */}
                              {reservedPercent > 0 && (
                                <div
                                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-300"
                                  style={{ width: `${Math.min(reservedPercent, 100 - usedPercent)}%` }}
                                  title={`Reserved: ${storageInfo.reserved}`}
                                />
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Storage bar legend */}
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mr-1"></div>
                          <span>Used</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full mr-1"></div>
                          <span>Reserved</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gray-600 rounded-full mr-1"></div>
                          <span>Free</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Status indicators */}
              <div className="flex items-center space-x-4">
                {/* {loading.torrents && (
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
                )} */}
                <div className="flex items-center text-sm text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Online
                </div>
              </div>

              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-300">
                  Welcome, <span className="text-yellow-400 font-medium">{user?.username}</span>
                  {user?.role === 'admin' && (
                    <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setCurrentView('admin')}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-md transition-all font-semibold shadow-lg hover:shadow-xl"
                  >
                    🛡️ Admin Panel
                  </button>
                )}
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  ⬆️ Upgrade
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Torrents Section */}
        <section>
          <TorrentSection torrents={torrents} onTorrentAdded={handleTorrentAdded} />
        </section>

        {/* File Explorer Section */}
        <section>
          <FileExplorer
            browseData={browseData}
            currentPath={currentPath}
            onNavigate={navigateToPath}
            formatFileSize={formatFileSize}
            onFileDeleted={() => fetchBrowse()}
            onRefresh={() => fetchBrowse()}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/50 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>© 2024 Seedr-Lite • Built with React & Tailwind CSS</div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <span className="mr-1">⚡</span>
                {torrents.filter((t) => t.progress < 100).length} active
              </span>
              <span className="flex items-center">
                <span className="mr-1">✅</span>
                {torrents.filter((t) => t.progress === 100).length} completed
              </span>
              <span className="flex items-center">
                <span className="mr-1">📁</span>
                {browseData.files.length} files
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Plans Modal */}
      <PlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlan={user?.plan || 'free'}
        onUpgradeSuccess={async (response) => {
          console.log('Upgrade successful:', response);
          // Refresh user profile to get updated quota
          await refreshUserProfile();
          // Refresh detailed quota info
          await fetchDetailedQuota();
        }}
      />
    </div>
  );
}
