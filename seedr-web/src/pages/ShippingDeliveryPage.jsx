export default function ShippingDeliveryPage({ onNavigate }) {
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
          <h1 className="text-4xl font-bold text-white mb-4">Shipping & Delivery Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: January 2025</p>

          <div className="space-y-8 text-gray-300">
            {/* 1. Nature of Service */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Digital Service Delivery</h2>
              <p className="mb-4">
                <strong>MyPeerCloud</strong> is a <strong>100% digital cloud-based service</strong>. We provide instant access
                to cloud storage and file management capabilities through our online platform. There are <strong>no physical
                products or goods shipped</strong> as part of our service.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                <p className="text-blue-300">
                  <span className="font-semibold">📦 No Physical Delivery:</span> Since our service is entirely digital,
                  traditional shipping and delivery terms do not apply. You receive instant access to our platform upon
                  successful subscription activation.
                </p>
              </div>
            </section>

            {/* 2. Service Activation */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Service Activation & Access</h2>
              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.1 Instant Activation</h3>
              <p className="mb-3">
                Upon successful payment verification and account creation, your access to MyPeerCloud services is activated
                <strong> immediately and automatically</strong>. No waiting period or manual processing is required.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.2 Access Delivery Timeline</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Free Plan:</strong> Instant activation upon email verification</li>
                <li><strong>Paid Plans (Basic/Pro/Premium):</strong> Instant activation within 1-5 minutes of successful payment confirmation</li>
                <li><strong>Upgrade Requests:</strong> Processed and activated within 24-48 hours after manual review and approval</li>
                <li><strong>Service Features:</strong> All plan features become available immediately upon activation</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.3 Access Method</h3>
              <p className="mb-3">You can access your MyPeerCloud account through:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Web Browser:</strong> Login at <a href="https://mypeercloud.in" className="text-blue-400 hover:underline">https://mypeercloud.in</a> from any device</li>
                <li><strong>Supported Platforms:</strong> Desktop, laptop, tablet, and mobile devices</li>
                <li><strong>Operating Systems:</strong> Windows, macOS, Linux, iOS, Android</li>
                <li><strong>Browsers:</strong> Chrome, Firefox, Safari, Edge, and other modern browsers</li>
              </ul>
            </section>

            {/* 3. Service Delivery Confirmation */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Service Delivery Confirmation</h2>
              <p className="mb-3">
                You will receive the following confirmations upon service activation:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Email Confirmation:</strong> Sent to your registered email address with account details</li>
                <li><strong>Account Dashboard:</strong> Immediate access to your account dashboard showing active plan</li>
                <li><strong>Storage Quota:</strong> Your allocated storage space will be immediately available for use</li>
                <li><strong>Feature Access:</strong> All plan-specific features will be unlocked and ready to use</li>
              </ul>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                <p className="text-green-300">
                  <span className="font-semibold">✅ Instant Confirmation:</span> You can verify successful delivery by
                  logging into your account and checking your active plan status in the dashboard.
                </p>
              </div>
            </section>

            {/* 4. Delivery Delays or Issues */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Potential Delivery Delays & Resolution</h2>
              <p className="mb-3">
                While our service activation is automated and instant, occasional delays may occur due to:
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.1 Common Delay Causes</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Payment Gateway Processing:</strong> Bank or payment provider verification delays (typically 2-10 minutes)</li>
                <li><strong>Email Verification Pending:</strong> Awaiting user confirmation of email address</li>
                <li><strong>Manual Review Requirements:</strong> Upgrade requests requiring admin approval (24-48 hours)</li>
                <li><strong>Technical Issues:</strong> Rare server or system maintenance activities</li>
                <li><strong>Security Checks:</strong> Additional verification for fraud prevention</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.2 Resolution Steps</h3>
              <p className="mb-3">
                If you experience any delay in service activation beyond the expected timeframe:
              </p>
              <ol className="list-decimal list-inside ml-4 space-y-2">
                <li><strong>Check Email:</strong> Verify your spam/junk folder for activation emails</li>
                <li><strong>Verify Payment:</strong> Confirm payment was successfully processed with your bank/payment method</li>
                <li><strong>Clear Browser Cache:</strong> Logout and login again, clear cache and cookies</li>
                <li><strong>Contact Support:</strong> Email <a href="mailto:support@mypeercloud.in" className="text-blue-400 hover:underline">support@mypeercloud.in</a> with your order/transaction details</li>
                <li><strong>Support Response Time:</strong> We respond within 24 hours and resolve issues within 48 hours</li>
              </ol>
            </section>

            {/* 5. Failed Delivery */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Failed Service Activation</h2>
              <p className="mb-3">
                In the rare event of failed service activation due to system errors:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Automatic Retry:</strong> Our system automatically retries activation for technical failures</li>
                <li><strong>Payment Refund:</strong> If activation cannot be completed, full refund will be processed per our <button onClick={() => onNavigate('refund')} className="text-blue-400 hover:underline">Refund Policy</button></li>
                <li><strong>Alternative Solutions:</strong> Our support team will work with you to resolve activation issues</li>
                <li><strong>Guaranteed Resolution:</strong> We guarantee activation within 48 hours or full refund</li>
              </ul>
            </section>

            {/* 6. Geographic Availability */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Geographic Availability & Access</h2>
              <p className="mb-3">
                <strong>Global Service Delivery:</strong> MyPeerCloud services are accessible worldwide, subject to the
                following conditions:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Worldwide Access:</strong> Available in all countries except where prohibited by law or sanctions</li>
                <li><strong>Internet Requirement:</strong> Active internet connection required to access services</li>
                <li><strong>Language Support:</strong> Primary interface in English; additional languages may be added</li>
                <li><strong>Performance:</strong> Service performance may vary based on user location and internet connectivity</li>
                <li><strong>Legal Restrictions:</strong> Users must comply with local laws and regulations</li>
              </ul>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                <p className="text-yellow-300">
                  <span className="font-semibold">⚠️ Note:</span> We reserve the right to restrict or deny service in
                  regions where legal compliance cannot be guaranteed or where sanctions apply.
                </p>
              </div>
            </section>

            {/* 7. Service Interruptions */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Service Continuity & Interruptions</h2>
              <p className="mb-3">
                While we strive for 99.9% uptime, occasional service interruptions may occur:
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">7.1 Planned Maintenance</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Advance Notice:</strong> Scheduled maintenance announced 48 hours in advance</li>
                <li><strong>Timing:</strong> Typically performed during low-traffic hours</li>
                <li><strong>Duration:</strong> Usually completed within 1-4 hours</li>
                <li><strong>No Service Credits:</strong> Planned maintenance is part of normal operations</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">7.2 Unexpected Downtime</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Priority Resolution:</strong> Technical team works immediately to restore service</li>
                <li><strong>Status Updates:</strong> Real-time updates provided via email and status page</li>
                <li><strong>Compensation:</strong> Extended downtime ({">"}4 hours) may qualify for service credits or refunds</li>
              </ul>
            </section>

            {/* 8. Subscription Period & Renewals */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Subscription Period & Service Continuity</h2>
              <p className="mb-3">
                Service delivery continues throughout your active subscription period:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Subscription Duration:</strong> Monthly, quarterly, or annual based on selected plan</li>
                <li><strong>Automatic Renewal:</strong> Services continue uninterrupted with auto-renewal (if enabled)</li>
                <li><strong>Manual Renewal:</strong> Renewal reminders sent 7 days before expiry</li>
                <li><strong>Grace Period:</strong> 48-hour grace period to renew before account downgrade</li>
                <li><strong>Expiry Handling:</strong> Account reverts to free plan if not renewed within grace period</li>
              </ul>
            </section>

            {/* 9. Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Support & Assistance</h2>
              <p className="mb-3">
                For any questions or issues regarding service delivery and access:
              </p>
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-400">Email Support</p>
                    <a href="mailto:support@mypeercloud.in" className="text-blue-400 hover:underline">support@mypeercloud.in</a>
                  </div>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-400">Support Hours</p>
                    <p className="text-white">24/7 (Response within 24 hours)</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-400">Technical Support</p>
                    <p className="text-white">Priority support for paid plan users</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 10. Policy Updates */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Policy Updates</h2>
              <p>
                We may update this Shipping & Delivery Policy from time to time to reflect changes in our services or
                legal requirements. Material changes will be communicated via email or in-app notifications. Your
                continued use of the service after such changes constitutes acceptance of the updated policy.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">
              For additional information, please review our{' '}
              <button onClick={() => onNavigate('terms')} className="text-blue-400 hover:underline">Terms & Conditions</button>,{' '}
              <button onClick={() => onNavigate('refund')} className="text-blue-400 hover:underline">Refund Policy</button>, and{' '}
              <button onClick={() => onNavigate('privacy')} className="text-blue-400 hover:underline">Privacy Policy</button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
