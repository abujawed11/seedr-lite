// import React from 'react';

// const Disclaimer = ({ onNavigate }) => {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
//       <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-700">
//         <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">Disclaimer</h1>

//         <div className="space-y-6 text-gray-300">
//           <section>
//             <h2 className="text-2xl font-semibold text-white mb-3">Service Description</h2>
//             <p className="leading-relaxed">
//               This website operates as a <strong>torrent client and cloud downloader</strong> that allows users
//               to download files using torrent technology (magnet links and .torrent files) through our server infrastructure.
//               We provide a technical service similar to other torrent clients like qBittorrent, Transmission, or Seedr.
//             </p>
//           </section>

//           <section>
//             <h2 className="text-2xl font-semibold text-white mb-3">No Content Hosting or Distribution</h2>
//             <p className="leading-relaxed">
//               We <strong>do not host, store, index, or distribute</strong> any copyrighted content such as movies,
//               TV shows, music, software, games, or other protected materials. Our service acts purely as a
//               <strong> technical intermediary</strong> that facilitates peer-to-peer file transfers requested by users.
//               All downloaded files are temporarily stored for the user's convenience and are not publicly accessible
//               or shared by our platform.
//             </p>
//           </section>

//           <section>
//             <h2 className="text-2xl font-semibold text-white mb-3">User Responsibility</h2>
//             <p className="leading-relaxed">
//               Users are <strong>solely and entirely responsible</strong> for the content they choose to download,
//               stream, or share using this service. By using our platform, you agree that:
//             </p>
//             <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
//               <li>You will only download content that you have legal rights to access</li>
//               <li>You will comply with all applicable copyright laws in your jurisdiction</li>
//               <li>You will not use this service to infringe upon intellectual property rights</li>
//               <li>You understand that downloading copyrighted material without permission may be illegal in your country</li>
//             </ul>
//           </section>

//           <section>
//             <h2 className="text-2xl font-semibold text-white mb-3">Anti-Piracy Stance</h2>
//             <p className="leading-relaxed">
//               This service <strong>does not endorse, encourage, or support piracy</strong> in any form.
//               Torrent technology is a legitimate file-sharing protocol used for distributing open-source software,
//               public domain content, large datasets, and legally shareable files. We strongly encourage users to
//               respect copyright laws and only download content they are legally permitted to access.
//             </p>
//           </section>

//           <section>
//             <h2 className="text-2xl font-semibold text-white mb-3">DMCA Compliance and Content Removal</h2>
//             <p className="leading-relaxed">
//               We take intellectual property rights seriously. If you are a copyright holder and believe that
//               content accessible through our service infringes your rights, please contact us immediately.
//               Upon receiving a valid DMCA notice or copyright complaint, we will:
//             </p>
//             <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
//               <li>Promptly remove or disable access to the allegedly infringing material</li>
//               <li>Investigate and take appropriate action against abusive accounts</li>
//               <li>Suspend or terminate repeat offenders</li>
//             </ul>
//           </section>

//           <section>
//             <h2 className="text-2xl font-semibold text-white mb-3">Limitation of Liability</h2>
//             <p className="leading-relaxed">
//               By using this service, you acknowledge and agree that we are not liable for any misuse of the platform,
//               legal consequences arising from downloading copyrighted material, or any damages resulting from your use
//               of the service. Users assume all risks associated with their activities on this platform.
//             </p>
//           </section>

//           <section className="border-t border-white/20 pt-6 mt-8">
//             <p className="text-sm text-gray-300">
//               <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', {
//                 year: 'numeric',
//                 month: 'long',
//                 day: 'numeric'
//               })}
//             </p>
//             <p className="text-sm text-gray-300 mt-2">
//               If you have questions about this disclaimer, please contact us through our support channels.
//             </p>
//           </section>
//         </div>

//         <div className="mt-8 text-center">
//           <button
//             onClick={() => onNavigate ? onNavigate('home') : window.location.href = '/'}
//             className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-lg
//                      hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 transition-all duration-300 font-semibold
//                      shadow-lg hover:shadow-xl transform hover:scale-105"
//           >
//             Back to Home
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Disclaimer;



import React from 'react';
import { useNavigate } from 'react-router-dom';

