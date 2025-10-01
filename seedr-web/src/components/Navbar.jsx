import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onNavigate, currentPage, onShowPlansModal, onShowAdminPanel }) {
  const { isAuthenticated, user, logout, getStorageInfo } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <div
              onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'home')}
              className="flex items-center cursor-pointer group"
            >
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Seedr-Lite
              </h1>
              {!isAuthenticated && (
                <div className="ml-4 text-sm text-gray-400">Modern torrent client</div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          {!isAuthenticated ? (
            <div className="flex items-center space-x-6">
              <button
                onClick={() => onNavigate('home')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'home'
                    ? 'text-yellow-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('features')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'features'
                    ? 'text-yellow-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => onNavigate('pricing')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'pricing'
                    ? 'text-yellow-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Pricing
              </button>

              {/* Auth Buttons */}
              <div className="flex items-center space-x-3 ml-4">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-6">
              {/* Storage Usage */}
              {(() => {
                const storageInfo = getStorageInfo();
                return storageInfo ? (
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-300">
                      <div className="flex items-center space-x-3">
                        <span>💾</span>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Used</div>
                            <div className="font-medium text-orange-400">{storageInfo.used}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Available</div>
                            <div className="font-medium text-green-400">{storageInfo.available}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Quota</div>
                            <div className="font-medium text-blue-400">{storageInfo.quota}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => onShowAdminPanel && onShowAdminPanel()}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-md transition-all font-semibold shadow-lg hover:shadow-xl"
                  >
                    🛡️ Admin Panel
                  </button>
                )}
                <button
                  onClick={() => onShowPlansModal && onShowPlansModal()}
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  ⬆️ Upgrade
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    <span className="text-yellow-400 font-medium">{user?.username}</span>
                    {user?.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                        ADMIN
                      </span>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-xs text-gray-400">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                          onNavigate('home');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
