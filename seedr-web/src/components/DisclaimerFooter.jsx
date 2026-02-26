import React from 'react';
import { Link } from 'react-router-dom';

const DisclaimerFooter = () => {
  return (
    <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">
            ⚠️ <strong>Disclaimer:</strong> MyPeerCloud does not host or index copyrighted content. Users are solely responsible for ensuring their
            downloads comply with applicable copyright laws. We respond to valid DMCA requests.
          </p>
          <div className="flex justify-center gap-6 text-xs text-gray-400">
            <Link
              to="/disclaimer"
              className="hover:text-purple-400 transition-colors underline"
            >
              Full Disclaimer
            </Link>
            <span className="text-gray-600">•</span>
            <span>© {new Date().getFullYear()} MyPeerCloud</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DisclaimerFooter;
