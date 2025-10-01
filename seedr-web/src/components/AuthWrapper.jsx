import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import Navbar from './Navbar';
import HomePage from '../pages/HomePage';

export default function AuthWrapper({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'login', 'register', 'dashboard', 'features', 'pricing'

  const handleNavigate = (page) => {
    setCurrentPage(page);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        />
        {children}
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
      {currentPage === 'login' && <LoginForm onSwitchToRegister={() => handleNavigate('register')} />}
      {currentPage === 'register' && <RegisterForm onSwitchToLogin={() => handleNavigate('login')} />}
    </>
  );
}