const Disclaimer = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-700">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">
          Disclaimer
        </h1>

        <div className="space-y-6 text-gray-300">
          {/* 1) Service Description */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Service Description</h2>
            <p className="leading-relaxed">
              MyPeerCloud operates as a <strong>cloud-based downloader and torrent client</strong> that enables users to
              remotely fetch and store files through peer-to-peer (P2P) technology such as magnet links or .torrent files.
              MyPeerCloud <strong>acts solely as a neutral technology intermediary</strong> that provides infrastructure
              for lawful file transfers and private storage. We do not initiate or control the transfer, selection, or
              modification of any user-generated content.
            </p>
          </section>

          {/* 2) No Hosting / Distribution */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">No Content Hosting or Public Distribution</h2>
            <p className="leading-relaxed">
              We <strong>do not host, index, catalogue, share, or distribute</strong> any copyrighted or illegal content,
              including but not limited to movies, TV shows, software, or music. Files transferred through our platform are
              stored privately for each user and are not publicly accessible. Our servers perform only the
              <strong> technical process of data transmission or caching</strong> to complete user-initiated requests.
            </p>
          </section>

          {/* 3) Temporary Caching */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Temporary Caching and Retention</h2>
            <p className="leading-relaxed">
              Any temporary caching of data is performed solely to ensure technical functionality and performance.
              All cached or downloaded data are <strong>automatically deleted after a limited retention period</strong> or
              upon user deletion, in accordance with applicable data-retention and privacy standards.
            </p>
          </section>

          {/* 4) User Responsibility */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">User Responsibility</h2>
            <p className="leading-relaxed">
              Users are <strong>fully responsible</strong> for ensuring that any content they download, upload, or store
              complies with applicable copyright and intellectual-property laws in their respective countries. By using
              MyPeerCloud, you agree that:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>You will access only content that you have lawful rights to use or share.</li>
              <li>You will comply with all copyright and content laws in your jurisdiction.</li>
              <li>You will not use this Service for unlawful, infringing, or harmful purposes.</li>
              <li>You acknowledge that unauthorized downloading of copyrighted material may be illegal where you live.</li>
            </ul>
          </section>

          {/* 5) Anti-Piracy */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Anti-Piracy Policy</h2>
            <p className="leading-relaxed">
              MyPeerCloud <strong>does not endorse, encourage, or facilitate piracy</strong> in any form. P2P technology is
              a legitimate protocol used globally for open-source projects, academic data, and lawful content distribution.
              We actively promote responsible and lawful use of this technology.
            </p>
          </section>

          {/* 6) Safe-Harbor / Intermediary Status */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Intermediary &amp; Safe-Harbor Notice</h2>
            <p className="leading-relaxed">
              MyPeerCloud provides neutral cloud-infrastructure services. Consistent with international safe-harbor
              principles (including but not limited to the U.S. DMCA §512, EU Directive 2000/31/EC, India IT Act §79, and
              similar intermediary-liability regimes), we respond promptly to valid takedown requests and cooperate with
              rights-holders and authorities as required by law.
            </p>
          </section>

          {/* 7) DMCA / Copyright Notices */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Copyright &amp; Content Removal</h2>
            <p className="leading-relaxed">
              We respect intellectual-property rights worldwide. If you are a rights-holder and believe material accessible
              through this Service infringes your rights, please send a detailed notice to{' '}
              <a className="underline hover:no-underline" href="mailto:dmca@mypeercloud.in">dmca@mypeercloud.in</a>.
              Your notice should include identification of the copyrighted work, the allegedly infringing material, your
              contact information, a statement of good-faith belief, and a declaration of accuracy under penalty of perjury.
              Upon receipt of a valid notice, we will:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>Remove or disable access to the identified material promptly.</li>
              <li>Notify the affected user (if applicable) and allow counter-notification per law.</li>
              <li>Terminate repeat infringing accounts in appropriate cases.</li>
            </ul>
          </section>

          {/* 8) Cooperation with Law Enforcement */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Cooperation with Law Enforcement</h2>
            <p className="leading-relaxed">
              We may preserve or disclose information when legally required to comply with valid subpoenas, court orders,
              or lawful government requests, or to detect, prevent, or address security and abuse issues.
            </p>
          </section>

          {/* 9) Related Policies */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Related Policies</h2>
            <p className="leading-relaxed">
              Use of this Service is also governed by our{' '}
              <a href="/terms" className="underline hover:no-underline">Terms&nbsp;&amp;&nbsp;Conditions</a>,{' '}
              <a href="/privacy" className="underline hover:no-underline">Privacy&nbsp;Policy</a>, and{' '}
              <a href="/dmca" className="underline hover:no-underline">DMCA&nbsp;Policy</a>.
            </p>
          </section>

          {/* 10) Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Governing Law</h2>
            <p className="leading-relaxed">
              This Disclaimer and the use of MyPeerCloud shall be governed by the <strong>applicable laws of the
              user’s jurisdiction and general international law principles</strong>. Where permissible, disputes may be
              resolved through arbitration or in competent courts of the operator’s domicile, without prejudice to
              mandatory consumer-protection rights in the user’s country of residence.
            </p>
          </section>

          {/* 11) Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the fullest extent allowed by law, MyPeerCloud is provided “AS IS” without warranties of any kind.
              We are not liable for indirect, incidental, consequential, or punitive damages, nor for user misuse or
              unlawful activity. Users bear sole responsibility for their actions and compliance with local laws.
            </p>
          </section>

          {/* Footer meta */}
          <section className="border-t border-white/20 pt-6 mt-8">
            <p className="text-sm text-gray-300">
              <strong>Last Updated:</strong>{' '}
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              For questions or legal notices, contact:{' '}
              <a className="underline hover:no-underline" href="mailto:support@mypeercloud.in">support@mypeercloud.in</a>{' '}
              | <a className="underline hover:no-underline" href="mailto:dmca@mypeercloud.in">dmca@mypeercloud.in</a>{' '}
              | <a className="underline hover:no-underline" href="mailto:legal@mypeercloud.in">legal@mypeercloud.in</a>
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-lg hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
