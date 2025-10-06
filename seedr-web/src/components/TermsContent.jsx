export default function TermsContent() {
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">1. Introduction</h3>
        <p className="mb-3">
          Welcome to Seedr-Lite. By accessing or using our cloud-based torrent downloading service, you agree to be bound by these Terms and Conditions.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">2. Account Registration</h3>
        <p className="mb-2">To use the Service, you must register for an account. When you register, you agree to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Accept responsibility for all activities under your account</li>
          <li>You must be at least <strong className="text-yellow-400">18 years old</strong> to use the Service</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">3. Acceptable Use Policy</h3>
        <p className="mb-2 text-yellow-300 font-medium">⚠️ You agree NOT to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li><strong className="text-red-400">Upload, download, or share content that infringes intellectual property rights</strong></li>
          <li><strong className="text-red-400">Use the Service to distribute copyrighted material without authorization</strong></li>
          <li>Upload or distribute malware, viruses, or harmful code</li>
          <li>Attempt unauthorized access to our systems or other users' accounts</li>
          <li>Use the Service for illegal activities or to violate any laws</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Resell or redistribute the Service without permission</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">4. Subscription Plans and Payments</h3>
        <p className="mb-2">By subscribing to a paid plan:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li>You agree to pay all fees associated with your chosen plan</li>
          <li>Payments are processed through Razorpay</li>
          <li>Subscriptions auto-renew unless canceled before renewal date</li>
          <li>All fees are non-refundable except as stated in our Refund Policy</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">5. Storage and Content</h3>
        <p className="mb-2">Your subscription determines your storage quota. We reserve the right to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li>Delete files if your account exceeds storage limits</li>
          <li>Remove inactive files after 30 days of inactivity</li>
          <li>Remove content that violates these Terms or applicable laws</li>
          <li>Terminate accounts that repeatedly violate our policies</li>
        </ul>
        <p className="mt-3 text-yellow-300">
          You are solely responsible for maintaining backups. We are not liable for data loss.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">6. Intellectual Property</h3>
        <p className="text-gray-300">
          You retain all rights to content you upload. By uploading content, you grant us a limited license to store and process your content to provide the Service.
        </p>
        <p className="mt-3 text-gray-300">
          Our Service name, logo, and all related materials are protected by intellectual property laws. You may not use them without permission.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">7. Termination</h3>
        <p className="mb-2 text-gray-300">
          We may suspend or terminate your account if you:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
          <li>Violate these Terms</li>
          <li>Engage in fraudulent activity</li>
          <li>Fail to pay subscription fees</li>
          <li>Repeatedly infringe intellectual property rights</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">8. Limitation of Liability</h3>
        <p className="text-gray-300">
          The Service is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">9. Governing Law</h3>
        <p className="text-gray-300">
          These Terms are governed by the laws of India. Any disputes will be resolved in the courts of Bangalore, Karnataka, India.
        </p>
      </section>

      <section className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mt-6">
        <p className="text-sm text-yellow-300">
          <strong>Important:</strong> By clicking "I agree" you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </p>
      </section>

      <section className="border-t border-gray-700 pt-4 mt-6">
        <p className="text-xs text-gray-400">
          <strong>Last Updated:</strong> January 2025
        </p>
        <p className="text-xs text-gray-400 mt-2">
          For questions, contact: <a href="mailto:legal@seedr-lite.com" className="text-blue-400 hover:underline">legal@seedr-lite.com</a>
        </p>
      </section>
    </div>
  );
}
