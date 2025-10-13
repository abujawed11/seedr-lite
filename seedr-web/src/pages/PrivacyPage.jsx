// export default function PrivacyPage({ onNavigate }) {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
//       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         {/* Back Button */}
//         <button
//           onClick={() => onNavigate('home')}
//           className="mb-8 flex items-center text-gray-400 hover:text-white transition-colors"
//         >
//           <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//           </svg>
//           Back to Home
//         </button>

//         <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 md:p-12">
//           <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
//           <p className="text-gray-400 mb-8">Last Updated: January 2025</p>

//           <div className="space-y-8 text-gray-300">
//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
//               <p className="mb-4">
//                 At MyPeerCloud ("we," "our," or "us"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our Service.
//               </p>
//               <p>
//                 By using our Service, you consent to the data practices described in this policy.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

//               <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.1 Information You Provide</h3>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li><strong>Account Information:</strong> Username, email address, password (encrypted)</li>
//                 <li><strong>Payment Information:</strong> Billing details processed securely through Razorpay (we do not store credit card information)</li>
//                 <li><strong>Profile Information:</strong> Optional profile details you choose to provide</li>
//                 <li><strong>Communication:</strong> Messages you send to our support team</li>
//               </ul>

//               <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.2 Automatically Collected Information</h3>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li><strong>Usage Data:</strong> Files downloaded, storage usage, bandwidth consumption</li>
//                 <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
//                 <li><strong>Log Data:</strong> Access times, pages viewed, actions performed</li>
//                 <li><strong>Cookies:</strong> Session cookies and preference cookies (see Cookie Policy below)</li>
//               </ul>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
//               <p className="mb-4">We use the collected information for the following purposes:</p>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li><strong>Service Provision:</strong> To provide, maintain, and improve our Service</li>
//                 <li><strong>Account Management:</strong> To create and manage your account</li>
//                 <li><strong>Payment Processing:</strong> To process subscription payments and prevent fraud</li>
//                 <li><strong>Customer Support:</strong> To respond to your inquiries and provide technical support</li>
//                 <li><strong>Communication:</strong> To send service updates, security alerts, and promotional messages (you can opt-out)</li>
//                 <li><strong>Analytics:</strong> To understand usage patterns and improve user experience</li>
//                 <li><strong>Security:</strong> To detect and prevent fraudulent activity, abuse, and security threats</li>
//                 <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our Terms</li>
//               </ul>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
//               <p className="mb-4">We do not sell your personal information. We may share your data with:</p>

//               <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.1 Service Providers</h3>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li><strong>Payment Processors:</strong> Razorpay for secure payment processing</li>
//                 <li><strong>Cloud Infrastructure:</strong> Hosting providers for data storage and delivery</li>
//                 <li><strong>Analytics Services:</strong> For usage analysis and service improvement</li>
//                 <li><strong>Email Services:</strong> For sending transactional and marketing emails</li>
//               </ul>

//               <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.2 Legal Requirements</h3>
//               <p className="ml-4">
//                 We may disclose your information if required by law, court order, or government request, or to protect our rights, property, or safety.
//               </p>

