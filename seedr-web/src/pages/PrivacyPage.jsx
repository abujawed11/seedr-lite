export default function PrivacyPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => onNavigate('home')}
          className="mb-8 flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: January 2025</p>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="mb-4">
                At MyPeerCloud ("we," "our," or "us"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our Service.
              </p>
              <p>
                By using our Service, you consent to the data practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Username, email address, password (encrypted)</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through Razorpay (we do not store credit card information)</li>
                <li><strong>Profile Information:</strong> Optional profile details you choose to provide</li>
                <li><strong>Communication:</strong> Messages you send to our support team</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Files downloaded, storage usage, bandwidth consumption</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                <li><strong>Log Data:</strong> Access times, pages viewed, actions performed</li>
                <li><strong>Cookies:</strong> Session cookies and preference cookies (see Cookie Policy below)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Service Provision:</strong> To provide, maintain, and improve our Service</li>
                <li><strong>Account Management:</strong> To create and manage your account</li>
                <li><strong>Payment Processing:</strong> To process subscription payments and prevent fraud</li>
                <li><strong>Customer Support:</strong> To respond to your inquiries and provide technical support</li>
                <li><strong>Communication:</strong> To send service updates, security alerts, and promotional messages (you can opt-out)</li>
                <li><strong>Analytics:</strong> To understand usage patterns and improve user experience</li>
                <li><strong>Security:</strong> To detect and prevent fraudulent activity, abuse, and security threats</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our Terms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
              <p className="mb-4">We do not sell your personal information. We may share your data with:</p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.1 Service Providers</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Payment Processors:</strong> Razorpay for secure payment processing</li>
                <li><strong>Cloud Infrastructure:</strong> Hosting providers for data storage and delivery</li>
                <li><strong>Analytics Services:</strong> For usage analysis and service improvement</li>
                <li><strong>Email Services:</strong> For sending transactional and marketing emails</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.2 Legal Requirements</h3>
              <p className="ml-4">
                We may disclose your information if required by law, court order, or government request, or to protect our rights, property, or safety.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.3 Business Transfers</h3>
              <p className="ml-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
              <p className="mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Encryption:</strong> All data transmission uses SSL/TLS encryption (HTTPS)</li>
                <li><strong>Password Protection:</strong> Passwords are hashed using bcrypt</li>
                <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms</li>
                <li><strong>Regular Audits:</strong> Security audits and vulnerability assessments</li>
                <li><strong>Secure Infrastructure:</strong> Data stored on secure, encrypted servers</li>
              </ul>
              <p className="mt-4 text-yellow-400">
                However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Your Content Privacy</h2>
              <p className="mb-4">
                Regarding files you upload or download through our Service:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your files are stored privately and are not accessible to other users</li>
                <li>We do not monitor, scan, or review your content except as required by law or our Terms</li>
                <li>You retain all rights to your content</li>
                <li>We may access your content to provide technical support if you request it</li>
                <li>Content that violates our Terms or laws may be removed</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
              <p className="mb-4">
                We retain your information for as long as necessary to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide the Service and maintain your account</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce our agreements</li>
              </ul>
              <p className="mt-4">
                When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Your Privacy Rights</h2>
              <p className="mb-4">You have the following rights regarding your personal data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Objection:</strong> Object to certain data processing activities</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us at privacy@mypeercloud.in
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Cookies Policy</h2>
              <p className="mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for authentication and Service functionality</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> Understand how you use our Service</li>
                <li><strong>Marketing Cookies:</strong> Deliver relevant advertisements (with your consent)</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings, but some Service features may not function properly if cookies are disabled.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Third-Party Links</h2>
              <p>
                Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Children's Privacy</h2>
              <p>
                Our Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Service. Your continued use after such notice constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">14. Contact Us</h2>
              <p className="mb-2">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact:
              </p>
              <ul className="space-y-1 ml-4">
                <li><strong>Email:</strong> privacy@mypeercloud.in</li>
                <li><strong>Data Protection Officer:</strong> dpo@mypeercloud.in</li>
                <li><strong>Address:</strong> [Your Business Address]</li>
                <li><strong>Phone:</strong> [Your Business Phone]</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">
              Your privacy is important to us. We are committed to transparency and protecting your personal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
