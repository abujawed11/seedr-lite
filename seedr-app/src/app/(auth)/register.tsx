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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL } from '../../constants/config';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const router = useRouter();

  const canSubmit = ageConfirmed && termsAccepted && privacyAccepted && !loading;

  const handleRegister = async () => {
    setError('');

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!ageConfirmed) { setError('You must confirm you are at least 18 years old'); return; }
    if (!termsAccepted) { setError('You must accept the Terms of Service'); return; }
    if (!privacyAccepted) { setError('You must accept the Privacy Policy'); return; }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username: username.trim(),
        email: email.trim(),
        password,
        ageConfirmed,
        termsAccepted,
        privacyAccepted,
      });

      if (response.status === 200) {
        // OTP sent — go to OTP verification screen
        router.push({ pathname: '/(auth)/otp-verify', params: { email: email.trim(), username: username.trim(), password } });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Checkbox = ({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) => (
    <TouchableOpacity className="flex-row items-start mb-3" onPress={onToggle} activeOpacity={0.7}>
      <View className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 items-center justify-center flex-shrink-0 ${value ? 'bg-yellow-500 border-yellow-500' : 'border-gray-500 bg-gray-700'}`}>
        {value && <Text className="text-gray-900 text-xs font-bold">✓</Text>}
      </View>
      <Text className="text-sm text-gray-300 flex-1">{label}</Text>
    </TouchableOpacity>
  );

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
              <Text className="text-gray-400">Create your account</Text>
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
                placeholder="Choose a username"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-300 mb-2">Email Address</Text>
              <TextInput
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white"
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-300 mb-2">Password</Text>
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

            {/* Confirm Password */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-300 mb-2">Confirm Password</Text>
              <View className="relative">
                <TextInput
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white pr-12"
                  placeholder="Re-enter password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity className="absolute right-3 top-3.5" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Text className="text-gray-400 text-sm">{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Legal Checkboxes */}
            <View className="bg-gray-700/40 border border-gray-600 rounded-xl p-4 mb-5">
              <Text className="text-xs text-gray-400 mb-3">Please confirm the following:</Text>
              <Checkbox
                value={ageConfirmed}
                onToggle={() => setAgeConfirmed(!ageConfirmed)}
                label="I confirm that I am at least 18 years old."
              />
              <Checkbox
                value={termsAccepted}
                onToggle={() => setTermsAccepted(!termsAccepted)}
                label="I have read and agree to the Terms of Service."
              />
              <Checkbox
                value={privacyAccepted}
                onToggle={() => setPrivacyAccepted(!privacyAccepted)}
                label="I have read and agree to the Privacy Policy."
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              className={`w-full py-3.5 rounded-xl items-center justify-center ${!canSubmit ? 'bg-yellow-500/40' : 'bg-yellow-500'}`}
              onPress={handleRegister}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-gray-900 font-bold text-base">Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Switch to Login */}
            <View className="mt-6 flex-row justify-center">
              <Text className="text-gray-400">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text className="text-yellow-400 font-medium">Sign in</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
