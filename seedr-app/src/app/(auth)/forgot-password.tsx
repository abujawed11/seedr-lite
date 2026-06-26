import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { forgotPassword } from '../../api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-6">
        <View className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 border border-gray-700 items-center">
          <Text className="text-5xl mb-4">📧</Text>
          <Text className="text-white text-xl font-bold mb-2">OTP Sent!</Text>
          <Text className="text-gray-400 text-center text-sm mb-6">
            Check your email <Text className="text-yellow-400">{email}</Text> for the reset OTP.
          </Text>
          <TouchableOpacity
            className="w-full py-3.5 bg-yellow-500 rounded-xl items-center"
            onPress={() => router.push({ pathname: '/(auth)/verify-reset-otp', params: { email } })}
          >
            <Text className="text-gray-900 font-bold">Enter OTP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-6 py-12">
          <View className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 border border-gray-700">

            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-white mb-2">Forgot Password</Text>
              <Text className="text-gray-400 text-center text-sm">Enter your email to receive a reset OTP</Text>
            </View>

            {error ? (
              <View className="mb-5 p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-300 mb-2">Email Address</Text>
              <TextInput
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white"
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              className={`w-full py-3.5 rounded-xl items-center ${loading ? 'bg-yellow-500/50' : 'bg-yellow-500'}`}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-gray-900 font-bold">Send OTP</Text>}
            </TouchableOpacity>

            <TouchableOpacity className="mt-4 items-center" onPress={() => router.back()}>
              <Text className="text-gray-400 text-sm">← Back to login</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
