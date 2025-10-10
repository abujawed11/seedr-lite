export default function Footer({ onNavigate, isAuthenticated }) {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    if (isAuthenticated) {
      return; // Don't scroll if user is authenticated (not on home page)
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <img
                src="/mypeercloud.png"
                alt="MyPeerCloud"
                width="50"
                height="50"
                className="mr-3"
              />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                MyPeerCloud
              </h3>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Fast, secure, and reliable cloud-based torrent downloading service. Download to the cloud and stream from anywhere.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    scrollToTop();
                    scrollToSection('features');
                  }}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    scrollToTop();
                    scrollToSection('pricing');
                  }}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate(isAuthenticated ? 'dashboard' : 'register')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  {isAuthenticated ? 'Dashboard' : 'Sign Up'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate('login')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  {isAuthenticated ? 'Account' : 'Login'}
                </button>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate && onNavigate('contact')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <a href="mailto:support@mypeercloud.in" className="text-gray-400 hover:text-white transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate && onNavigate('terms')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate('privacy')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate('refund')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate('dmca')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  DMCA Takedown
                </button>
              </li>
              <li>
                <a href="mailto:legal@mypeercloud.in" className="text-gray-400 hover:text-white transition-colors">
                  Legal Inquiries
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center md:justify-start">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href="mailto:support@mypeercloud.in" className="text-gray-400 hover:text-white transition-colors">
                support@mypeercloud.in
              </a>
            </div>
            <div className="flex items-center justify-center md:justify-end text-gray-400">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              24/7 Support Available
            </div>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              <p>&copy; {currentYear} MyPeerCloud. All rights reserved.</p>
            </div>

            {/* Social Media Icons */}
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-all transform hover:scale-110"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-400 transition-all transform hover:scale-110"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-pink-600 transition-all transform hover:scale-110"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-all transform hover:scale-110"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Additional Legal Info */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>
              MyPeerCloud is committed to protecting copyrights. We comply with the Digital Millennium Copyright Act (DMCA).
              <br />
              For copyright concerns, please contact: <a href="mailto:dmca@mypeercloud.in" className="text-blue-400 hover:text-blue-300">dmca@mypeercloud.in</a>
            </p>
            <p className="mt-2">
              Payments secured by <span className="text-blue-400">Razorpay</span> | SSL Certified | ISO 27001 Compliant
            </p>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="mt-8 border-t border-gray-800 pt-6">
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-yellow-400 text-lg mr-2">⚠️</span>
                <strong className="text-yellow-300">Disclaimer:</strong> This service acts as a torrent client only.
                We do not host, store, or distribute copyrighted content. Users are solely responsible for ensuring their
                downloads comply with applicable copyright laws and intellectual property rights.
              </p>
              <div className="flex justify-center gap-6 text-xs">
                <button
                  onClick={() => onNavigate && onNavigate('disclaimer')}
                  className="text-yellow-300 hover:text-yellow-200 transition-colors underline font-medium"
                >
                  Read Full Disclaimer
                </button>
                <span className="text-gray-600">•</span>
                <button
                  onClick={() => onNavigate && onNavigate('terms')}
                  className="text-gray-400 hover:text-white transition-colors underline"
                >
                  Terms of Service
                </button>
                <span className="text-gray-600">•</span>
                <button
                  onClick={() => onNavigate && onNavigate('privacy')}
                  className="text-gray-400 hover:text-white transition-colors underline"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
