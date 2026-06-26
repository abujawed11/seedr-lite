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
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(username.trim(), password);

    if (!result.success) {
      if (result.requiresOTP) {
        router.push({ pathname: '/(auth)/admin-otp', params: { username, email: result.email } });
        setLoading(false);
        return;
      }
      setError(result.error || 'Login failed');
      setLoading(false);
      return;
    }

    // Success — _layout.tsx will auto-redirect to (main)
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 items-center justify-center px-6 py-12">
          <View className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 border border-gray-700">

            {/* Header */}
            <View className="items-center mb-8">
              <Text className="text-4xl font-bold text-yellow-400 mb-2">MyPeerCloud</Text>
              <Text className="text-gray-400">Sign in to your account</Text>
            </View>

            {/* Error */}
            {error ? (
              <View className="mb-5 p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
                <Text className="text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Username */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-300 mb-2">Username</Text>
              <TextInput
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white"
                placeholder="Enter your username"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-300 mb-2">Password</Text>
              <View className="relative">
                <TextInput
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white pr-12"
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="absolute right-3 top-3.5"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text className="text-gray-400 text-sm">{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              className="items-center mb-6"
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text className="text-yellow-400 text-sm">Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              className={`w-full py-3.5 rounded-xl items-center justify-center ${loading ? 'bg-yellow-600/50' : 'bg-yellow-500'}`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-gray-900 font-bold text-base">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Switch to Register */}
            <View className="mt-6 flex-row justify-center">
              <Text className="text-gray-400">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text className="text-yellow-400 font-medium">Sign up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
