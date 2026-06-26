import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { addTorrent, addTorrentFile } from '../api';
import { Torrent, Notification } from '../hooks/useTorrents';
import TorrentCard from './TorrentCard';
import NotificationBanner from './NotificationBanner';

interface Props {
  torrents: Torrent[];
  loading: boolean;
  notifications: Notification[];
  onNotificationsChange: (n: Notification[]) => void;
  onTorrentAdded: () => void;
}

export default function TorrentSection({ torrents, loading, notifications, onNotificationsChange, onTorrentAdded }: Props) {
  const [magnet, setMagnet] = useState('');
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const [addError, setAddError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [warningExpanded, setWarningExpanded] = useState(false);

  const handleAddMagnet = async () => {
    if (!magnet.trim()) return;
    if (!magnet.trim().startsWith('magnet:')) {
      setAddError('Please enter a valid magnet link');
      setAddState('error');
      return;
    }

    setAddState('adding');
    setAddError('');

    try {
      await addTorrent(magnet.trim());
      setAddState('added');
      setMagnet('');
      onTorrentAdded();
      setTimeout(() => setAddState('idle'), 2000);
    } catch (err: any) {
      const msg =
        err.response?.data?.code === 'ACCOUNT_DISABLED'
          ? err.response.data.message
          : err.response?.data?.error || 'Failed to add torrent';
      setAddError(msg);
      setAddState('error');
      setTimeout(() => setAddState('idle'), 4000);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      if (!file.name.endsWith('.torrent')) {
        Alert.alert('Invalid File', 'Please select a valid .torrent file');
        return;
      }

      setUploading(true);
      await addTorrentFile(file.uri, file.name);
      onTorrentAdded();
    } catch (err: any) {
      Alert.alert('Upload Failed', err.response?.data?.error || 'Failed to upload torrent file');
    } finally {
      setUploading(false);
    }
  };

  const canAdd = magnet.trim().startsWith('magnet:') && addState !== 'adding';

  return (
    <View className="flex-1">
      {/* Notifications */}
      <NotificationBanner
        notifications={notifications}
        onNotificationsChange={onNotificationsChange}
      />

      {/* Copyright Warning */}
      <View className="bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg overflow-hidden mb-4">
        <TouchableOpacity
          className="px-4 py-3 flex-row items-center justify-between"
          onPress={() => setWarningExpanded(!warningExpanded)}
        >
          <Text className="text-yellow-300 text-sm font-medium flex-1 mr-2" numberOfLines={1}>
            ⚖️ Copyright Notice — tap to {warningExpanded ? 'collapse' : 'expand'}
          </Text>
          <Text className="text-yellow-400">{warningExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {warningExpanded && (
          <View className="px-4 pb-4 border-t border-yellow-600/30">
            <Text className="text-yellow-200/90 text-sm leading-relaxed mt-2">
              You are <Text className="font-bold text-yellow-100">solely responsible</Text> for ensuring you have the legal right to download content. Downloading copyrighted material without permission is illegal.
            </Text>
          </View>
        )}
      </View>

      {/* Add Torrent Box */}
      <View className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-4">
        <Text className="text-yellow-400 text-lg font-semibold mb-4">⚡ Add New Torrent</Text>

        {/* Magnet Input */}
        <View className="flex-row gap-2 mb-3">
          <TextInput
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm"
            placeholder="magnet:?xt=urn:btih:..."
            placeholderTextColor="#6b7280"
            value={magnet}
            onChangeText={(v) => { setMagnet(v); setAddState('idle'); setAddError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
          />
          <TouchableOpacity
            className={`px-4 py-3 rounded-xl items-center justify-center min-w-[80px] ${
              addState === 'added' ? 'bg-green-500' :
              canAdd ? 'bg-yellow-500' : 'bg-gray-600'
            }`}
            onPress={handleAddMagnet}
            disabled={!canAdd}
          >
            {addState === 'adding' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className={`font-bold text-sm ${addState === 'added' ? 'text-white' : canAdd ? 'text-gray-900' : 'text-gray-400'}`}>
                {addState === 'added' ? '✓ Added' : 'Add'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {addState === 'error' && addError ? (
          <View className="mb-3 p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
            <Text className="text-red-400 text-xs">{addError}</Text>
          </View>
        ) : null}

        {/* Upload Torrent File */}
        <TouchableOpacity
          className={`w-full py-3 border-2 border-dashed rounded-xl items-center ${
            uploading ? 'border-gray-600' : 'border-gray-600'
          }`}
          onPress={handleFileUpload}
          disabled={uploading}
        >
          {uploading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#9ca3af" />
              <Text className="text-gray-400 text-sm ml-2">Uploading...</Text>
            </View>
          ) : (
            <Text className="text-gray-400 text-sm">📁 Upload .torrent File</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Torrents */}
      <Text className="text-yellow-400 text-lg font-semibold mb-3">
        📥 Active Downloads {torrents.length > 0 ? `(${torrents.length})` : ''}
      </Text>

      {loading ? (
        <View className="bg-gray-800 rounded-xl border border-gray-700 p-12 items-center">
          <ActivityIndicator color="#eab308" size="large" />
          <Text className="text-gray-400 mt-3">Loading torrents...</Text>
        </View>
      ) : torrents.length === 0 ? (
        <View className="bg-gray-800 rounded-xl border border-gray-700 p-12 items-center">
          <Text className="text-6xl mb-4">📦</Text>
          <Text className="text-gray-400 text-lg font-medium">No active torrents</Text>
          <Text className="text-gray-500 text-sm mt-2">Add a magnet link above to get started</Text>
        </View>
      ) : (
        <View>
          {torrents.map((item) => (
            <TorrentCard key={item.gid || item.id} torrent={item} onUpdated={onTorrentAdded} />
          ))}
        </View>
      )}
    </View>
  );
}
