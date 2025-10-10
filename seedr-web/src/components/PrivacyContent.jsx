// export default function PrivacyContent() {
//   return (
//     <div className="space-y-6 text-sm">
//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h3>
//         <p className="mb-2 text-gray-300">We collect the following information:</p>
//         <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
//           <li><strong>Account Information:</strong> Username, email address, password (encrypted)</li>
//           <li><strong>Payment Information:</strong> Processed securely through Razorpay (we don't store card details)</li>
//           <li><strong>Usage Data:</strong> IP address, browser type, device information, download activity</li>
//           <li><strong>Cookies:</strong> For authentication, preferences, and analytics</li>
//         </ul>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h3>
//         <p className="mb-2 text-gray-300">We use your information to:</p>
//         <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
//           <li>Provide and maintain the Service</li>
//           <li>Process payments and manage subscriptions</li>
//           <li>Send service-related notifications</li>
//           <li>Improve our Service and user experience</li>
//           <li>Comply with legal obligations and enforce our Terms</li>
//           <li>Prevent fraud and ensure security</li>
//         </ul>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">3. Data Sharing and Third Parties</h3>
//         <p className="mb-2 text-gray-300">We may share your data with:</p>
//         <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
//           <li><strong>Payment Processors:</strong> Razorpay (for payment processing)</li>
//           <li><strong>Cloud Providers:</strong> For hosting and storage</li>
//           <li><strong>Analytics Services:</strong> To understand service usage</li>
//           <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
//         </ul>
//         <p className="mt-3 text-yellow-300">
//           ⚠️ We <strong>do NOT sell</strong> your personal information to third parties.
//         </p>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">4. Data Security</h3>
//         <p className="mb-2 text-gray-300">We implement security measures including:</p>
//         <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
//           <li><strong>SSL/TLS Encryption:</strong> All data transmission is encrypted (HTTPS)</li>
//           <li><strong>Password Hashing:</strong> Passwords are hashed using bcrypt</li>
//           <li><strong>Access Controls:</strong> Restricted access to user data</li>
//           <li><strong>Regular Security Audits:</strong> To identify and fix vulnerabilities</li>
//         </ul>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">5. Your Privacy Rights</h3>
//         <p className="mb-2 text-gray-300">You have the right to:</p>
//         <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
//           <li><strong>Access:</strong> Request a copy of your personal data</li>
//           <li><strong>Correction:</strong> Update or correct inaccurate information</li>
//           <li><strong>Deletion:</strong> Request deletion of your account and data</li>
//           <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
//           <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
//         </ul>
//         <p className="mt-3 text-gray-300">
//           To exercise these rights, contact: <a href="mailto:privacy@mypeercloud.in" className="text-blue-400 hover:underline">privacy@mypeercloud.in</a>
//         </p>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">6. Cookies Policy</h3>
//         <p className="mb-2 text-gray-300">We use cookies for:</p>
//         <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
//           <li><strong>Essential:</strong> Authentication and security (required)</li>
//           <li><strong>Preference:</strong> Remember your settings</li>
//           <li><strong>Analytics:</strong> Understand how you use the Service</li>
//           <li><strong>Marketing:</strong> Show relevant ads (if applicable)</li>
//         </ul>
//         <p className="mt-3 text-gray-300">
//           You can manage cookie preferences in your browser settings.
//         </p>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">7. Data Retention</h3>
//         <p className="text-gray-300">
//           We retain your data for as long as your account is active. When you delete your account, we will delete or anonymize your personal information within <strong className="text-yellow-400">30 days</strong>, except where required by law.
//         </p>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">8. Children's Privacy</h3>
//         <p className="text-gray-300">
//           Our Service is not intended for users under <strong className="text-yellow-400">18 years old</strong>. We do not knowingly collect information from children. If we discover that we have collected data from a child, we will delete it immediately.
//         </p>
//       </section>

//       <section>
//         <h3 className="text-lg font-semibold text-white mb-3">9. International Data Transfers</h3>
//         <p className="text-gray-300">
//           Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data.
//         </p>
//       </section>

//       <section className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mt-6">
//         <p className="text-sm text-blue-300">
//           <strong>GDPR & CCPA Compliant:</strong> We comply with the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA).
//         </p>
//       </section>

//       <section className="border-t border-gray-700 pt-4 mt-6">
//         <p className="text-xs text-gray-400">
//           <strong>Last Updated:</strong> January 2025
//         </p>
//         <p className="text-xs text-gray-400 mt-2">
//           For privacy inquiries, contact: <a href="mailto:privacy@mypeercloud.in" className="text-blue-400 hover:underline">privacy@mypeercloud.in</a> or <a href="mailto:dpo@mypeercloud.in" className="text-blue-400 hover:underline">dpo@mypeercloud.in</a> (Data Protection Officer)
//         </p>
//       </section>
//     </div>
//   );
// }




