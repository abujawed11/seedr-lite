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
    // Only handle 401 errors for authenticated requests (not login attempts)
    if (error.response?.status === 401) {
      const url = error.config?.url;

      // Don't reload page for login attempts - let the login form handle the error
      if (url && (url.includes('/auth/login') || url.includes('/auth/register'))) {
        return Promise.reject(error);
      }

      // For other 401 errors (expired tokens, etc.), clear token and reload
      localStorage.removeItem('seedr_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Removed inspect functionality - using direct torrent adding for simplicity and speed
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
export async function login(username, password) {
  const res = await api.post('/auth/login', { username, password });
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

export async function getQuotaInfo() {
  const res = await api.get('/torrents/quota');
  return res.data;
}

// Notification functions
export async function getNotifications() {
  const res = await api.get('/torrents/notifications');
  return res.data;
}

export async function clearNotification(notificationId) {
  const res = await api.delete(`/torrents/notifications/${notificationId}`);
  return res.data;
}

export async function clearAllNotifications() {
  const res = await api.delete('/torrents/notifications');
  return res.data;
}

// Plans and upgrade functions
export async function getPlans() {
  const res = await api.get('/plans');
  return res.data;
}

export async function getCurrentPlan() {
  const res = await api.get('/plans/current');
  return res.data;
}

export async function submitUpgradeRequest(planId, userDetails) {
  // userDetails should include: fullName, email, phone, address, duration
  const res = await api.post('/plans/upgrade-request', {
    planId,
    ...userDetails
  });
  return res.data;
}

export async function getMyUpgradeRequests() {
  const res = await api.get('/plans/my-requests');
  return res.data;
}

// Admin functions
export async function getAllUsers() {
  const res = await api.get('/admin/users');
  return res.data;
}

export async function getAdminStats() {
  const res = await api.get('/admin/stats');
  return res.data;
}

export async function getAllUpgradeRequests(status = null) {
  const params = status ? { status } : {};
  const res = await api.get('/admin/upgrade-requests', { params });
  return res.data;
}

export async function approveUpgradeRequest(requestId, adminNotes) {
  const res = await api.post(`/admin/upgrade-requests/${requestId}/approve`, { adminNotes });
  return res.data;
}

export async function rejectUpgradeRequest(requestId, adminNotes) {
  const res = await api.post(`/admin/upgrade-requests/${requestId}/reject`, { adminNotes });
  return res.data;
}

export async function updateUserQuota(userId, quota, plan, maxDownloads, forceDowngrade = false) {
  const res = await api.put(`/admin/users/${userId}/quota`, { quota, plan, maxDownloads, forceDowngrade });
  return res.data;
}

export async function updateUserStatus(userId, isActive) {
  const res = await api.put(`/admin/users/${userId}/status`, { isActive });
  return res.data;
}

export async function updateUserMaxDownloads(userId, maxDownloads) {
  const res = await api.put(`/admin/users/${userId}/max-downloads`, { maxDownloads });
  return res.data;
}

export async function deleteUser(userId) {
  const res = await api.delete(`/admin/users/${userId}`);
  return res.data;
}
