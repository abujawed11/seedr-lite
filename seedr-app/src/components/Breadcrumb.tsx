import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({ currentPath, onNavigate }: Props) {
  if (!currentPath) {
    return (
      <View className="flex-row items-center mb-3">
        <Text className="text-yellow-400 text-sm font-medium">🏠 Root</Text>
      </View>
    );
  }

  const parts = currentPath.split('/').filter(Boolean);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-3"
      contentContainerStyle={{ alignItems: 'center' }}
    >
      {/* Root */}
      <TouchableOpacity onPress={() => onNavigate('')}>
        <Text className="text-yellow-400 text-sm font-medium">🏠 Root</Text>
      </TouchableOpacity>

      {parts.map((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        const isLast = index === parts.length - 1;

        return (
          <View key={path} className="flex-row items-center">
            <Text className="text-gray-500 mx-1.5 text-sm">/</Text>
            {isLast ? (
              <Text className="text-white text-sm font-medium">{part}</Text>
            ) : (
              <TouchableOpacity onPress={() => onNavigate(path)}>
                <Text className="text-yellow-400 text-sm">{part}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
