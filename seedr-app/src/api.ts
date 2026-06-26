import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './constants/config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('seedr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors — token expired or invalid
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url;
      // Don't clear token for login/register attempts
      if (url && (url.includes('/auth/login') || url.includes('/auth/register'))) {
        return Promise.reject(error);
      }
      // Clear token for other 401s (expired session)
      await AsyncStorage.removeItem('seedr_token');
      // Navigation reset is handled by AuthContext watching the token state
    }
    return Promise.reject(error);
  }
);

// ==================== Torrents ====================

export async function addTorrent(magnet: string) {
  return api.post('/torrents', { magnet });
}

export async function addTorrentFile(fileUri: string, fileName: string) {
  const formData = new FormData();
  formData.append('torrent', { uri: fileUri, name: fileName, type: 'application/x-bittorrent' } as any);
  return api.post('/torrents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function listTorrents() {
  const res = await api.get('/torrents');
  return res.data;
}

export async function getTorrent(id: string) {
  const res = await api.get(`/torrents/${id}`);
  return res.data;
}

export async function stopTorrent(id: string) {
  return api.put(`/torrents/${id}/stop`);
}

export async function pauseTorrent(id: string) {
  return api.put(`/torrents/${id}/pause`);
}

export async function resumeTorrent(id: string) {
  return api.put(`/torrents/${id}/resume`);
}

export async function deleteTorrent(id: string) {
  return api.delete(`/torrents/${id}`);
}

// ==================== Files ====================

export async function browse(path = '') {
  const res = await api.get('/files/browse', { params: { path } });
  return res.data;
}

export async function deleteFile(path: string) {
  return api.delete('/files/delete', { data: { path } });
}

// ==================== Auth ====================

export async function login(username: string, password: string) {
  const res = await api.post('/auth/login', { username, password });
  return res.data;
}

export async function register(
  username: string,
  email: string,
  password: string,
  ageConfirmed: boolean,
  termsAccepted: boolean,
  privacyAccepted: boolean
) {
  const res = await api.post('/auth/register', {
    username,
    email,
    password,
    ageConfirmed,
    termsAccepted,
    privacyAccepted,
  });
  return res.data;
}

export async function logout() {
  const res = await api.post('/auth/logout');
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

export async function getMySubscription() {
  const res = await api.get('/auth/subscription');
  return res.data;
}

// ==================== Notifications ====================

export async function getNotifications() {
  const res = await api.get('/torrents/notifications');
  return res.data;
}

export async function clearNotification(notificationId: string) {
  const res = await api.delete(`/torrents/notifications/${notificationId}`);
  return res.data;
}

export async function clearAllNotifications() {
  const res = await api.delete('/torrents/notifications');
  return res.data;
}

// ==================== Plans ====================

export async function getPlans() {
  const res = await api.get('/plans');
  return res.data;
}

export async function getCurrentPlan() {
  const res = await api.get('/plans/current');
  return res.data;
}

export async function submitUpgradeRequest(planId: string, userDetails: object) {
  const res = await api.post('/plans/upgrade-request', { planId, ...userDetails });
  return res.data;
}

export async function getMyUpgradeRequests() {
  const res = await api.get('/plans/my-requests');
  return res.data;
}

// ==================== Password Reset ====================

export async function forgotPassword(email: string) {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

export async function verifyResetOTP(email: string, otp: string) {
  const res = await api.post('/auth/verify-reset-otp', { email, otp });
  return res.data;
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const res = await api.post('/auth/reset-password', { email, otp, newPassword });
  return res.data;
}

// ==================== Payment ====================

export async function getPaymentHistory(limit = 20) {
  const res = await api.get('/payment/history', { params: { limit } });
  return res.data;
}
