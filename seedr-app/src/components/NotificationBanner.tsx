import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { clearNotification, clearAllNotifications } from '../api';
import { Notification } from '../hooks/useTorrents';

interface Props {
  notifications: Notification[];
  onNotificationsChange: (notifications: Notification[]) => void;
}

export default function NotificationBanner({ notifications, onNotificationsChange }: Props) {
  const quotaExceeded = notifications.filter(n => n.type === 'quota_exceeded');

  if (quotaExceeded.length === 0) return null;

  const handleClear = async (id: string) => {
    try {
      await clearNotification(id);
      onNotificationsChange(notifications.filter(n => n.id !== id));
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      onNotificationsChange([]);
    } catch {}
  };

  return (
    <View className="space-y-3 mb-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text className="text-red-400 font-semibold text-base">
          🚨 Quota Exceeded ({quotaExceeded.length})
        </Text>
        {quotaExceeded.length > 1 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text className="text-gray-400 text-sm">Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {quotaExceeded.map((n) => (
        <View
          key={n.id}
          className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 flex-row items-start justify-between"
        >
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="text-red-300 font-medium">⚠️ Torrent Removed — Quota Exceeded</Text>
            </View>
            <Text className="text-red-200 text-sm">Torrent: {n.torrentName}</Text>
            <Text className="text-red-200 text-sm">Size: {n.torrentSize}</Text>
            <Text className="text-red-200 text-sm">Available: {n.availableSpace}</Text>
            <Text className="text-red-300/60 text-xs mt-1">
              {new Date(n.timestamp).toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            className="ml-3 p-1.5 rounded-lg bg-red-800/30"
            onPress={() => handleClear(n.id)}
          >
            <Text className="text-red-400 text-xs font-bold">✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