//               <h3 className="text-xl font-semibold text-white mb-3 mt-4">4.3 Business Transfers</h3>
//               <p className="ml-4">
//                 In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
//               <p className="mb-4">
//                 We implement industry-standard security measures to protect your data:
//               </p>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li><strong>Encryption:</strong> All data transmission uses SSL/TLS encryption (HTTPS)</li>
//                 <li><strong>Password Protection:</strong> Passwords are hashed using bcrypt</li>
//                 <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms</li>
//                 <li><strong>Regular Audits:</strong> Security audits and vulnerability assessments</li>
//                 <li><strong>Secure Infrastructure:</strong> Data stored on secure, encrypted servers</li>
//               </ul>
//               <p className="mt-4 text-yellow-400">
//                 However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">6. Your Content Privacy</h2>
//               <p className="mb-4">
//                 Regarding files you upload or download through our Service:
//               </p>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li>Your files are stored privately and are not accessible to other users</li>
//                 <li>We do not monitor, scan, or review your content except as required by law or our Terms</li>
//                 <li>You retain all rights to your content</li>
//                 <li>We may access your content to provide technical support if you request it</li>
//                 <li>Content that violates our Terms or laws may be removed</li>
//               </ul>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
//               <p className="mb-4">
//                 We retain your information for as long as necessary to:
//               </p>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li>Provide the Service and maintain your account</li>
//                 <li>Comply with legal obligations</li>
//                 <li>Resolve disputes and enforce our agreements</li>
//               </ul>
//               <p className="mt-4">
//                 When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">8. Your Privacy Rights</h2>
//               <p className="mb-4">You have the following rights regarding your personal data:</p>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li><strong>Access:</strong> Request a copy of your personal data</li>
//                 <li><strong>Correction:</strong> Update or correct inaccurate information</li>
//                 <li><strong>Deletion:</strong> Request deletion of your account and data</li>
//                 <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
//                 <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
//                 <li><strong>Objection:</strong> Object to certain data processing activities</li>
//               </ul>
//               <p className="mt-4">
//                 To exercise these rights, contact us at privacy@mypeercloud.in
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">9. Cookies Policy</h2>
//               <p className="mb-4">
//                 We use cookies and similar tracking technologies to:
//               </p>
//               <ul className="list-disc list-inside space-y-2 ml-4">
//                 <li><strong>Essential Cookies:</strong> Required for authentication and Service functionality</li>
//                 <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
//                 <li><strong>Analytics Cookies:</strong> Understand how you use our Service</li>
//                 <li><strong>Marketing Cookies:</strong> Deliver relevant advertisements (with your consent)</li>
//               </ul>
//               <p className="mt-4">
//                 You can control cookies through your browser settings, but some Service features may not function properly if cookies are disabled.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">10. Third-Party Links</h2>
//               <p>
//                 Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">11. Children's Privacy</h2>
//               <p>
//                 Our Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">12. International Data Transfers</h2>
//               <p>
//                 Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">13. Changes to This Policy</h2>
//               <p>
//                 We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Service. Your continued use after such notice constitutes acceptance of the updated policy.
//               </p>
//             </section>

//             <section>
//               <h2 className="text-2xl font-semibold text-white mb-4">14. Contact Us</h2>
//               <p className="mb-2">
//                 If you have questions or concerns about this Privacy Policy or our data practices, please contact:
//               </p>
//               <ul className="space-y-1 ml-4">
//                 <li><strong>Email:</strong> privacy@mypeercloud.in</li>
//                 <li><strong>Data Protection Officer:</strong> dpo@mypeercloud.in</li>
//                 <li><strong>Address:</strong> [Your Business Address]</li>
//                 <li><strong>Phone:</strong> [Your Business Phone]</li>
//               </ul>
//             </section>
//           </div>

