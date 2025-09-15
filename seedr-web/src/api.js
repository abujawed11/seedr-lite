import axios from "axios";

// 👇 Change this to your server domain or IP
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5080";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

export async function addTorrent(magnet) {
  return api.post("/torrents", { magnet });
}

export async function listTorrents() {
  const res = await api.get("/torrents");
  return res.data;
}

export async function getTorrent(id) {
  const res = await api.get(`/torrents/${id}`);
  return res.data;
}
