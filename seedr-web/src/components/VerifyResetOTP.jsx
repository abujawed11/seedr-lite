import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function VerifyResetOTP({ email, onOTPVerified, onBack }) {
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-reset-otp`, {
        email,
        otp
      });

      if (response.data.verified) {
        // Navigate to reset password page
        onOTPVerified(otp);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email });
      setError(''); // Clear any previous errors
      // Show success via the error field (we'll style it differently)
      setTimeout(() => {
        setError('New code sent to your email!');
        setTimeout(() => setError(''), 3000);
      }, 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
              Enter Verification Code
            </h1>
            <p className="text-gray-400">We sent a code to</p>
            <p className="text-yellow-400 font-medium mt-1">{email}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-4 rounded-lg ${
              error.includes('sent')
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <p className={error.includes('sent') ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={otp}
                onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="000000"
              />
              <p className="mt-2 text-xs text-gray-500">Enter the 6-digit code sent to your email</p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Didn't receive the code?{' '}
              <button
                onClick={handleResendOTP}
                disabled={resending}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend'}
              </button>
            </p>
          </div>

          {/* Back */}
          <div className="mt-4 text-center">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
