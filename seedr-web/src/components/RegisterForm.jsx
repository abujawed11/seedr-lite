import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OTPVerification from './OTPVerification';
import LegalModal from './LegalModal';
import TermsContent from './TermsContent';
import PrivacyContent from './PrivacyContent';
import PasswordToggle from './PasswordToggle';
import axios from 'axios';

export default function RegisterForm({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Legal acceptance checkboxes
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const API_URL = import.meta.env.VITE_API_BASE_URL || '';


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Legal acceptance validation
    if (!ageConfirmed) {
      setError('You must confirm that you are at least 18 years old');
      setLoading(false);
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service to continue');
      setLoading(false);
      return;
    }

    if (!privacyAccepted) {
      setError('You must accept the Privacy Policy to continue');
      setLoading(false);
      return;
    }

    try {
      // Send registration request
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        ageConfirmed,
        termsAccepted,
        privacyAccepted
      });

      if (response.status === 200) {
        // OTP sent successfully, show verification screen
        setShowOTPVerification(true);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    // Show success message
    setShowOTPVerification(false);
    setShowSuccessMessage(true);

    // Redirect to login after 3 seconds
    setTimeout(() => {
      onSwitchToLogin();
    }, 3000);
  };

  const handleBackToRegistration = () => {
    setShowOTPVerification(false);
    setError('');
  };

  // Show success message
  if (showSuccessMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-gray-700 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-green-500 rounded-full mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Registration Successful!
            </h1>
            <p className="text-gray-400 mb-6">
              Your account has been created and verified successfully.
            </p>
            <p className="text-yellow-400 font-medium">
              Redirecting to login page...
            </p>
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show OTP verification screen if needed
  if (showOTPVerification) {
    return (
      <OTPVerification
        email={formData.email}
        username={formData.username}
        password={formData.password}
        onSuccess={handleOTPSuccess}
        onBack={handleBackToRegistration}
      />
    );
  }

  const handleChange = (e) => {
    // Clear error when user starts typing
    if (error) {
      setError('');
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
            <p className="text-gray-400">Create your account</p>
            {/* <p className="text-sm text-gray-500 mt-2">Get 30GB free storage</p> */}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Register Form */}
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
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Enter your email"
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
                  placeholder="Create a password (min 6 chars)"
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
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Confirm your password"
                />
                <PasswordToggle
                  showPassword={showConfirmPassword}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </div>
            </div>

            {/* Legal Acceptance Checkboxes */}
            <div className="space-y-4 bg-gray-700/30 border border-gray-600 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-3">
                Please confirm the following to continue:
              </p>

              {/* Age Confirmation */}
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 rounded border-gray-500 bg-gray-700 text-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-gray-800 cursor-pointer"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  I confirm that I am at least <strong className="text-white">18 years old</strong>.
                </span>
              </label>

              {/* Terms of Service */}
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 rounded border-gray-500 bg-gray-700 text-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-gray-800 cursor-pointer"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-yellow-400 hover:text-yellow-300 underline font-medium"
                  >
                    Terms of Service
                  </button>
                </span>
              </label>

              {/* Privacy Policy */}
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 rounded border-gray-500 bg-gray-700 text-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-gray-800 cursor-pointer"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-yellow-400 hover:text-yellow-300 underline font-medium"
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !ageConfirmed || !termsAccepted || !privacyAccepted}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Legal Modals */}
        <LegalModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          title="Terms of Service"
        >
          <TermsContent />
        </LegalModal>

        <LegalModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          title="Privacy Policy"
        >
          <PrivacyContent />
        </LegalModal>
      </div>
    </div>
  );
}