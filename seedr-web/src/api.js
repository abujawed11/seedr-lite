import axios from "axios";

// 👇 Change this to your server domain or IP
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

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

export async function browse(path = "") {
  const res = await api.get('/files/browse', { params: { path } });
  return res.data;
}

export async function stopTorrent(id) {
  return api.put(`/torrents/${id}/stop`);
}

export async function deleteTorrent(id) {
  return api.delete(`/torrents/${id}`);
}

export async function deleteFile(path) {
  return api.delete('/files/delete', { data: { path } });
}
