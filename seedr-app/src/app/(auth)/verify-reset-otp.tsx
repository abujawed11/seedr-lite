import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyResetOTP } from '../../api';

export default function VerifyResetOTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleVerify = async () => {
    if (otp.trim().length < 4) { setError('Please enter the OTP'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyResetOTP(email, otp.trim());
      router.push({ pathname: '/(auth)/reset-password', params: { email, otp: otp.trim() } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-6 py-12">
          <View className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 border border-gray-700">

            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-white mb-2">Enter OTP</Text>
              <Text className="text-gray-400 text-center text-sm">
                OTP sent to <Text className="text-yellow-400">{email}</Text>
              </Text>
            </View>

            {error ? (
              <View className="mb-5 p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-300 mb-2">OTP Code</Text>
              <TextInput
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-center text-2xl tracking-widest"
                placeholder="------"
                placeholderTextColor="#6b7280"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              className={`w-full py-3.5 rounded-xl items-center ${loading ? 'bg-yellow-500/50' : 'bg-yellow-500'}`}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-gray-900 font-bold">Verify OTP</Text>}
            </TouchableOpacity>

            <TouchableOpacity className="mt-4 items-center" onPress={() => router.back()}>
              <Text className="text-gray-400 text-sm">← Go back</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
