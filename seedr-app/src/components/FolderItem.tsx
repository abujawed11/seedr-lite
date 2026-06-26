import { View, Text, TouchableOpacity, Alert } from 'react-native';

interface Folder {
  path: string;
  name: string;
  size?: number;
}

interface Props {
  folder: Folder;
  onNavigate: (path: string) => void;
  onDelete: (path: string, name: string, type: string) => void;
  formatFileSize: (bytes: number) => string;
}

export default function FolderItem({ folder, onNavigate, onDelete, formatFileSize }: Props) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? This will permanently delete all files inside it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(folder.path, folder.name, 'directory'),
        },
      ]
    );
  };

  return (
    <View className="flex-row items-center bg-gray-800 rounded-xl border border-gray-700 px-4 py-3 mb-2">
      {/* Folder Icon + Name */}
      <TouchableOpacity
        className="flex-1 flex-row items-center"
        onPress={() => onNavigate(folder.path)}
        activeOpacity={0.7}
      >
        <Text className="text-2xl mr-3">📁</Text>
        <View className="flex-1">
          <Text className="text-white font-medium text-sm" numberOfLines={1}>
            {folder.name}
          </Text>
          {folder.size !== undefined && folder.size > 0 ? (
            <Text className="text-gray-400 text-xs mt-0.5">
              {formatFileSize(folder.size)}
            </Text>
          ) : null}
        </View>
        <Text className="text-gray-500 text-sm ml-2">›</Text>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        className="ml-3 p-2 bg-red-900/30 rounded-lg border border-red-700/30"
        onPress={handleDelete}
      >
        <Text className="text-red-400 text-xs">🗑</Text>
      </TouchableOpacity>
    </View>
  );
}
