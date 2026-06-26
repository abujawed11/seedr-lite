import { useState, useEffect, useRef, useCallback } from 'react';
import EventSource from 'react-native-sse';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listTorrents, getNotifications } from '../api';
import { API_BASE_URL } from '../constants/config';

export interface TorrentFile {
  index: number;
  name: string;
  length: number;
}

export interface Torrent {
  id: string;
  gid: string;
  name: string;
  progress: number;
  downloaded: string;
  length: string;
  numPeers: number;
  status: 'downloading' | 'paused' | 'stopped' | 'completed';
  files: TorrentFile[];
}

export interface Notification {
  id: string;
  type: string;
  torrentName: string;
  torrentSize: string;
  availableSpace: string;
  timestamp: string;
}

export function useTorrents() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const esRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseFailedRef = useRef(false);

  const fetchTorrents = useCallback(async () => {
    try {
      const data = await listTorrents();
      setTorrents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch torrents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.notifications || []);
    } catch {
      // non-fatal
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(fetchTorrents, 5000);
  }, [fetchTorrents]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const connectSSE = useCallback(async () => {
    const token = await AsyncStorage.getItem('seedr_token');
    if (!token) return;

    const url = `${API_BASE_URL}/api/torrents/events?token=${encodeURIComponent(token)}`;

    esRef.current = new EventSource(url);

    esRef.current.addEventListener('torrent_update', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setTorrents(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch {}
    });

    esRef.current.addEventListener('notification', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setNotifications(prev => {
          if (prev.some(n => n.id === data.id)) return prev;
          const updated = [...prev, data];
          return updated.length > 20 ? updated.slice(-20) : updated;
        });
      } catch {}
    });

    esRef.current.addEventListener('error', () => {
      // SSE failed — fall back to polling
      if (!sseFailedRef.current) {
        sseFailedRef.current = true;
        esRef.current?.close();
        esRef.current = null;
        startPolling();
      }
    });
  }, [startPolling]);

  useEffect(() => {
    fetchTorrents();
    fetchNotifications();
    connectSSE();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      stopPolling();
    };
  }, []);

  const refresh = useCallback(() => {
    fetchTorrents();
  }, [fetchTorrents]);

  return {
    torrents,
    setTorrents,
    notifications,
    setNotifications,
    loading,
    refresh,
  };
}
