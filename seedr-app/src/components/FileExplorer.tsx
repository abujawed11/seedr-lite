import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { deleteFile } from '../api';
import Breadcrumb from './Breadcrumb';
import FolderItem from './FolderItem';
import FileItem from './FileItem';

interface Folder {
  path: string;
  name: string;
  size?: number;
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

interface BrowseData {
  cwd: string;
  parent: string | null;
  dirs: Folder[];
  files: File[];
}

interface Props {
  browseData: BrowseData;
  currentPath: string;
  loading: boolean;
  onNavigate: (path: string) => void;
  onBack: () => boolean;
  onFileDeleted: () => void;
  onRefresh: () => void;
  onPlayFile: (file: File) => void;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function FileExplorer({ browseData, currentPath, loading, onNavigate, onBack, onFileDeleted, onRefresh, onPlayFile }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isEmpty = browseData.dirs.length === 0 && browseData.files.length === 0;

  const handleDelete = async (path: string, name: string, type: string) => {
    try {
      await deleteFile(path);
      onFileDeleted();
    } catch {
      Alert.alert('Delete Failed', `Failed to delete ${type} "${name}"`);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          {currentPath ? (
            <TouchableOpacity
              className="px-3 py-1.5 bg-gray-700 rounded-lg border border-gray-600 mr-1"
              onPress={onBack}
            >
              <Text className="text-white text-sm font-bold">← Back</Text>
            </TouchableOpacity>
          ) : null}
          <Text className="text-yellow-400 text-xl font-bold">🗂️ File Explorer</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {/* Stats */}
          <Text className="text-gray-400 text-xs">
            {browseData.dirs.length > 0 ? `${browseData.dirs.length} folders` : ''}
            {browseData.dirs.length > 0 && browseData.files.length > 0 ? ' · ' : ''}
            {browseData.files.length > 0 ? `${browseData.files.length} files` : ''}
          </Text>

          {/* Refresh */}
          <TouchableOpacity
            className="px-3 py-1.5 bg-yellow-500 rounded-lg"
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Text className={`text-gray-900 text-xs font-bold ${isRefreshing ? 'opacity-50' : ''}`}>
              {isRefreshing ? '...' : '🔄'}
            </Text>
          </TouchableOpacity>

          {/* View Toggle */}
          <View className="flex-row bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <TouchableOpacity
              className={`px-3 py-1.5 ${viewMode === 'list' ? 'bg-yellow-500' : ''}`}
              onPress={() => setViewMode('list')}
            >
              <Text className={`text-xs font-medium ${viewMode === 'list' ? 'text-gray-900' : 'text-gray-400'}`}>≡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-1.5 ${viewMode === 'grid' ? 'bg-yellow-500' : ''}`}
              onPress={() => setViewMode('grid')}
            >
              <Text className={`text-xs font-medium ${viewMode === 'grid' ? 'text-gray-900' : 'text-gray-400'}`}>⊞</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Breadcrumb */}
      <Breadcrumb currentPath={currentPath} onNavigate={onNavigate} />

      {/* Loading */}
      {loading ? (
        <View className="bg-gray-800 rounded-xl border border-gray-700 p-12 items-center">
          <ActivityIndicator color="#eab308" size="large" />
          <Text className="text-gray-400 mt-3">Loading files...</Text>
        </View>
      ) : isEmpty ? (
        <View className="bg-gray-800 rounded-xl border border-gray-700 p-12 items-center">
          <Text className="text-8xl mb-4">📂</Text>
          <Text className="text-gray-300 text-lg font-semibold mb-1">This folder is empty</Text>
          <Text className="text-gray-400 text-sm text-center">
            {currentPath
              ? `No files found in "${currentPath}"`
              : 'No files downloaded yet. Add a torrent to get started.'}
          </Text>
        </View>
      ) : (
        <View>
          {/* Folders */}
          {browseData.dirs.length > 0 && (
            <View className="mb-4">
              <Text className="text-gray-300 font-semibold mb-2">
                📁 Folders ({browseData.dirs.length})
              </Text>
              {viewMode === 'list' ? (
                browseData.dirs.map((dir) => (
                  <FolderItem
                    key={dir.path}
                    folder={dir}
                    onNavigate={onNavigate}
                    onDelete={handleDelete}
                    formatFileSize={formatFileSize}
                  />
                ))
              ) : (
                <FlatList
                  data={browseData.dirs}
                  keyExtractor={(item) => item.path}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 8 }}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View className="flex-1">
                      <FolderItem
                        folder={item}
                        onNavigate={onNavigate}
                        onDelete={handleDelete}
                        formatFileSize={formatFileSize}
                      />
                    </View>
                  )}
                />
              )}
            </View>
          )}

          {/* Files */}
          {browseData.files.length > 0 && (
            <View>
              <Text className="text-gray-300 font-semibold mb-2">
                📄 Files ({browseData.files.length})
              </Text>
              {viewMode === 'list' ? (
                browseData.files.map((file) => (
                  <FileItem
                    key={file.path}
                    file={file}
                    formatFileSize={formatFileSize}
                    onDelete={handleDelete}
                    onPlay={onPlayFile}
                  />
                ))
              ) : (
                <FlatList
                  data={browseData.files}
                  keyExtractor={(item) => item.path}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 8 }}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View className="flex-1">
                      <FileItem
                        file={item}
                        formatFileSize={formatFileSize}
                        onDelete={handleDelete}
                        onPlay={onPlayFile}
                      />
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
