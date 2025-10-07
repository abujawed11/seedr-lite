import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted/rejected cookies
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Small delay to avoid showing banner immediately on page load
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    // Store consent in localStorage
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowBanner(false);
  };

  const handleDecline = () => {
    // Store decline in localStorage
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowBanner(false);

    // Optionally clear any existing cookies/storage except the consent itself
    // You can implement additional logic here to disable analytics, etc.
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm text-gray-300">
          <p>
            <span className="font-semibold text-white">🍪 We use cookies</span>
            <br className="sm:hidden" />
            <span className="ml-0 sm:ml-1">
              This website uses cookies to enhance your experience, analyze site traffic, and remember your preferences.
              By clicking "Accept", you consent to our use of cookies.
            </span>
            {' '}
            <a
              href="/privacy"
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </a>
          </p>
        </div>

        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
