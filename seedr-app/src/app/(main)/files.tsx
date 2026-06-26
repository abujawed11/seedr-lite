import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { browse } from '../../api';
import FileExplorer from '../../components/FileExplorer';

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
  dirs: any[];
  files: File[];
}

export default function FilesScreen() {
  const insets = useSafeAreaInsets();
  const [browseData, setBrowseData] = useState<BrowseData>({ cwd: '', parent: null, dirs: [], files: [] });
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [playingFile, setPlayingFile] = useState<File | null>(null);

  const fetchBrowse = useCallback(async (path = currentPath) => {
    setLoading(true);
    try {
      const data = await browse(path);
      setBrowseData(data);
    } catch (err) {
      console.error('Browse error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    fetchBrowse('');
  }, []);

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    fetchBrowse(path);
  };

  const navigateBack = () => {
    if (!currentPath) return false;
    // Go to parent: remove last segment from path
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.join('/');
    navigateToPath(parentPath);
    return true; // consumed the back press
  };

  // Intercept Android back button when inside a folder
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', navigateBack);
    return () => sub.remove();
  }, [currentPath]);

  return (
    <View className="flex-1 bg-gray-900" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchBrowse(currentPath)}
            tintColor="#eab308"
            colors={['#eab308']}
          />
        }
      >
        <FileExplorer
          browseData={browseData}
          currentPath={currentPath}
          loading={loading}
          onNavigate={navigateToPath}
          onBack={navigateBack}
          onFileDeleted={() => fetchBrowse(currentPath)}
          onRefresh={() => fetchBrowse(currentPath)}
          onPlayFile={(file) => setPlayingFile(file)}
        />
      </ScrollView>
    </View>
  );
}
