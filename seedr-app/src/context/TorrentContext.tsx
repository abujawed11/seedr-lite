import { createContext, useContext, ReactNode } from 'react';
import { useTorrents, Torrent, Notification } from '../hooks/useTorrents';

interface TorrentContextType {
  torrents: Torrent[];
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
  loading: boolean;
  refresh: () => void;
}

const TorrentContext = createContext<TorrentContextType | undefined>(undefined);

export const useTorrentContext = () => {
  const ctx = useContext(TorrentContext);
  if (!ctx) throw new Error('useTorrentContext must be used within TorrentProvider');
  return ctx;
};

export const TorrentProvider = ({ children }: { children: ReactNode }) => {
  const torrentState = useTorrents();

  return (
    <TorrentContext.Provider value={torrentState}>
      {children}
    </TorrentContext.Provider>
  );
};
