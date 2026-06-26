import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL } from '../../constants/config';

export default function OTPVerifyScreen() {
  const { email, username, password } = useLocalSearchParams<{ email: string; username: string; password: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    if (otp.trim().length < 4) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
        email,
        username,
        password,
        otp: otp.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-green-500 items-center justify-center mb-6">
          <Text className="text-white text-4xl">✓</Text>
        </View>
        <Text className="text-white text-2xl font-bold mb-2">Account Verified!</Text>
        <Text className="text-gray-400 text-center">Redirecting to login...</Text>
        <ActivityIndicator color="#eab308" className="mt-4" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-6 py-12">
          <View className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 border border-gray-700">

            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-white mb-2">Verify Email</Text>
              <Text className="text-gray-400 text-center text-sm">
                Enter the OTP sent to{'\n'}
                <Text className="text-yellow-400">{email}</Text>
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
              className={`w-full py-3.5 rounded-xl items-center justify-center ${loading ? 'bg-yellow-500/50' : 'bg-yellow-500'}`}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-gray-900 font-bold text-base">Verify OTP</Text>}
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
