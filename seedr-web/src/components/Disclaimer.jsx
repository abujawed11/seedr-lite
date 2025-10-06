import React from 'react';

const Disclaimer = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-700">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">Disclaimer</h1>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Service Description</h2>
            <p className="leading-relaxed">
              This website operates as a <strong>torrent client and cloud downloader</strong> that allows users
              to download files using torrent technology (magnet links and .torrent files) through our server infrastructure.
              We provide a technical service similar to other torrent clients like qBittorrent, Transmission, or Seedr.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">No Content Hosting or Distribution</h2>
            <p className="leading-relaxed">
              We <strong>do not host, store, index, or distribute</strong> any copyrighted content such as movies,
              TV shows, music, software, games, or other protected materials. Our service acts purely as a
              <strong> technical intermediary</strong> that facilitates peer-to-peer file transfers requested by users.
              All downloaded files are temporarily stored for the user's convenience and are not publicly accessible
              or shared by our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">User Responsibility</h2>
            <p className="leading-relaxed">
              Users are <strong>solely and entirely responsible</strong> for the content they choose to download,
              stream, or share using this service. By using our platform, you agree that:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>You will only download content that you have legal rights to access</li>
              <li>You will comply with all applicable copyright laws in your jurisdiction</li>
              <li>You will not use this service to infringe upon intellectual property rights</li>
              <li>You understand that downloading copyrighted material without permission may be illegal in your country</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Anti-Piracy Stance</h2>
            <p className="leading-relaxed">
              This service <strong>does not endorse, encourage, or support piracy</strong> in any form.
              Torrent technology is a legitimate file-sharing protocol used for distributing open-source software,
              public domain content, large datasets, and legally shareable files. We strongly encourage users to
              respect copyright laws and only download content they are legally permitted to access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">DMCA Compliance and Content Removal</h2>
            <p className="leading-relaxed">
              We take intellectual property rights seriously. If you are a copyright holder and believe that
              content accessible through our service infringes your rights, please contact us immediately.
              Upon receiving a valid DMCA notice or copyright complaint, we will:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>Promptly remove or disable access to the allegedly infringing material</li>
              <li>Investigate and take appropriate action against abusive accounts</li>
              <li>Suspend or terminate repeat offenders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Limitation of Liability</h2>
            <p className="leading-relaxed">
              By using this service, you acknowledge and agree that we are not liable for any misuse of the platform,
              legal consequences arising from downloading copyrighted material, or any damages resulting from your use
              of the service. Users assume all risks associated with their activities on this platform.
            </p>
          </section>

          <section className="border-t border-white/20 pt-6 mt-8">
            <p className="text-sm text-gray-300">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              If you have questions about this disclaimer, please contact us through our support channels.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => onNavigate ? onNavigate('home') : window.location.href = '/'}
            className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-lg
                     hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 transition-all duration-300 font-semibold
                     shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
