import axios from "axios";

// 👇 Change this to your server domain or IP
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('seedr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('seedr_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

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

// Auth functions
export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function register(username, email, password) {
  const res = await api.post('/auth/register', { username, email, password });
  return res.data;
}

export async function getUserProfile() {
  const res = await api.get('/auth/profile');
  return res.data;
}
