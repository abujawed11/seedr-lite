import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminOTPVerification from './AdminOTPVerification';
import PasswordToggle from './PasswordToggle';

export default function LoginForm({ onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminOTP, setShowAdminOTP] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, setAuthData } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.username, formData.password);

      if (!result.success) {
        // Check if admin OTP is required
        if (result.requiresOTP) {
          setShowAdminOTP(true);
          setAdminEmail(result.email);
          return;
        }
        setError(result.error);
        return;
      }
      // If login is successful, AuthContext will handle the state update and redirect
    } catch (error) {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminOTPSuccess = async (data) => {
    // Set auth data after successful OTP verification
    if (data.token && data.user) {
      await setAuthData(data.user, data.token);
    }
  };

  const handleBackToLogin = () => {
    setShowAdminOTP(false);
    setError('');
  };

  // Show admin OTP screen if needed
  if (showAdminOTP) {
    return (
      <AdminOTPVerification
        username={formData.username}
        email={adminEmail}
        onSuccess={handleAdminOTPSuccess}
        onBack={handleBackToLogin}
      />
    );
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // Don't clear error immediately on input change
    // Let the error persist until user tries to submit again
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
              MyPeerCloud
            </h1>
            <p className="text-gray-400">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <PasswordToggle
                  showPassword={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('navigateToForgotPassword'))}
                className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}