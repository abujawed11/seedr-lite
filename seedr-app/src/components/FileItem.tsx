import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from '../constants/config';

// Backend generates URLs with its own localhost — replace with the configured server IP
function fixUrl(url?: string): string {
  if (!url) return '';
  // Extract just the origin (protocol + host + port) from API_BASE_URL
  const serverOrigin = API_BASE_URL.replace(/\/+$/, '');
  // Replace any localhost or 127.0.0.1 origin in the URL
  return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, serverOrigin);
}

interface File {
  path: string;
  name: string;
  size: number;
  mime?: string;
  streamUrl?: string;
  downloadUrl?: string;
  directUrl?: string;
}

interface Props {
  file: File;
  formatFileSize: (bytes: number) => string;
  onDelete: (path: string, name: string, type: string) => void;
  onPlay: (file: File) => void;
}

function getFileIcon(fileName: string, mimeType?: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'].includes(ext || '')) return '🎬';
  if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'].includes(ext || '')) return '🎵';
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'].includes(ext || '')) return '🖼️';
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext || '')) return '📘';
  if (['xls', 'xlsx'].includes(ext || '')) return '📗';
  if (['txt', 'md', 'log'].includes(ext || '')) return '📝';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return '🗜️';
  if (['exe', 'msi', 'apk'].includes(ext || '')) return '⚙️';
  if (['iso', 'img'].includes(ext || '')) return '💿';
  if (['epub', 'mobi'].includes(ext || '')) return '📚';
  if (['srt', 'vtt', 'ass'].includes(ext || '')) return '💬';
  return '📄';
}

function isMediaFile(fileName: string, mimeType?: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return (
    mimeType?.startsWith('video/') ||
    mimeType?.startsWith('audio/') ||
    ['mp4', 'avi', 'mkv', 'mov', 'webm', 'm4v', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext || '')
  );
}

export default function FileItem({ file, formatFileSize, onDelete, onPlay }: Props) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [downloading, setDownloading] = useState(false);

  const handleCopyLink = async () => {
    if (!file.directUrl) return;
    try {
      await Clipboard.setStringAsync(fixUrl(file.directUrl));
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 3000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  const handleDownload = async () => {
    if (!file.downloadUrl) return;
    setDownloading(true);
    try {
      const fileName = file.name;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      const { uri } = await FileSystem.downloadAsync(fixUrl(file.downloadUrl), localUri);
      await Sharing.shareAsync(uri, { dialogTitle: `Save ${fileName}` });
    } catch {
      Alert.alert('Download Failed', 'Could not download the file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePlay = () => {
    if (isMediaFile(file.name, file.mime)) {
      onPlay({ ...file, streamUrl: fixUrl(file.streamUrl), downloadUrl: fixUrl(file.downloadUrl), directUrl: fixUrl(file.directUrl) });
    } else if (file.streamUrl) {
      WebBrowser.openBrowserAsync(fixUrl(file.streamUrl));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(file.path, file.name, 'file') },
      ]
    );
  };

  return (
    <View className="bg-gray-800 rounded-xl border border-gray-700 px-4 py-3 mb-2">
      {/* File Info */}
      <View className="flex-row items-center mb-3">
        <Text className="text-2xl mr-3">{getFileIcon(file.name, file.mime)}</Text>
        <View className="flex-1">
          <Text className="text-white font-medium text-sm" numberOfLines={2}>{file.name}</Text>
          <View className="flex-row items-center mt-0.5 space-x-2">
            <Text className="text-gray-400 text-xs">{formatFileSize(file.size)}</Text>
            {file.mime && (
              <View className="bg-gray-700 px-1.5 py-0.5 rounded">
                <Text className="text-gray-400 text-xs uppercase">{file.mime.split('/')[0]}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row flex-wrap gap-2">
        {/* Play */}
        <TouchableOpacity
          className="flex-row items-center px-3 py-1.5 bg-blue-700/60 rounded-lg border border-blue-600/50"
          onPress={handlePlay}
        >
          <Text className="text-blue-300 text-xs font-medium">▶ Play</Text>
        </TouchableOpacity>

        {/* Download */}
        <TouchableOpacity
          className="flex-row items-center px-3 py-1.5 bg-green-800/50 rounded-lg border border-green-700/50"
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#86efac" />
          ) : (
            <Text className="text-green-300 text-xs font-medium">⬇ Download</Text>
          )}
        </TouchableOpacity>

        {/* Copy Link */}
        <TouchableOpacity
          className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
            copyStatus === 'copied'
              ? 'bg-green-800/50 border-green-700/50'
              : copyStatus === 'error'
              ? 'bg-red-800/50 border-red-700/50'
              : 'bg-gray-700 border-gray-600'
          }`}
          onPress={handleCopyLink}
        >
          <Text className={`text-xs font-medium ${
            copyStatus === 'copied' ? 'text-green-300' :
            copyStatus === 'error' ? 'text-red-300' : 'text-gray-300'
          }`}>
            {copyStatus === 'copied' ? '✓ Copied' : copyStatus === 'error' ? '✗ Error' : '🔗 Copy'}
          </Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          className="flex-row items-center px-3 py-1.5 bg-red-900/30 rounded-lg border border-red-700/30"
          onPress={handleDelete}
        >
          <Text className="text-red-400 text-xs font-medium">🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
