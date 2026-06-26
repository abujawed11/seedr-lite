import { View, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTorrentContext } from '../../context/TorrentContext';
import TorrentSection from '../../components/TorrentSection';

export default function TorrentsScreen() {
  const { fetchDetailedQuota } = useAuth();
  const { torrents, loading, notifications, setNotifications, refresh } = useTorrentContext();
  const insets = useSafeAreaInsets();

  const handleTorrentAdded = () => {
    refresh();
    fetchDetailedQuota();
  };

  return (
    <View className="flex-1 bg-gray-900" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#eab308"
            colors={['#eab308']}
          />
        }
      >
        <TorrentSection
          torrents={torrents}
          loading={loading}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onTorrentAdded={handleTorrentAdded}
        />
      </ScrollView>
    </View>
  );
}
