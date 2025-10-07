export default function TermsPage({ onNavigate }) {
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
          <h1 className="text-4xl font-bold text-white mb-4">Terms and Conditions</h1>
          <p className="text-gray-400 mb-8">Last Updated: January 2025</p>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="mb-4">
                Welcome to MyPeerCloud ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of our cloud-based torrent downloading service, including our website, mobile applications, and related services (collectively, the "Service").
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Account Registration</h2>
              <p className="mb-4">
                To use certain features of the Service, you must register for an account. When you register, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate and current</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
              <p className="mt-4">
                You must be at least 18 years old to create an account and use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Acceptable Use Policy</h2>
              <p className="mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Upload, download, or share any content that infringes upon intellectual property rights</li>
                <li>Use the Service to distribute copyrighted material without authorization</li>
                <li>Upload or distribute malware, viruses, or other harmful code</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Use the Service for any illegal activities or to violate any laws</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Resell or redistribute the Service without our written permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Subscription Plans and Payments</h2>
              <p className="mb-4">
                We offer various subscription plans with different features and storage limits. By subscribing to a paid plan:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You agree to pay all fees associated with your chosen plan</li>
                <li>Payments are processed through Razorpay, our secure payment gateway</li>
                <li>Subscriptions automatically renew unless canceled before the renewal date</li>
                <li>All fees are non-refundable except as required by law or stated in our Refund Policy</li>
                <li>We reserve the right to change our pricing with 30 days' notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Storage and Content</h2>
              <p className="mb-4">
                Your subscription plan determines your storage quota. We reserve the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Delete files if your account exceeds storage limits</li>
                <li>Remove inactive files after 30 days of account inactivity</li>
                <li>Remove content that violates these Terms or applicable laws</li>
                <li>Terminate accounts that repeatedly violate our policies</li>
              </ul>
              <p className="mt-4">
                You are solely responsible for maintaining backups of your content. We are not liable for any loss of data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Intellectual Property</h2>
              <p className="mb-4">
                You retain all rights to content you upload to the Service. By uploading content, you grant us a limited license to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Store and process your content to provide the Service</li>
                <li>Create backups and derivatives necessary for Service operation</li>
                <li>Display your content to you through our platform</li>
              </ul>
              <p className="mt-4">
                All Service software, trademarks, and related intellectual property are owned by MyPeerCloud or our licensors.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Termination</h2>
              <p className="mb-4">
                We may suspend or terminate your account at any time if you:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violate these Terms or our Acceptable Use Policy</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Fail to pay subscription fees when due</li>
                <li>Create multiple accounts to bypass limitations</li>
              </ul>
              <p className="mt-4">
                You may cancel your account at any time through your account settings. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
              <p className="mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The Service is provided "AS IS" without warranties of any kind</li>
                <li>We are not liable for any indirect, incidental, or consequential damages</li>
                <li>Our total liability shall not exceed the amount you paid in the last 12 months</li>
                <li>We are not responsible for content uploaded by users or third-party services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Dispute Resolution</h2>
              <p className="mb-4">
                Any disputes arising from these Terms or the Service shall be resolved through:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Good faith negotiation between the parties</li>
                <li>Mediation if negotiation fails</li>
                <li>Arbitration in accordance with applicable laws</li>
              </ul>
              <p className="mt-4">
                These Terms are governed by the laws of India, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Information</h2>
              <p className="mb-2">
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="space-y-1 ml-4">
                <li>Email: legal@mypeercloud.com</li>
                <li>Address: [Your Business Address]</li>
                <li>Phone: [Your Business Phone]</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">
              By using MyPeerCloud, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
