import { View, Text } from 'react-native';

interface StorageInfo {
  quota: string;
  used: string;
  available: string;
  reserved?: string;
  usedPercentage: number;
  details?: {
    quotaBytes: number;
    usedBytes: number;
    reservedBytes: number;
  };
}

interface Props {
  storage: StorageInfo;
}

export default function StorageBar({ storage }: Props) {
  const usedPercent = storage.details
    ? Math.min((storage.details.usedBytes / storage.details.quotaBytes) * 100, 100)
    : storage.usedPercentage;

  const reservedPercent = storage.details
    ? Math.min((storage.details.reservedBytes / storage.details.quotaBytes) * 100, 100 - usedPercent)
    : 0;

  const barColor =
    usedPercent >= 90 ? '#ef4444' :
    usedPercent >= 70 ? '#eab308' :
    '#22c55e';

  return (
    <View>
      {/* Stats Row */}
      <View className="flex-row justify-between mb-3">
        <View className="items-center flex-1">
          <Text className="text-blue-400 text-lg font-bold">{storage.quota}</Text>
          <Text className="text-gray-400 text-xs">Total Quota</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-orange-400 text-lg font-bold">{storage.used}</Text>
          <Text className="text-gray-400 text-xs">Used</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-green-400 text-lg font-bold">{storage.available}</Text>
          <Text className="text-gray-400 text-xs">Available</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="w-full h-3 bg-gray-600 rounded-full overflow-hidden flex-row">
        {usedPercent > 0 && (
          <View style={{ width: `${usedPercent}%`, backgroundColor: barColor }} />
        )}
        {reservedPercent > 0 && (
          <View style={{ width: `${reservedPercent}%`, backgroundColor: '#eab308' }} />
        )}
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-center space-x-4 mt-2">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: barColor }} />
          <Text className="text-gray-400 text-xs">Used {Math.round(usedPercent)}%</Text>
        </View>
        {reservedPercent > 0 && (
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-1.5" />
            <Text className="text-gray-400 text-xs">Reserved</Text>
          </View>
        )}
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-gray-600 mr-1.5" />
          <Text className="text-gray-400 text-xs">Free</Text>
        </View>
      </View>
    </View>
  );
}