export default function PrivacyContent() {
  return (
    <div className="space-y-6 text-sm">
      {/* 0. Quick Note */}
      <section className="rounded-lg border border-gray-700 p-3 bg-gray-800/40">
        <p className="text-gray-300">
          This is a short privacy summary shown during sign-up. For full details, see our{" "}
          <a href="/privacy" className="text-blue-400 underline hover:no-underline">Privacy Policy</a>.
        </p>
      </section>

      {/* 1. What We Collect */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h3>
        <p className="mb-2 text-gray-300">We collect:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Account:</strong> username, email; password (hashed/bcrypted)</li>
          <li><strong>Payments:</strong> processed securely by gateways (e.g., Razorpay). We don’t store full card data.</li>
          <li><strong>Usage &amp; Device:</strong> IP, browser/OS, device info, session/log data, transfer activity</li>
          <li><strong>Cookies/IDs:</strong> auth/session, preferences, and (with consent where required) analytics/ads</li>
        </ul>
      </section>

      {/* 2. How We Use It + Lawful Bases */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h3>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li>Provide, secure, and maintain the Service</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send service notices and respond to support</li>
          <li>Prevent fraud/abuse; ensure platform security</li>
          <li>Analytics and product improvement (where permitted)</li>
          <li>Legal compliance and enforcement of Terms</li>
        </ul>
        <p className="mt-2 text-gray-300">
          <span className="font-semibold">Legal bases (where applicable):</span> contract (to provide the Service), consent
          (cookies/marketing or where required), legitimate interests (security, analytics), and legal obligation.
        </p>
      </section>

      {/* 3. Sharing */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">3. Sharing with Third Parties</h3>
        <p className="mb-2 text-gray-300">We share data with trusted processors strictly to operate the Service:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Payments:</strong> Razorpay or other authorized processors</li>
          <li><strong>Cloud/Hosting/CDN</strong> providers</li>
          <li><strong>Analytics/Email:</strong> product analytics, error tracking, transactional email</li>
          <li><strong>Legal/Compliance:</strong> when required by law or to protect rights/safety</li>
        </ul>
        <p className="mt-3 text-yellow-300">
          We <strong>do not sell</strong> your personal information. In regions with “share” definitions (e.g., CPRA), you can opt out via{" "}
          <a href="/privacy-request" className="text-blue-400 underline hover:no-underline">Privacy Request</a>.
        </p>
      </section>

      {/* 4. Security */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">4. Security</h3>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>HTTPS/TLS</strong> for data in transit</li>
          <li><strong>Password hashing</strong> (bcrypt)</li>
          <li><strong>Least-privilege access</strong> and audit logs</li>
          <li><strong>Regular hardening &amp; vulnerability checks</strong></li>
        </ul>
        <p className="mt-2 text-gray-300">
          No method is 100% secure. If we become aware of a data breach affecting you, we’ll notify you as required by law.
        </p>
      </section>

      {/* 5. Your Rights & Choices */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">5. Your Rights &amp; Choices</h3>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Access/Know</strong> the data we hold</li>
          <li><strong>Correct</strong> inaccurate data</li>
          <li><strong>Delete</strong> your account/data</li>
          <li><strong>Portability</strong> (export your data)</li>
          <li><strong>Object/Restrict</strong> certain processing (including marketing)</li>
          <li><strong>Withdraw consent</strong> where processing relies on consent</li>
          <li><strong>Do Not Sell/Share</strong> (where applicable under CPRA)</li>
        </ul>
        <p className="mt-2 text-gray-300">
          Use our <a href="/privacy-request" className="text-blue-400 underline hover:no-underline">Privacy Request</a> page or email{" "}
          <a href="mailto:privacy@mypeercloud.in" className="text-blue-400 underline hover:no-underline">privacy@mypeercloud.in</a>. 
          India users may also contact our Grievance Officer at{" "}
          <a href="mailto:dpo@mypeercloud.in" className="text-blue-400 underline hover:no-underline">dpo@mypeercloud.in</a>.
        </p>
      </section>

      {/* 6. Cookies */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">6. Cookies &amp; Preferences</h3>
        <p className="mb-2 text-gray-300">We use:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Essential</strong> (required for login/security)</li>
          <li><strong>Preferences</strong> (remember settings)</li>
          <li><strong>Analytics/Ads</strong> (only with consent where required)</li>
        </ul>
        <p className="mt-2 text-gray-300">
          Manage choices in your browser and via{" "}
          <a href="/cookies" className="text-blue-400 underline hover:no-underline">Cookie Preferences</a>.
        </p>
      </section>

      {/* 7. Retention */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">7. Data Retention</h3>
        <p className="text-gray-300">
          We keep personal data only as long as needed for the purposes above or as required by law. After account deletion,
          we delete or anonymize personal data within <strong className="text-yellow-400">~30 days</strong>, unless retention is legally required.
        </p>
      </section>

      {/* 8. Children */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">8. Children’s Privacy</h3>
        <p className="text-gray-300">
          The Service is for users <strong className="text-yellow-400">18+</strong>. We do not knowingly collect data from children. 
          If you believe a minor provided data, contact us to delete it.
        </p>
      </section>

      {/* 9. International Transfers */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">9. International Transfers</h3>
        <p className="text-gray-300">
          Your data may be processed in other countries. Where required, we use safeguards such as{" "}
          <strong>EU Standard Contractual Clauses</strong> / UK IDTA or equivalent mechanisms.
        </p>
      </section>

      {/* 10. Consent & Links */}
      <section className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          By creating an account, you acknowledge this summary and consent to processing as described. 
          You can withdraw consent where applicable without affecting prior lawful processing. 
          See the full{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </section>

      {/* Meta */}
      <section className="border-t border-gray-700 pt-4">
        <p className="text-xs text-gray-400">
          <strong>Last Updated:</strong> January 2025
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Privacy:{" "}
          <a href="mailto:privacy@mypeercloud.in" className="text-blue-400 underline hover:no-underline">
            privacy@mypeercloud.in
          </a>{" "}
          | DPO/Grievance (India):{" "}
          <a href="mailto:dpo@mypeercloud.in" className="text-blue-400 underline hover:no-underline">
            dpo@mypeercloud.in
          </a>
        </p>
      </section>
    </div>
  );
}
