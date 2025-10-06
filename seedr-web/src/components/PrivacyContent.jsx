export default function PrivacyContent() {
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h3>
        <p className="mb-2 text-gray-300">We collect the following information:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Account Information:</strong> Username, email address, password (encrypted)</li>
          <li><strong>Payment Information:</strong> Processed securely through Razorpay (we don't store card details)</li>
          <li><strong>Usage Data:</strong> IP address, browser type, device information, download activity</li>
          <li><strong>Cookies:</strong> For authentication, preferences, and analytics</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h3>
        <p className="mb-2 text-gray-300">We use your information to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li>Provide and maintain the Service</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send service-related notifications</li>
          <li>Improve our Service and user experience</li>
          <li>Comply with legal obligations and enforce our Terms</li>
          <li>Prevent fraud and ensure security</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">3. Data Sharing and Third Parties</h3>
        <p className="mb-2 text-gray-300">We may share your data with:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Payment Processors:</strong> Razorpay (for payment processing)</li>
          <li><strong>Cloud Providers:</strong> For hosting and storage</li>
          <li><strong>Analytics Services:</strong> To understand service usage</li>
          <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
        </ul>
        <p className="mt-3 text-yellow-300">
          ⚠️ We <strong>do NOT sell</strong> your personal information to third parties.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">4. Data Security</h3>
        <p className="mb-2 text-gray-300">We implement security measures including:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>SSL/TLS Encryption:</strong> All data transmission is encrypted (HTTPS)</li>
          <li><strong>Password Hashing:</strong> Passwords are hashed using bcrypt</li>
          <li><strong>Access Controls:</strong> Restricted access to user data</li>
          <li><strong>Regular Security Audits:</strong> To identify and fix vulnerabilities</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">5. Your Privacy Rights</h3>
        <p className="mb-2 text-gray-300">You have the right to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your account and data</li>
          <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
          <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
        </ul>
        <p className="mt-3 text-gray-300">
          To exercise these rights, contact: <a href="mailto:privacy@seedr-lite.com" className="text-blue-400 hover:underline">privacy@seedr-lite.com</a>
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">6. Cookies Policy</h3>
        <p className="mb-2 text-gray-300">We use cookies for:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong>Essential:</strong> Authentication and security (required)</li>
          <li><strong>Preference:</strong> Remember your settings</li>
          <li><strong>Analytics:</strong> Understand how you use the Service</li>
          <li><strong>Marketing:</strong> Show relevant ads (if applicable)</li>
        </ul>
        <p className="mt-3 text-gray-300">
          You can manage cookie preferences in your browser settings.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">7. Data Retention</h3>
        <p className="text-gray-300">
          We retain your data for as long as your account is active. When you delete your account, we will delete or anonymize your personal information within <strong className="text-yellow-400">30 days</strong>, except where required by law.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">8. Children's Privacy</h3>
        <p className="text-gray-300">
          Our Service is not intended for users under <strong className="text-yellow-400">18 years old</strong>. We do not knowingly collect information from children. If we discover that we have collected data from a child, we will delete it immediately.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">9. International Data Transfers</h3>
        <p className="text-gray-300">
          Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data.
        </p>
      </section>

      <section className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-300">
          <strong>GDPR & CCPA Compliant:</strong> We comply with the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA).
        </p>
      </section>

      <section className="border-t border-gray-700 pt-4 mt-6">
        <p className="text-xs text-gray-400">
          <strong>Last Updated:</strong> January 2025
        </p>
        <p className="text-xs text-gray-400 mt-2">
          For privacy inquiries, contact: <a href="mailto:privacy@seedr-lite.com" className="text-blue-400 hover:underline">privacy@seedr-lite.com</a> or <a href="mailto:dpo@seedr-lite.com" className="text-blue-400 hover:underline">dpo@seedr-lite.com</a> (Data Protection Officer)
        </p>
      </section>
    </div>
  );
}
