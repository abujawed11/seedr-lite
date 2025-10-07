import { useState } from 'react';
import axios from 'axios';
import PasswordToggle from './PasswordToggle';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function ResetPassword({ email, onSuccess, onBack }) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
        email,
        newPassword: formData.newPassword
      });

      // Show success and redirect to login
      onSuccess(response.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
              Set New Password
            </h1>
            <p className="text-gray-400">Enter your new password below</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter new password (min. 6 characters)"
                />
                <PasswordToggle
                  showPassword={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2">Password requirements:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li className={formData.newPassword.length >= 6 ? 'text-green-400' : ''}>
                  ✓ At least 6 characters
                </li>
                <li className={formData.newPassword === formData.confirmPassword && formData.newPassword ? 'text-green-400' : ''}>
                  ✓ Passwords match
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Resetting...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Back */}
          <div className="mt-6 text-center">
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