//           <div className="mt-12 pt-8 border-t border-gray-700">
//             <p className="text-sm text-gray-400 text-center">
//               Your privacy is important to us. We are committed to transparency and protecting your personal information.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }





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
            {/* 1. Scope & Controller */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Scope &amp; Controller</h2>
              <p className="mb-3">
                This Privacy Policy explains how <strong>MyPeerCloud</strong> (“<em>we</em>”, “<em>us</em>”, “<em>our</em>”)
                collects, uses, discloses, and safeguards personal data when you use our website, apps, and related services
                (the “<em>Service</em>”). It is designed to comply with major global frameworks, including
                <strong> GDPR/UK-GDPR</strong>, <strong>CCPA/CPRA</strong> (California), and India’s <strong>DPDP Act 2023</strong>.
              </p>
              <p className="mb-1"><strong>Data Controller:</strong> MyPeerCloud</p>
              <ul className="list-disc list-inside ml-4">
                <li>Email: privacy@mypeercloud.in</li>
                <li>Grievance Officer (India): dpo@mypeercloud.in</li>
                {/* <li>Address: [Your Business Address]</li> */}
              </ul>
            </section>

            {/* 2. Data We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold text-white mb-2">2.1 You Provide</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Account:</strong> username, email; password (hashed/bcrypted)</li>
                <li><strong>Billing:</strong> processed via payment gateways (e.g., Razorpay). We do not store full card data.</li>
                <li><strong>Support:</strong> messages/emails you send us</li>
                <li><strong>Optional Profile:</strong> any details you choose to add</li>
              </ul>
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.2 Collected Automatically</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Usage:</strong> transfers initiated, storage usage, bandwidth, error logs</li>
                <li><strong>Device/Log:</strong> IP, device type, OS, browser, timestamps, pages/actions</li>
                <li><strong>Cookies/SDKs:</strong> session/auth, preferences, analytics/marketing where permitted</li>
              </ul>
              <p className="mt-3">
                Files you transfer or store are treated as <strong>private user content</strong>; see “Your Content Privacy.”
              </p>
            </section>

            {/* 3. Lawful Bases (GDPR) */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Legal Bases for Processing</h2>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Contract:</strong> to provide and operate the Service</li>
                <li><strong>Consent:</strong> for cookies/marketing or where required by local law</li>
                <li><strong>Legitimate Interests:</strong> security, abuse prevention, product analytics</li>
                <li><strong>Legal Obligation:</strong> compliance, tax/accounting, requests from authorities</li>
              </ul>
            </section>

            {/* 4. How We Use */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. How We Use Your Information</h2>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Provide, maintain, and improve the Service</li>
                <li>Authenticate users and manage accounts/subscriptions</li>
                <li>Process payments and prevent fraud</li>
                <li>Respond to support and service communications</li>
                <li>Security monitoring, abuse detection, diagnostics</li>
                <li>Analytics and product development (aggregated/de-identified where possible)</li>
                <li>Comply with law and enforce our Terms</li>
              </ul>
            </section>

            {/* 5. Do Not Sell/Share + Marketing */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Marketing, Analytics &amp; “Do Not Sell/Share”</h2>
              <p className="mb-3">
                We do <strong>not</strong> sell your personal information for money. If we use advertising cookies or share
                identifiers with ad/analytics partners, that may constitute “<em>sharing</em>” under CPRA.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Opt-out of marketing emails at any time (unsubscribe link).</li>
                <li>Manage cookies/identifiers via <a href="/cookies" className="underline">Cookie Preferences</a>.</li>
                <li>California residents: you may exercise “Do Not Sell/Share” rights via <a href="/privacy-request" className="underline">Privacy Request</a>.</li>
              </ul>
            </section>

            {/* 6. Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Cookies &amp; Similar Technologies</h2>
              <p className="mb-3">We use:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Essential:</strong> login/session security, core functionality</li>
                <li><strong>Preferences:</strong> UI and language settings</li>
                <li><strong>Analytics/Ads:</strong> only with consent where required</li>
              </ul>
              <p className="mt-2">
                You can control cookies in your browser and via our <a href="/cookies" className="underline">Cookie Preferences</a>.
              </p>
            </section>

            {/* 7. Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Data Sharing &amp; Service Providers</h2>
              <p className="mb-3">
                We share personal data with trusted processors strictly to operate the Service:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Payments:</strong> Razorpay or other authorized processors</li>
                <li><strong>Cloud/Hosting &amp; CDN</strong></li>
                <li><strong>Analytics/Email:</strong> product analytics, error tracking, transactional email</li>
              </ul>
              <p className="mt-2">
                We require processors to protect data, act only on our instructions, and implement appropriate safeguards.
                We may also disclose information to comply with law, enforce terms, or protect rights/safety.
              </p>
            </section>

            {/* 8. Your Content Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Your Content Privacy</h2>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Your transferred files are private to your account and not publicly indexed by us.</li>
                <li>We do not monitor or scan content except (i) when required by law; (ii) to investigate abuse/security; or (iii) with your explicit support request.</li>
                <li>Content violating our Terms or law may be restricted or removed.</li>
              </ul>
            </section>

            {/* 9. International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. International Data Transfers</h2>
              <p>
                Your data may be processed outside your country. Where required, we use appropriate safeguards such as
                <strong> EU Standard Contractual Clauses (SCCs)</strong>, the UK <strong>IDTA/UK Addendum</strong>, or
                comparable mechanisms. We take steps to ensure an adequate level of protection.
              </p>
            </section>

            {/* 10. Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Data Retention</h2>
              <p className="mb-3">
                We keep personal data only as long as necessary for the purposes described or as required by law.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Account data: for your account lifetime and a short period after closure</li>
                <li>Billing records: per tax/accounting obligations</li>
                <li>Logs/security: short-term operational windows unless extended for investigations</li>
              </ul>
              <p className="mt-2">Upon account deletion, we delete or anonymize personal data within ~30 days unless retention is legally required.</p>
            </section>

            {/* 11. Security */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Security</h2>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>HTTPS/TLS, bcrypt-hashed passwords, least-privilege access controls</li>
                <li>Infrastructure hardening, audits, and vulnerability management</li>
              </ul>
              <p className="mt-2 text-yellow-400">No method of transmission/storage is 100% secure; we cannot guarantee absolute security.</p>
            </section>

            {/* 12. Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Your Privacy Rights</h2>
              <p className="mb-3">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Access/Know</strong> the data we hold about you</li>
                <li><strong>Correct/Rectify</strong> inaccurate data</li>
                <li><strong>Delete/Erase</strong> your personal data</li>
                <li><strong>Portability</strong> (receive a copy in a usable format)</li>
                <li><strong>Restrict/Object</strong> to certain processing (including marketing)</li>
                <li><strong>Withdraw Consent</strong> (where processing is based on consent)</li>
                <li><strong>Opt-out of Sale/Sharing</strong> (where applicable under CPRA)</li>
              </ul>
              <p className="mt-3">
                Exercise rights via <a href="/privacy-request" className="underline">Privacy Request Portal</a> or email
                <a href="mailto:privacy@mypeercloud.in" className="underline"> privacy@mypeercloud.in</a>. We may verify your identity.
                Authorized agent requests (CPRA) must include proof of authority.
              </p>
              <p className="mt-2">
                EU/UK: you may lodge a complaint with your supervisory authority. India: contact our Grievance Officer at
                <a href="mailto:dpo@mypeercloud.in" className="underline"> dpo@mypeercloud.in</a>.
              </p>
            </section>

            {/* 13. Children */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Children’s Privacy</h2>
              <p>
                The Service is intended for users <strong>18+</strong>. We do not knowingly collect personal data from
                children. If you believe a minor has provided data, contact us to delete it.
              </p>
            </section>

            {/* 14. Automated Decisions */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">14. Automated Decision-Making</h2>
              <p>We do <strong>not</strong> make decisions based solely on automated processing that produce legal or similarly significant effects.</p>
            </section>

            {/* 15. Changes */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">15. Changes to This Policy</h2>
              <p>
                We may update this Policy to reflect changes in law or our Service. Material changes will be notified in-app
                or by email. Continued use after notice signifies acceptance.
              </p>
            </section>

            {/* 16. Contact & DPO */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">16. Contact &amp; Grievance</h2>
              <ul className="space-y-1 ml-4">
                <li><strong>Email (Privacy):</strong> <a href="mailto:privacy@mypeercloud.in" className="underline">privacy@mypeercloud.in</a></li>
                <li><strong>Data Protection / Grievance Officer (India):</strong> <a href="mailto:dpo@mypeercloud.in" className="underline">dpo@mypeercloud.in</a></li>
                <li><strong>Support:</strong> <a href="mailto:support@mypeercloud.in" className="underline">support@mypeercloud.in</a></li>
                {/* <li><strong>Address:</strong> [Your Business Address] &nbsp; <strong>Phone:</strong> [Your Business Phone]</li> */}
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">
              We are committed to transparency and protecting your personal information worldwide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
