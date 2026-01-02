import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPassword from './ForgotPassword';
import VerifyResetOTP from './VerifyResetOTP';
import ResetPassword from './ResetPassword';
import Navbar from './Navbar';
import Footer from './Footer';
import HomePage from '../pages/HomePage';
import MyAccount from './MyAccount';
import TermsPage from '../pages/TermsPage';
import PrivacyPage from '../pages/PrivacyPage';
import RefundPage from '../pages/RefundPage';
import ContactPage from '../pages/ContactPage';
import Disclaimer from './Disclaimer';
import DMCAPage from '../pages/DMCAPage';
import ShippingDeliveryPage from '../pages/ShippingDeliveryPage';
import AboutUsPage from '../pages/AboutUsPage';

export default function AuthWrapper({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'login', 'register', 'forgot-password', 'verify-reset-otp', 'reset-password', etc.
  const [showMyAccount, setShowMyAccount] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const handleNavigate = (page) => {
    setCurrentPage(page);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen for forgot password navigation event
  useEffect(() => {
    const handleForgotPassword = () => {
      setCurrentPage('forgot-password');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('navigateToForgotPassword', handleForgotPassword);
    return () => window.removeEventListener('navigateToForgotPassword', handleForgotPassword);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show dashboard with navbar
  if (isAuthenticated) {
    return (
      <>
        <Navbar
          onNavigate={handleNavigate}
          currentPage={currentPage}
          onShowPlansModal={() => {
            // Trigger plans modal in App component
            const event = new CustomEvent('showPlansModal');
            window.dispatchEvent(event);
          }}
          onShowAdminPanel={() => {
            // Trigger admin panel in App component
            const event = new CustomEvent('showAdminPanel');
            window.dispatchEvent(event);
          }}
          onShowMyAccount={() => setShowMyAccount(true)}
        />
        {children}
        <MyAccount
          isOpen={showMyAccount}
          onClose={() => setShowMyAccount(false)}
        />
      </>
    );
  }

  // User is not authenticated - show public pages
  return (
    <>
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'features' && (
        <div onClick={() => {
          const featuresSection = document.getElementById('features');
          if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
          } else {
            handleNavigate('home');
            setTimeout(() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }}>
          <HomePage onNavigate={handleNavigate} />
        </div>
      )}
      {currentPage === 'pricing' && (
        <div onClick={() => {
          const pricingSection = document.getElementById('pricing');
          if (pricingSection) {
            pricingSection.scrollIntoView({ behavior: 'smooth' });
          } else {
            handleNavigate('home');
            setTimeout(() => {
              document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }}>
          <HomePage onNavigate={handleNavigate} />
        </div>
      )}
      {currentPage === 'login' && (
        resetSuccessMessage ? (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-gray-700">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent mb-2">
                    Password Reset Successful
                  </h1>
                  <p className="text-gray-400">{resetSuccessMessage}</p>
                </div>
                <button
                  onClick={() => {
                    setResetSuccessMessage('');
                    handleNavigate('login');
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        ) : (
          <LoginForm onSwitchToRegister={() => handleNavigate('register')} />
        )
      )}
      {currentPage === 'register' && <RegisterForm onSwitchToLogin={() => handleNavigate('login')} />}
      {currentPage === 'forgot-password' && (
        <ForgotPassword
          onSwitchToLogin={() => handleNavigate('login')}
          onOTPSent={(email) => {
            setResetEmail(email);
            setCurrentPage('verify-reset-otp');
          }}
        />
      )}
      {currentPage === 'verify-reset-otp' && (
        <VerifyResetOTP
          email={resetEmail}
          onOTPVerified={(otp) => {
            setResetOTP(otp);
            setCurrentPage('reset-password');
          }}
          onBack={() => setCurrentPage('forgot-password')}
        />
      )}
      {currentPage === 'reset-password' && (
        <ResetPassword
          email={resetEmail}
          otp={resetOTP}
          onSuccess={(message) => {
            setResetSuccessMessage(message);
            setCurrentPage('login');
          }}
          onBack={() => setCurrentPage('verify-reset-otp')}
        />
      )}
      {currentPage === 'terms' && <TermsPage onNavigate={handleNavigate} />}
      {currentPage === 'privacy' && <PrivacyPage onNavigate={handleNavigate} />}
      {currentPage === 'refund' && <RefundPage onNavigate={handleNavigate} />}
      {currentPage === 'shipping' && <ShippingDeliveryPage onNavigate={handleNavigate} />}
      {currentPage === 'about' && <AboutUsPage onNavigate={handleNavigate} />}
      {currentPage === 'contact' && <ContactPage onNavigate={handleNavigate} />}
      {currentPage === 'disclaimer' && <Disclaimer onNavigate={handleNavigate} />}
      {currentPage === 'dmca' && <DMCAPage onNavigate={handleNavigate} />}
      <Footer onNavigate={handleNavigate} isAuthenticated={isAuthenticated} />
    </>
  );
}