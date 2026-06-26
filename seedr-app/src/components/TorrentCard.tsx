import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { pauseTorrent, resumeTorrent, stopTorrent, deleteTorrent } from '../api';
import { Torrent } from '../hooks/useTorrents';

interface Props {
  torrent: Torrent;
  onUpdated: () => void;
}

export default function TorrentCard({ torrent, onUpdated }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isComplete = torrent.progress === 100;
  const isConnecting = torrent.progress === 0 && torrent.numPeers === 0;
  const isInitializing = torrent.name === 'Loading...';

  const handleAction = async (action: (id: string) => Promise<any>, name: string) => {
    setActionLoading(name);
    try {
      await action(torrent.id);
      onUpdated();
    } catch {
      Alert.alert('Error', `Failed to ${name} torrent`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Torrent',
      `Are you sure you want to delete "${torrent.name || torrent.id}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleAction(deleteTorrent, 'delete'),
        },
      ]
    );
  };

  const hasFiles = Array.isArray(torrent.files) && torrent.files.length > 0;

  const borderColor = isComplete
    ? 'border-green-500/60'
    : isInitializing || isConnecting
    ? 'border-yellow-500/50'
    : 'border-gray-700';

  return (
    <View className={`bg-gray-800 rounded-xl border ${borderColor} overflow-hidden mb-3`}>

      {/* Header */}
      <View className="p-4">
        {/* Name + Status Badge */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            {isInitializing ? (
              <View className="flex-row items-center">
                <Text className="text-yellow-300 font-semibold text-base">Initializing torrent...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base" numberOfLines={2}>
                {torrent.name || torrent.id}
              </Text>
            )}
          </View>

          {/* Status Badge */}
          <View className={`px-2.5 py-1 rounded-full ${
            isComplete ? 'bg-green-900' :
            torrent.status === 'paused' ? 'bg-gray-700' :
            isConnecting ? 'bg-blue-900' : 'bg-yellow-900'
          }`}>
            <Text className={`text-xs font-medium ${
              isComplete ? 'text-green-300' :
              torrent.status === 'paused' ? 'text-gray-300' :
              isConnecting ? 'text-blue-300' : 'text-yellow-300'
            }`}>
              {isComplete ? '✅ Done' :
               torrent.status === 'paused' ? '⏸ Paused' :
               isConnecting ? '🔍 Connecting' : '📥 Downloading'}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row items-center space-x-4 mb-3">
          <Text className="text-gray-400 text-xs">📊 {torrent.progress}%</Text>
          <Text className="text-gray-400 text-xs">💾 {torrent.downloaded} / {torrent.length}</Text>
          <Text className="text-gray-400 text-xs">👥 {torrent.numPeers} peers</Text>
        </View>

        {/* Progress Bar */}
        <View className="w-full bg-gray-700 h-2 rounded-full mb-3">
          {isConnecting ? (
            <View className="h-2 rounded-full bg-blue-500 w-1/5" />
          ) : (
            <View
              className={`h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${torrent.progress || 0}%` }}
            />
          )}
        </View>

        {/* Controls */}
        {!isComplete && (
          <View className="flex-row items-center space-x-2">
            {/* Pause / Resume */}
            {torrent.status === 'paused' ? (
              <TouchableOpacity
                className="flex-row items-center px-3 py-1.5 bg-green-800/50 rounded-lg border border-green-700/50"
                onPress={() => handleAction(resumeTorrent, 'resume')}
                disabled={!!actionLoading}
              >
                <Text className="text-green-400 text-xs font-medium">
                  {actionLoading === 'resume' ? '...' : '▶ Resume'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-row items-center px-3 py-1.5 bg-gray-700 rounded-lg border border-gray-600"
                onPress={() => handleAction(pauseTorrent, 'pause')}
                disabled={!!actionLoading || isInitializing}
              >
                <Text className="text-gray-300 text-xs font-medium">
                  {actionLoading === 'pause' ? '...' : '⏸ Pause'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Stop */}
            <TouchableOpacity
              className="flex-row items-center px-3 py-1.5 bg-gray-700 rounded-lg border border-gray-600"
              onPress={() => handleAction(stopTorrent, 'stop')}
              disabled={!!actionLoading}
            >
              <Text className="text-gray-300 text-xs font-medium">
                {actionLoading === 'stop' ? '...' : '⏹ Stop'}
              </Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              className="flex-row items-center px-3 py-1.5 bg-red-900/40 rounded-lg border border-red-700/50"
              onPress={handleDelete}
              disabled={!!actionLoading}
            >
              <Text className="text-red-400 text-xs font-medium">
                {actionLoading === 'delete' ? '...' : '🗑 Delete'}
              </Text>
            </TouchableOpacity>

            {/* Expand files */}
            {hasFiles && (
              <TouchableOpacity
                className="ml-auto px-3 py-1.5"
                onPress={() => setIsExpanded(v => !v)}
              >
                <Text className="text-gray-400 text-xs">{isExpanded ? '▲ Hide' : '▼ Files'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Files List */}
      {hasFiles && isExpanded && (
        <View className="border-t border-gray-700 px-4 py-3">
          <Text className="text-gray-300 text-sm font-medium mb-2">
            📁 Files ({torrent.files.length})
          </Text>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {torrent.files.map((file) => (
              <View
                key={file.index}
                className="flex-row items-center justify-between py-2 border-b border-gray-700/50"
              >
                <Text className="text-white text-xs flex-1 mr-2" numberOfLines={1}>
                  📄 {file.name}
                </Text>
                <Text className="text-gray-500 text-xs flex-shrink-0">
                  {file.length ? `${(file.length / 1024 / 1024).toFixed(1)} MB` : ''}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
