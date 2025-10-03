export default function RefundPage({ onNavigate }) {
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
          <h1 className="text-4xl font-bold text-white mb-4">Refund and Cancellation Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: January 2025</p>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Overview</h2>
              <p className="mb-4">
                At Seedr-Lite, we want you to be completely satisfied with our Service. This Refund and Cancellation Policy outlines the terms and conditions for subscription cancellations and refund requests.
              </p>
              <p>
                We encourage you to try our Free plan before subscribing to a paid plan to ensure our Service meets your needs.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Subscription Cancellation</h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.1 How to Cancel</h3>
              <p className="mb-4">
                You can cancel your subscription at any time through:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your Account Settings → Subscription → Cancel Subscription</li>
                <li>Contacting our support team at support@seedr-lite.com</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.2 Effect of Cancellation</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Upon cancellation, your subscription will remain active until the end of the current billing period</li>
                <li>You will continue to have access to your paid plan features until the expiry date</li>
                <li>After expiry, your account will automatically downgrade to the Free plan</li>
                <li>No further charges will be made after cancellation</li>
                <li>Your data will be retained according to the Free plan storage limits</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.3 No Automatic Renewal</h3>
              <p className="ml-4">
                Once you cancel, your subscription will NOT automatically renew. You can resubscribe at any time by choosing a plan from your account dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Refund Policy</h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">3.1 7-Day Money-Back Guarantee</h3>
              <p className="mb-4">
                We offer a <strong className="text-green-400">7-day money-back guarantee</strong> for all first-time paid subscriptions:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>If you are not satisfied with our Service, you can request a full refund within 7 days of your initial purchase</li>
                <li>This guarantee applies only to your first paid subscription</li>
                <li>Subsequent renewals and plan changes are not eligible for the 7-day guarantee</li>
                <li>Refunds will be processed within 5-7 business days to your original payment method</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">3.2 Pro-Rated Refunds</h3>
              <p className="mb-4">
                We may offer pro-rated refunds in the following exceptional circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Service Outages:</strong> Extended downtime exceeding our SLA (99% uptime)</li>
                <li><strong>Billing Errors:</strong> Incorrect charges or duplicate payments</li>
                <li><strong>Technical Issues:</strong> Persistent technical problems preventing Service use</li>
              </ul>
              <p className="mt-4 ml-4">
                Pro-rated refunds are calculated based on the unused portion of your subscription and are issued at our discretion after investigation.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">3.3 Non-Refundable Situations</h3>
              <p className="mb-4">
                Refunds will NOT be provided in the following cases:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Subscription renewals (after the initial 7-day period)</li>
                <li>Account termination due to Terms of Service violations</li>
                <li>Change of mind after the 7-day guarantee period</li>
                <li>Partial month usage ("I didn't use the Service much")</li>
                <li>Lack of awareness of auto-renewal (clearly stated at purchase)</li>
                <li>Failure to cancel before renewal date</li>
                <li>Dissatisfaction with torrent speeds (dependent on seeders/peers)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. How to Request a Refund</h2>
              <p className="mb-4">
                To request a refund within the 7-day guarantee period:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Email us at <strong className="text-blue-400">refunds@seedr-lite.com</strong></li>
                <li>Include your account email and transaction ID</li>
                <li>Briefly explain your reason for the refund request</li>
                <li>Our team will review and respond within 24-48 hours</li>
                <li>Approved refunds will be processed within 5-7 business days</li>
              </ol>

              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <p className="text-blue-300">
                  <strong>Important:</strong> Please note that Razorpay (our payment processor) may take an additional 5-10 business days to credit the refund to your account, depending on your bank.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Plan Downgrades</h2>
              <p className="mb-4">
                If you downgrade from a higher plan to a lower plan:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The downgrade will take effect at the end of your current billing period</li>
                <li>No refund will be issued for the unused portion of your current plan</li>
                <li>You will retain access to your current plan features until the billing period ends</li>
                <li>If your storage usage exceeds the new plan's limit, you will be notified to reduce usage before the downgrade</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Plan Upgrades</h2>
              <p className="mb-4">
                If you upgrade from a lower plan to a higher plan:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The upgrade takes effect immediately</li>
                <li>You will be charged the pro-rated amount for the remainder of the billing period</li>
                <li>Future renewals will be charged at the new plan rate</li>
                <li>Your increased storage and features are available immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Payment Failures</h2>
              <p className="mb-4">
                If a payment fails during renewal:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We will attempt to charge your payment method up to 3 times over 7 days</li>
                <li>You will receive email notifications about failed payments</li>
                <li>If all retry attempts fail, your account will downgrade to the Free plan</li>
                <li>Your data will be retained according to Free plan limits</li>
                <li>You can resubscribe at any time by updating your payment method</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Billing Disputes</h2>
              <p className="mb-4">
                If you notice an incorrect charge or billing issue:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Contact us immediately at billing@seedr-lite.com</li>
                <li>Provide transaction details and description of the issue</li>
                <li>We will investigate within 48 hours</li>
                <li>Legitimate billing errors will be corrected and refunded promptly</li>
              </ol>

              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-300">
                  <strong>Note:</strong> Please contact us before initiating a chargeback with your bank. Chargebacks may result in account suspension and additional fees. We're committed to resolving all billing issues fairly and quickly.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Free Plan Users</h2>
              <p>
                Free plan users are not charged any fees. There are no refunds or cancellations applicable to free accounts. You may delete your account at any time through Account Settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Annual Subscriptions</h2>
              <p className="mb-4">
                For annual subscription plans:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The 7-day money-back guarantee applies to the full annual fee</li>
                <li>After the 7-day period, annual subscriptions are non-refundable</li>
                <li>You can cancel to prevent auto-renewal for the next year</li>
                <li>Pro-rated refunds may be considered for exceptional circumstances (see Section 3.2)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Policy Changes</h2>
              <p>
                We reserve the right to modify this Refund and Cancellation Policy at any time. Changes will be effective immediately upon posting. Continued use of the Service after changes constitutes acceptance of the modified policy. Material changes will be communicated via email.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Information</h2>
              <p className="mb-2">
                For questions about refunds, cancellations, or billing:
              </p>
              <ul className="space-y-1 ml-4">
                <li><strong>Refunds:</strong> refunds@seedr-lite.com</li>
                <li><strong>Billing Issues:</strong> billing@seedr-lite.com</li>
                <li><strong>General Support:</strong> support@seedr-lite.com</li>
                <li><strong>Phone:</strong> [Your Business Phone] (Mon-Fri, 9 AM - 6 PM IST)</li>
                <li><strong>Address:</strong> [Your Business Address]</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-400 mb-3">Our Commitment to You</h3>
              <p className="text-gray-300">
                We stand behind the quality of our Service. If you experience any issues or are unsatisfied with Seedr-Lite, please reach out to us. We're here to help and will work with you to resolve any concerns. Your satisfaction is our priority.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
