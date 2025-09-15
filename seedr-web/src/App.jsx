// import { useState, useEffect } from "react";
// import { addTorrent, listTorrents } from "./api";

// export default function App() {
//   const [magnet, setMagnet] = useState("");
//   const [torrents, setTorrents] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [files, setFiles] = useState([]);   // 👈 added

//   async function handleAddTorrent(e) {
//     e.preventDefault();
//     if (!magnet) return;
//     setLoading(true);
//     try {
//       await addTorrent(magnet);
//       setMagnet("");
//       fetchTorrents();
//     } catch (err) {
//       console.error(err);
//       alert("Failed to add torrent");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function fetchTorrents() {
//     try {
//       const data = await listTorrents();
//       setTorrents(data);
//     } catch (err) {
//       console.error("fetch error", err);
//     }
//   }

//     async function fetchFiles() {
//     try {
//       const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/files`);
//       setFiles(await res.json());
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   useEffect(() => {
//     fetchTorrents();
//      fetchFiles();
//     const id = setInterval(fetchTorrents, 5000); // poll every 5s
//     return () => clearInterval(id);
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-900 text-white p-6">
//       <h1 className="text-3xl font-bold mb-6 text-yellow-400">Seedr-Lite</h1>

//       {/* Magnet form */}
//       <form onSubmit={handleAddTorrent} className="flex gap-2 mb-6">
//         <input
//           type="text"
//           placeholder="Paste magnet link..."
//           value={magnet}
//           onChange={(e) => setMagnet(e.target.value)}
//           className="flex-1 px-3 py-2 rounded-md text-black"
//         />
//         <button
//           type="submit"
//           disabled={loading}
//           className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-md font-semibold"
//         >
//           {loading ? "Adding..." : "Add"}
//         </button>
//       </form>

//       {/* Torrent list */}
//       <div className="space-y-4">
//         {torrents.length === 0 && (
//           <p className="text-gray-400">No torrents yet.</p>
//         )}
//         {torrents.map((t) => (
//           <div
//             key={t.id}
//             className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700"
//           >
//             <h2 className="text-lg font-bold text-yellow-300">{t.name || t.id}</h2>
//             <p className="text-sm text-gray-400">
//               {t.progress}% • {t.downloaded} / {t.length} • {t.numPeers} peers
//             </p>
//             <div className="w-full bg-gray-700 h-2 rounded mt-2">
//               <div
//                 className="bg-yellow-500 h-2 rounded"
//                 style={{ width: `${t.progress}%` }}
//               />
//             </div>

//             {/* Files */}
//             <div className="mt-3 space-y-1">
//               {t.files?.map((f) => (
//                 <div
//                   key={f.index}
//                   className="flex justify-between items-center text-sm bg-gray-700 p-2 rounded"
//                 >
//                   <span>{f.name}</span>
//                   <div className="flex gap-2">
//                     <a
//                       href={f.streamUrl}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="px-2 py-1 bg-blue-500 rounded hover:bg-blue-600"
//                     >
//                       ▶ Stream
//                     </a>
//                     <a
//                       href={f.downloadUrl}
//                       className="px-2 py-1 bg-green-500 rounded hover:bg-green-600"
//                     >
//                       ⬇ Download
//                     </a>
//                     <button
//                       onClick={() => {
//                         navigator.clipboard.writeText(f.directUrl);
//                         alert("Direct link copied!");
//                       }}
//                       className="px-2 py-1 bg-gray-500 rounded hover:bg-gray-600"
//                     >
//                       🔗 Copy
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }





import { useState, useEffect } from "react";
import { addTorrent, listTorrents, browse } from "./api";

export default function App() {
  const [magnet, setMagnet] = useState("");
  const [torrents, setTorrents] = useState([]);
  const [browseData, setBrowseData] = useState({ cwd: "", parent: null, dirs: [], files: [] });
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAddTorrent(e) {
    e.preventDefault();
    if (!magnet.trim()) return;
    setLoading(true);
    try {
      await addTorrent(magnet.trim());
      setMagnet("");
      await Promise.all([fetchTorrents(), fetchBrowse()]);
    } catch (err) {
      console.error(err);
      alert("Failed to add torrent");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTorrents() {
    try {
      const data = await listTorrents();
      setTorrents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("torrents fetch error", err);
    }
  }

  async function fetchBrowse(path = currentPath) {
    try {
      const data = await browse(path);
      setBrowseData(data);
    } catch (err) {
      console.error("browse fetch error", err);
    }
  }

  function navigateToPath(path) {
    setCurrentPath(path);
    fetchBrowse(path);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getBreadcrumbs() {
    if (!currentPath) return [{ name: "Home", path: "" }];
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: "Home", path: "" }];

    let buildPath = "";
    for (const part of parts) {
      buildPath = buildPath ? `${buildPath}/${part}` : part;
      breadcrumbs.push({ name: part, path: buildPath });
    }

    return breadcrumbs;
  }

  useEffect(() => {
    // initial load
    fetchTorrents();
    fetchBrowse();
    // poll both every 5s
    const id = setInterval(() => {
      fetchTorrents();
      fetchBrowse();
    }, 5000);
    return () => clearInterval(id);
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">Seedr-Lite</h1>

      {/* Magnet form */}
      <form onSubmit={handleAddTorrent} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Paste magnet link..."
          value={magnet}
          onChange={(e) => setMagnet(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md text-black outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 px-4 py-2 rounded-md font-semibold"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {/* Active / downloading torrents */}
      <div className="space-y-4">
        {torrents.length === 0 && (
          <p className="text-gray-400">No active torrents.</p>
        )}

        {torrents.map((t) => (
          <div
            key={t.id}
            className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-yellow-300 truncate">
                {t.name || t.id}
              </h2>
              <span className="text-sm text-gray-400 whitespace-nowrap">
                {t.progress}% • {t.downloaded} / {t.length} • {t.numPeers} peers
              </span>
            </div>

            <div className="w-full bg-gray-700 h-2 rounded mt-2">
              <div
                className="bg-yellow-500 h-2 rounded"
                style={{ width: `${t.progress || 0}%` }}
              />
            </div>

            {/* Files */}
            {Array.isArray(t.files) && t.files.length > 0 && (
              <div className="mt-3 space-y-1">
                {t.files.map((f) => (
                  <div
                    key={f.index}
                    className="flex justify-between items-center text-sm bg-gray-700 p-2 rounded"
                  >
                    <span className="truncate">{f.name}</span>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={f.streamUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-blue-500 rounded hover:bg-blue-600"
                      >
                        ▶ Stream
                      </a>
                      <a
                        href={f.downloadUrl}
                        className="px-2 py-1 bg-green-500 rounded hover:bg-green-600"
                      >
                        ⬇ Download
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(f.directUrl || "");
                          alert("Direct link copied!");
                        }}
                        className="px-2 py-1 bg-gray-500 rounded hover:bg-gray-600"
                      >
                        🔗 Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File Explorer */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-yellow-400 mb-3">
          File Explorer
        </h2>

        {/* Breadcrumbs */}
        <div className="mb-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              {getBreadcrumbs().map((crumb, index) => (
                <li key={crumb.path} className="flex items-center">
                  {index > 0 && <span className="text-gray-500 mr-2">/</span>}
                  <button
                    onClick={() => navigateToPath(crumb.path)}
                    className="text-yellow-400 hover:text-yellow-300 font-medium"
                  >
                    {crumb.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Folders */}
        {browseData.dirs.length > 0 && (
          <div className="mb-4 space-y-1">
            {browseData.dirs.map((dir) => (
              <div
                key={dir.path}
                className="flex items-center p-3 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
                onClick={() => navigateToPath(dir.path)}
              >
                <span className="text-blue-400 mr-3">📁</span>
                <span className="font-medium">{dir.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Files */}
        {browseData.files.length > 0 ? (
          <div className="space-y-1">
            {browseData.files.map((file) => (
              <div
                key={file.path}
                className="flex items-center justify-between bg-gray-800 p-3 rounded hover:bg-gray-700"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-gray-400 mr-3">📄</span>
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-sm text-gray-400 ml-3 shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <a
                    href={file.streamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 text-sm font-medium"
                  >
                    ▶ Play
                  </a>
                  <a
                    href={file.downloadUrl}
                    className="px-3 py-1 bg-green-500 rounded hover:bg-green-600 text-sm font-medium"
                  >
                    ⬇ Download
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(file.directUrl);
                      alert("Direct link copied!");
                    }}
                    className="px-3 py-1 bg-gray-500 rounded hover:bg-gray-600 text-sm font-medium"
                  >
                    🔗 Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : browseData.dirs.length === 0 ? (
          <p className="text-gray-400">No files or folders in this directory.</p>
        ) : null}
      </div>
    </div>
  );
}

