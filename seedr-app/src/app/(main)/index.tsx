import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function TorrentsScreen() {
  const { logout, user } = useAuth();

  return (
    <View className="flex-1 bg-gray-900 items-center justify-center gap-4">
      <Text className="text-yellow-400 text-lg font-bold">Torrents — Phase 3 in progress</Text>
      <Text className="text-gray-400 text-sm">Logged in as: {user?.username}</Text>
      <TouchableOpacity
        className="mt-4 px-6 py-3 bg-red-600 rounded-xl"
        onPress={logout}
      >
        <Text className="text-white font-bold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
