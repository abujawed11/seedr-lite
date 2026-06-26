import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getMySubscription } from '../../api';
import StorageBar from '../../components/StorageBar';

function formatDate(dateString?: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function getPlanName(plan: string) {
  const names: Record<string, string> = { free: 'Free', basic: 'Basic', pro: 'Pro', premium: 'Premium' };
  return names[plan] || plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, getStorageInfo } = useAuth();
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const subscriptionData = await getMySubscription();
      const storageInfo = getStorageInfo();
      setAccountDetails({
        user: subscriptionData.user,
        storage: storageInfo,
        subscription: subscriptionData.activeSubscription,
        historyLog: subscriptionData.historyLog || [],
      });
    } catch {
      setAccountDetails({
        user,
        storage: getStorageInfo(),
        subscription: null,
        historyLog: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const sub = accountDetails?.subscription;
  const subProgress = sub?.started_at && sub?.expires_at ? (() => {
    const start = new Date(sub.started_at).getTime();
    const end = new Date(sub.expires_at).getTime();
    const now = Date.now();
    return Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
  })() : 0;

  return (
    <View className="flex-1 bg-gray-900" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-white text-2xl font-bold">My Account</Text>
            <Text className="text-gray-400 text-sm">Account & subscription details</Text>
          </View>
          <TouchableOpacity
            className="px-4 py-2 bg-red-600/80 rounded-xl border border-red-700/50"
            onPress={handleLogout}
          >
            <Text className="text-red-200 font-medium text-sm">Logout</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#eab308" size="large" />
            <Text className="text-gray-400 mt-3">Loading account details...</Text>
          </View>
        ) : accountDetails ? (
          <View className="space-y-4">

            {/* Profile Info */}
            <View className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <Text className="text-white font-semibold text-lg mb-4">👤 Profile Information</Text>
              <View className="space-y-3">
                <Row label="Username" value={accountDetails.user?.username} />
                <Row label="Email" value={accountDetails.user?.email} />
                <Row label="Account Type" value={
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-medium capitalize">{accountDetails.user?.role}</Text>
                    {accountDetails.user?.role === 'admin' && (
                      <View className="bg-red-600 px-2 py-0.5 rounded-full">
                        <Text className="text-white text-xs font-bold">ADMIN</Text>
                      </View>
                    )}
                  </View>
                } />
                <Row label="Status" value={
                  <View className={`px-3 py-1 rounded-full self-start ${
                    accountDetails.user?.isActive ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <Text className={`text-sm font-medium ${
                      accountDetails.user?.isActive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {accountDetails.user?.isActive ? '✓ Active' : '✗ Disabled'}
                    </Text>
                  </View>
                } />
                <Row label="Member Since" value={formatDate(accountDetails.user?.createdAt)} />
              </View>
            </View>

            {/* Subscription */}
            <View className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <Text className="text-white font-semibold text-lg mb-4">💳 Subscription</Text>
              {sub ? (
                <View className="space-y-3">
                  <Row label="Current Plan" value={`${getPlanName(sub.plan)} Plan`} highlight />
                  <Row label="Billing Cycle" value={sub.duration} />
                  <Row label="Status" value={
                    <View className={`px-3 py-1 rounded-full self-start ${
                      sub.status === 'active' ? 'bg-green-500/20' :
                      sub.status === 'pending' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                    }`}>
                      <Text className={`text-sm font-medium ${
                        sub.status === 'active' ? 'text-green-400' :
                        sub.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        {sub.isExpired ? ' (Expired)' : ''}
                      </Text>
                    </View>
                  } />
                  <Row label="Started On" value={formatDate(sub.started_at)} />
                  <Row label="Expires On" value={formatDate(sub.expires_at)} valueColor={sub.isExpired ? 'text-red-400' : 'text-white'} />
                  <Row label="Days Remaining" value={
                    sub.daysUntilExpiry <= 0 ? 'Expired' :
                    `${sub.daysUntilExpiry} days`
                  } valueColor={
                    sub.daysUntilExpiry <= 0 ? 'text-red-400' :
                    sub.daysUntilExpiry <= 7 ? 'text-yellow-400' : 'text-green-400'
                  } />

                  {/* Subscription progress */}
                  {sub.started_at && sub.expires_at && (
                    <View className="mt-2">
                      <Text className="text-gray-400 text-sm mb-2">Subscription Progress</Text>
                      <View className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${
                            subProgress >= 100 ? 'bg-red-500' :
                            subProgress >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${subProgress}%` }}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View className="items-center py-6">
                  <Text className="text-4xl mb-3">⏰</Text>
                  <Text className="text-gray-400">No active subscription</Text>
                  <Text className="text-gray-500 text-sm mt-1">You are on the Free plan</Text>
                </View>
              )}
            </View>

            {/* Storage */}
            {accountDetails.storage && (
              <View className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <Text className="text-white font-semibold text-lg mb-4">💾 Storage Usage</Text>
                <StorageBar storage={accountDetails.storage} />
              </View>
            )}

            {/* Subscription History */}
            {accountDetails.historyLog?.length > 0 && (
              <View className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <Text className="text-white font-semibold text-lg mb-4">🕒 Subscription History</Text>
                <View className="space-y-2">
                  {accountDetails.historyLog.slice(0, 10).map((entry: any, index: number) => (
                    <View key={entry.id || index} className="flex-row items-center justify-between p-3 bg-gray-700/40 rounded-lg">
                      <View className="flex-row items-center flex-1">
                        <View className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${
                          entry.action === 'created' ? 'bg-green-500' :
                          entry.action === 'renewed' ? 'bg-blue-500' :
                          entry.action === 'expired' ? 'bg-red-500' :
                          entry.action === 'cancelled' ? 'bg-gray-500' : 'bg-yellow-500'
                        }`} />
                        <View className="flex-1">
                          <Text className="text-white text-sm font-medium">
                            {entry.action === 'created' ? 'Subscription Activated' :
                             entry.action === 'renewed' ? 'Subscription Renewed' :
                             entry.action === 'expired' ? 'Subscription Expired' :
                             entry.action === 'cancelled' ? 'Subscription Cancelled' :
                             entry.action === 'downgraded' ? 'Downgraded to Free' :
                             entry.action}
                          </Text>
                          {(entry.plan_from || entry.plan_to) && (
                            <Text className="text-gray-400 text-xs">
                              {entry.plan_from && entry.plan_to
                                ? `${entry.plan_from} → ${entry.plan_to}`
                                : entry.plan_to || entry.plan_from}
                              {entry.duration ? ` (${entry.duration})` : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text className="text-gray-400 text-xs ml-2 flex-shrink-0">
                        {formatDate(entry.performed_at)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          </View>
        ) : (
          <View className="items-center py-16">
            <Text className="text-gray-400">Unable to load account details.</Text>
            <TouchableOpacity className="mt-4 px-4 py-2 bg-yellow-500 rounded-lg" onPress={fetchDetails}>
              <Text className="text-gray-900 font-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Helper row component
function Row({ label, value, highlight, valueColor }: {
  label: string;
  value: any;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-gray-700/50">
      <Text className="text-gray-400 text-sm">{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className={`font-medium text-sm ${valueColor || (highlight ? 'text-yellow-400' : 'text-white')}`}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}
