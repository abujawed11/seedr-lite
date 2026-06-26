import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resetPassword } from '../../api';

export default function ResetPasswordScreen() {
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!password || !confirmPassword) { setError('All fields are required'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    setError('');
    try {
      await resetPassword(email, otp, password);
      setSuccess(true);
      setTimeout(() => router.replace('/(auth)/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.');
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
        <Text className="text-white text-2xl font-bold mb-2">Password Reset!</Text>
        <Text className="text-gray-400 text-center">Redirecting to login...</Text>
        <ActivityIndicator color="#eab308" className="mt-4" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-6 py-12">
          <View className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 border border-gray-700">

            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-white mb-2">New Password</Text>
              <Text className="text-gray-400 text-center text-sm">Set a new password for your account</Text>
            </View>

            {error ? (
              <View className="mb-5 p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-300 mb-2">New Password</Text>
              <View className="relative">
                <TextInput
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white pr-12"
                  placeholder="Min 6 characters"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity className="absolute right-3 top-3.5" onPress={() => setShowPassword(!showPassword)}>
                  <Text className="text-gray-400 text-sm">{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-300 mb-2">Confirm Password</Text>
              <TextInput
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white"
                placeholder="Re-enter new password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              className={`w-full py-3.5 rounded-xl items-center ${loading ? 'bg-yellow-500/50' : 'bg-yellow-500'}`}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-gray-900 font-bold">Reset Password</Text>}
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
