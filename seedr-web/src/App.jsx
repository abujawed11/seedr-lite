import { useState, useEffect } from "react";
import { addTorrent, listTorrents } from "./api";

export default function App() {
  const [magnet, setMagnet] = useState("");
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleAddTorrent(e) {
    e.preventDefault();
    if (!magnet) return;
    setLoading(true);
    try {
      await addTorrent(magnet);
      setMagnet("");
      fetchTorrents();
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
      setTorrents(data);
    } catch (err) {
      console.error("fetch error", err);
    }
  }

  useEffect(() => {
    fetchTorrents();
    const id = setInterval(fetchTorrents, 5000); // poll every 5s
    return () => clearInterval(id);
  }, []);

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
          className="flex-1 px-3 py-2 rounded-md text-black"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-md font-semibold"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {/* Torrent list */}
      <div className="space-y-4">
        {torrents.length === 0 && (
          <p className="text-gray-400">No torrents yet.</p>
        )}
        {torrents.map((t) => (
          <div
            key={t.id}
            className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700"
          >
            <h2 className="text-lg font-bold text-yellow-300">{t.name || t.id}</h2>
            <p className="text-sm text-gray-400">
              {t.progress}% • {t.downloaded} / {t.length} • {t.numPeers} peers
            </p>
            <div className="w-full bg-gray-700 h-2 rounded mt-2">
              <div
                className="bg-yellow-500 h-2 rounded"
                style={{ width: `${t.progress}%` }}
              />
            </div>

            {/* Files */}
            <div className="mt-3 space-y-1">
              {t.files?.map((f) => (
                <div
                  key={f.index}
                  className="flex justify-between items-center text-sm bg-gray-700 p-2 rounded"
                >
                  <span>{f.name}</span>
                  <div className="flex gap-2">
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
                        navigator.clipboard.writeText(f.directUrl);
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
          </div>
        ))}
      </div>
    </div>
  );
}
