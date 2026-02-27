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
  const [notifications, setNotifications] = useState([]);

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

  // SSE connection — replaces all polling intervals.
  // Receives torrent_update (every 3s server-side poll) and notification (instant push).
  useEffect(() => {
    if (user?.role === 'admin' || currentView === 'admin') return;

    const token = localStorage.getItem('seedr_token');
    if (!token) return;

    // One-time fetch of any notifications that existed before SSE connected
    getNotifications()
      .then(r => setNotifications(r.notifications || []))
      .catch(() => {});

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    const url = `${API_BASE}/api/torrents/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener('torrent_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        setTorrents(Array.isArray(data) ? data : []);
      } catch (_) {}
    });

    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        // Append to notifications list (TorrentSection displays quota_exceeded ones)
        setNotifications(prev => {
          if (prev.some(n => n.id === data.id)) return prev; // dedupe
          const updated = [...prev, data];
          return updated.length > 20 ? updated.slice(-20) : updated;
        });
        if (data.type === 'download_completed') {
          console.log(`🎉 Download complete via SSE: ${data.torrentName}`);
          fetchBrowse();
          refreshUserProfile();
          fetchDetailedQuota();
        }
      } catch (_) {}
    });

    es.onerror = () => {
      // EventSource reconnects automatically — no manual action needed
    };

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, user?.role]);

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

  // Listen for navbar events
  useEffect(() => {
    const handleShowPlansModal = () => setShowPlansModal(true);
    const handleShowAdminPanel = () => setCurrentView('admin');

    window.addEventListener('showPlansModal', handleShowPlansModal);
    window.addEventListener('showAdminPanel', handleShowAdminPanel);

    return () => {
      window.removeEventListener('showPlansModal', handleShowPlansModal);
      window.removeEventListener('showAdminPanel', handleShowAdminPanel);
    };
  }, []);

  // If admin view is active, show admin dashboard
  if (currentView === 'admin') {
    return <AdminDashboard onBackToMain={() => setCurrentView('main')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Torrents Section */}
        <section>
          <TorrentSection
            torrents={torrents}
            onTorrentAdded={handleTorrentAdded}
            notifications={notifications}
            onNotificationsChange={setNotifications}
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
            onRefresh={() => fetchBrowse()}
          />
        </section>
      </main>

      {/* Footer with Stats */}
      <footer className="bg-gray-800/50 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>© 2025 MyPeerCloud • Built with React & Tailwind CSS</div>
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
