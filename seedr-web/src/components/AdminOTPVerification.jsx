import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminOTPVerification({ username, email, onSuccess, onBack }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-admin-otp`, {
        username,
        otp
      });

      if (response.data.token && response.data.user) {
        // Save auth data
        localStorage.setItem('seedr_token', response.data.token);
        onSuccess(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    setResendSuccess(false);

    try {
      await axios.post(`${API_URL}/api/auth/resend-admin-otp`, { username });
      setResendSuccess(true);
      setCountdown(60); // 60 seconds cooldown
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setOtp(value);
      if (error) setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🔐 Admin Verification
            </h1>
            <p className="text-gray-400">
              Security code sent to
            </p>
            <p className="text-red-400 font-medium">{email}</p>
            <p className="text-xs text-gray-500 mt-2">
              This is required for admin access
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {resendSuccess && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">Code resent successfully!</p>
            </div>
          )}

          {/* OTP Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={handleOtpChange}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-2xl font-bold tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="000000"
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Code expires in 5 minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-medium py-3 px-4 rounded-lg hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify & Login'
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-xs text-center">
              ⚠️ If you didn't attempt to login, someone may have your password. Change it immediately.
            </p>
          </div>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resendLoading || countdown > 0}
              className="text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {resendLoading ? (
                'Sending...'
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
