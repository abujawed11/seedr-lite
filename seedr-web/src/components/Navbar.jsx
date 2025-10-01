import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onNavigate, currentPage, onShowPlansModal, onShowAdminPanel }) {
  const { isAuthenticated, user, logout, getStorageInfo } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <div
              onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'home')}
              className="flex items-center cursor-pointer group"
            >
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 transition-all duration-300 transform group-hover:scale-105">
                Seedr-Lite
              </h1>
              {!isAuthenticated && (
                <div className="ml-4 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Modern torrent client</div>
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
                            <div className="text-xs text-gray-400 mb-1">Total Quota</div>
                            <div className="font-medium text-blue-400">{storageInfo.quota}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Used Space</div>
                            <div className="font-medium text-orange-400">{storageInfo.used}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">Available Space</div>
                            <div className="font-medium text-green-400">{storageInfo.available}</div>
                          </div>
                          {storageInfo.reserved && storageInfo.reserved !== '0 B' && (
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">Reserved</div>
                              <div className="font-medium text-yellow-400">{storageInfo.reserved}</div>
                            </div>
                          )}
                          {storageInfo.inProgress && storageInfo.inProgress !== '0 B' && (
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">In Progress</div>
                              <div className="font-medium text-purple-400">{storageInfo.inProgress}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Multi-segment storage bar */}
                      <div className="w-48 h-2 bg-gray-600 rounded-full mt-2 relative overflow-hidden">
                        {(() => {
                          if (!storageInfo.details) return null;

                          const { usedBytes, reservedBytes, quotaBytes } = storageInfo.details;
                          const totalUsed = usedBytes || 0;
                          const totalReserved = reservedBytes || 0; // All reserved space (including in-progress)

                          // Calculate percentages
                          const usedPercent = quotaBytes > 0 ? (totalUsed / quotaBytes) * 100 : 0;
                          const reservedPercent = quotaBytes > 0 ? (totalReserved / quotaBytes) * 100 : 0;

                          return (
                            <div className="flex h-full w-full">
                              {/* Used Space (completed files) */}
                              {usedPercent > 0 && (
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                                  style={{ width: `${Math.min(usedPercent, 100)}%` }}
                                  title={`Used: ${storageInfo.used}`}
                                />
                              )}

                              {/* Reserved Space (all reserved space including downloads) */}
                              {reservedPercent > 0 && (
                                <div
                                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-300"
                                  style={{ width: `${Math.min(reservedPercent, 100 - usedPercent)}%` }}
                                  title={`Reserved: ${storageInfo.reserved}`}
                                />
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Storage bar legend */}
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mr-1"></div>
                          <span>Used</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full mr-1"></div>
                          <span>Reserved</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gray-600 rounded-full mr-1"></div>
                          <span>Free</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Status indicators */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  Online
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => onShowAdminPanel && onShowAdminPanel()}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-md transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    🛡️ Admin Panel
                  </button>
                )}
                <button
                  onClick={() => onShowPlansModal && onShowPlansModal()}
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
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
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700/50 py-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2 border-b border-gray-700/50">
                        <p className="text-xs text-gray-400">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                          onNavigate('home');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50 hover:text-red-300 transition-all duration-200 transform hover:translate-x-1"
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </span>
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
