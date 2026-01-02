export default function AboutUsPage({ onNavigate }) {
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
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
              About MyPeerCloud
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Your fast, affordable, and secure cloud-based file management solution
            </p>
          </div>

          <div className="space-y-10 text-gray-300">
            {/* What We Do */}
            <section>
              <h2 className="text-3xl font-semibold text-white mb-4">What We Do</h2>
              <p className="text-lg leading-relaxed mb-4">
                <strong>MyPeerCloud</strong> is a high-performance cloud-based downloading and storage service that enables users
                to download files at lightning speed and access them from anywhere. We eliminate the need for expensive hardware,
                slow downloads, and storage limitations by providing a powerful cloud infrastructure that works instantly in your browser.
              </p>
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-6 mt-4">
                <p className="text-green-300 text-lg font-semibold mb-2">
                  🎁 Get Started FREE Today!
                </p>
                <p className="text-gray-300">
                  We believe everyone deserves access to fast cloud storage. That's why we offer <strong className="text-white">5 GB of FREE storage</strong> to
                  all users - no credit card required, no strings attached. Experience the speed and convenience of cloud downloads
                  before deciding to upgrade.
                </p>
              </div>
            </section>

            {/* Why Choose MyPeerCloud */}
            <section>
              <h2 className="text-3xl font-semibold text-white mb-6">Why Choose MyPeerCloud</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Speed */}
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Lightning-Fast Performance</h3>
                  </div>
                  <p className="text-gray-300">
                    Download files at maximum speed using our optimized server infrastructure. No more waiting hours for large files -
                    our cloud does the heavy lifting while you stream or download instantly.
                  </p>
                </div>

                {/* Affordability */}
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Extremely Affordable</h3>
                  </div>
                  <p className="text-gray-300">
                    Start with <strong className="text-green-300">5 GB FREE</strong>, then upgrade to paid plans starting at just
                    <strong className="text-green-300"> $4.99/month</strong> (₹414/month). Premium storage without premium prices.
                  </p>
                </div>

                {/* Instant Access */}
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Instant Access</h3>
                  </div>
                  <p className="text-gray-300">
                    No software installation, no configuration, no hassle. Works directly in your browser on any device.
                    Sign up and start downloading in under 60 seconds.
                  </p>
                </div>

                {/* Security */}
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Secure & Private</h3>
                  </div>
                  <p className="text-gray-300">
                    Your files are encrypted with SSL/TLS and stored privately. Only you have access to your data.
                    We never scan, monitor, or share your content.
                  </p>
                </div>

                {/* Multi-Device */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Access Anywhere</h3>
                  </div>
                  <p className="text-gray-300">
                    Your files are available on any device - desktop, laptop, tablet, or smartphone. Download to the cloud once,
                    stream or download anywhere, anytime.
                  </p>
                </div>

                {/* No Limits */}
                <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 border border-pink-500/30 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Smart Downloads</h3>
                  </div>
                  <p className="text-gray-300">
                    Multiple concurrent downloads based on your plan. Download multiple files simultaneously without slowdowns
                    or bottlenecks.
                  </p>
                </div>
              </div>
            </section>

            {/* Our Technology */}
            <section>
              <h2 className="text-3xl font-semibold text-white mb-4">Built for Performance</h2>
              <p className="text-lg leading-relaxed mb-6">
                MyPeerCloud is built using modern web technologies and optimized infrastructure to deliver the fastest possible
                download and streaming experience. Our technical foundation ensures reliability, speed, and security.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <h4 className="font-semibold text-white mb-2">⚡ High-Speed Servers</h4>
                  <p className="text-sm text-gray-400">Optimized download engines with intelligent routing</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <h4 className="font-semibold text-white mb-2">🔒 SSL/TLS Encryption</h4>
                  <p className="text-sm text-gray-400">Bank-grade security for all data transfers</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <h4 className="font-semibold text-white mb-2">☁️ Cloud Infrastructure</h4>
                  <p className="text-sm text-gray-400">Scalable, reliable storage systems</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <h4 className="font-semibold text-white mb-2">📊 Real-Time Tracking</h4>
                  <p className="text-sm text-gray-400">Live progress updates and status monitoring</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <h4 className="font-semibold text-white mb-2">🎬 Instant Streaming</h4>
                  <p className="text-sm text-gray-400">Stream videos without waiting for downloads</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <h4 className="font-semibold text-white mb-2">🔄 99.9% Uptime</h4>
                  <p className="text-sm text-gray-400">Reliable service you can count on</p>
                </div>
              </div>
            </section>

            {/* Pricing Transparency */}
            <section>
              <h2 className="text-3xl font-semibold text-white mb-4">Transparent, Affordable Pricing</h2>
              <p className="text-lg leading-relaxed mb-6">
                No hidden fees, no surprises. Choose a plan that fits your needs and upgrade or downgrade anytime.
              </p>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-5 border border-gray-600 hover:border-gray-500 transition-colors">
                  <h4 className="font-semibold text-white text-lg mb-1">Free</h4>
                  <p className="text-2xl font-bold text-green-400 mb-3">$0<span className="text-sm text-gray-400">/month</span></p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ 5 GB Storage</li>
                    <li>✓ 2 Concurrent Downloads</li>
                    <li>✓ Full Features</li>
                  </ul>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-5 border border-blue-500/50 hover:border-blue-400 transition-colors">
                  <h4 className="font-semibold text-white text-lg mb-1">Basic</h4>
                  <p className="text-2xl font-bold text-blue-400 mb-3">$4.99<span className="text-sm text-gray-400">/month</span></p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ 25 GB Storage</li>
                    <li>✓ 3 Concurrent Downloads</li>
                    <li>✓ Priority Support</li>
                  </ul>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-5 border border-purple-500/50 hover:border-purple-400 transition-colors">
                  <h4 className="font-semibold text-white text-lg mb-1">Pro</h4>
                  <p className="text-2xl font-bold text-purple-400 mb-3">$9.99<span className="text-sm text-gray-400">/month</span></p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ 100 GB Storage</li>
                    <li>✓ 5 Concurrent Downloads</li>
                    <li>✓ Premium Support</li>
                  </ul>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-5 border border-yellow-500/50 hover:border-yellow-400 transition-colors">
                  <h4 className="font-semibold text-white text-lg mb-1">Premium</h4>
                  <p className="text-2xl font-bold text-yellow-400 mb-3">$19.99<span className="text-sm text-gray-400">/month</span></p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✓ 500 GB Storage</li>
                    <li>✓ 8 Concurrent Downloads</li>
                    <li>✓ VIP Support</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Our Values */}
            <section>
              <h2 className="text-3xl font-semibold text-white mb-4">Our Core Values</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <span className="text-blue-400 text-lg">⚡</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Performance First</h4>
                    <p className="text-gray-400">We obsess over speed and reliability. Every feature is optimized for maximum performance.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <span className="text-green-400 text-lg">💰</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Affordability & Transparency</h4>
                    <p className="text-gray-400">Quality service shouldn't break the bank. Clear pricing, no hidden fees, no surprises.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <span className="text-orange-400 text-lg">🔒</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Privacy & Security</h4>
                    <p className="text-gray-400">Your data is yours alone. We use enterprise-grade encryption and never access your files.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <span className="text-purple-400 text-lg">⚖️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Legal Compliance</h4>
                    <p className="text-gray-400">We comply with DMCA, respect copyright laws, and require users to download only legal content.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <span className="text-pink-400 text-lg">💬</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Customer Satisfaction</h4>
                    <p className="text-gray-400">24/7 support, responsive communication, and continuous improvement based on user feedback.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Our Commitment */}
            <section className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-8">
              <h2 className="text-3xl font-semibold text-white mb-4 text-center">Our Commitment to You</h2>
              <div className="grid md:grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-4xl mb-2">🚀</div>
                  <h4 className="font-semibold text-white mb-2">Fast & Reliable</h4>
                  <p className="text-gray-300 text-sm">Maximum download speeds with 99.9% uptime guarantee</p>
                </div>
                <div>
                  <div className="text-4xl mb-2">💎</div>
                  <h4 className="font-semibold text-white mb-2">No Hidden Fees</h4>
                  <p className="text-gray-300 text-sm">Transparent pricing with no surprise charges or extra costs</p>
                </div>
                <div>
                  <div className="text-4xl mb-2">🛡️</div>
                  <h4 className="font-semibold text-white mb-2">Secure Platform</h4>
                  <p className="text-gray-300 text-sm">Enterprise-grade security protecting your data and privacy</p>
                </div>
                <div>
                  <div className="text-4xl mb-2">💪</div>
                  <h4 className="font-semibold text-white mb-2">Continuous Improvement</h4>
                  <p className="text-gray-300 text-sm">Regular updates, new features, and performance enhancements</p>
                </div>
              </div>
            </section>

            {/* Contact & Support */}
            <section>
              <h2 className="text-3xl font-semibold text-white mb-4">Get in Touch</h2>
              <p className="text-lg leading-relaxed mb-6">
                We're here to help! Whether you have questions, need support, or want to provide feedback, our team is ready to assist you.
              </p>
              <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-blue-400 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Email Support</h4>
                      <a href="mailto:support@mypeercloud.in" className="text-blue-400 hover:underline">support@mypeercloud.in</a>
                      <p className="text-sm text-gray-400 mt-1">Response within 24 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-yellow-400 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-white mb-1">24/7 Availability</h4>
                      <p className="text-gray-300">Round-the-clock support</p>
                      <p className="text-sm text-gray-400 mt-1">Priority support for paid users</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-600 text-center">
                  <p className="text-gray-400 mb-4">Connect with us on social media</p>
                  <div className="flex justify-center space-x-4">
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-all">
                      <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-blue-400 transition-all">
                      <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-pink-600 transition-all">
                      <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                      </svg>
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-all">
                      <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer CTA */}
          <div className="mt-12 pt-8 border-t border-gray-700 text-center">
            <h3 className="text-2xl font-semibold text-white mb-4">Ready to Experience Fast Cloud Downloads?</h3>
            <p className="text-gray-400 mb-6">Join thousands of users who trust MyPeerCloud for fast, secure, and affordable cloud storage.</p>
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Get Started with 5 GB FREE
            </button>
            <p className="text-sm text-gray-400 mt-4">No credit card required • Instant activation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
