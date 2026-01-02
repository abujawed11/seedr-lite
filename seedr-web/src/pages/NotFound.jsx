import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full">
        {/* Animated Icon */}
        <div className="mb-8 relative">
          <div className="text-9xl font-extrabold text-gray-800 animate-pulse">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Lost in Space
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-white mb-4">Oops! Page Not Found</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </p>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-500/20 transform hover:-translate-y-1"
          >
            Go Back Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all border border-gray-700 transform hover:-translate-y-1"
          >
            Go Back
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
