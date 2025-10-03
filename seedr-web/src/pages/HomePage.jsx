import { useState } from 'react';

export default function HomePage({ onNavigate }) {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('preferredCurrency') || 'USD';
  });

  const USD_TO_INR = 83;

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
  };

  const convertPrice = (usdPrice) => {
    if (currency === 'INR') {
      return Math.round(usdPrice * USD_TO_INR);
    }
    return usdPrice;
  };

  const formatPrice = (usdPrice) => {
    const price = convertPrice(usdPrice);
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `$${price}`;
  };

  const features = [
    {
      icon: '🚀',
      title: 'Lightning Fast Downloads',
      description: 'Download torrents at maximum speed with our optimized servers'
    },
    {
      icon: '☁️',
      title: 'Cloud Storage',
      description: 'Store your downloaded files securely in the cloud'
    },
    {
      icon: '🎬',
      title: 'Stream Anywhere',
      description: 'Stream videos directly without waiting for downloads'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your downloads are encrypted and completely private'
    },
    {
      icon: '📱',
      title: 'Multi-Device',
      description: 'Access your files from any device, anywhere'
    },
    {
      icon: '⚡',
      title: 'No Limits',
      description: 'Unlimited concurrent downloads based on your plan'
    }
  ];

  const plans = [
    {
      name: 'Free',
      priceUSD: 0,
      storage: '5 GB',
      downloads: '2',
      color: 'from-gray-600 to-gray-700'
    },
    {
      name: 'Basic',
      priceUSD: 4.99,
      storage: '25 GB',
      downloads: '5',
      color: 'from-blue-600 to-blue-700',
      popular: true
    },
    {
      name: 'Pro',
      priceUSD: 9.99,
      storage: '100 GB',
      downloads: '10',
      color: 'from-purple-600 to-purple-700'
    },
    {
      name: 'Premium',
      priceUSD: 19.99,
      storage: '500 GB',
      downloads: 'Unlimited',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Hero Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Download Torrents
              </span>
              <br />
              <span className="text-white">To The Cloud</span>
            </h1>

            {/* Hero Description */}
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto">
              Fast, secure, and reliable torrent downloads. Stream or download files from anywhere, anytime.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('register')}
                className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 rounded-xl transition-all shadow-2xl hover:shadow-yellow-500/50 hover:scale-105"
              >
                Get Started Free
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('features');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-8 py-4 text-lg font-semibold bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all border border-gray-700"
              >
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-3xl font-bold text-yellow-400">10K+</div>
                <div className="text-sm text-gray-400">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-400">50TB+</div>
                <div className="text-sm text-gray-400">Data Transferred</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">24/7</div>
                <div className="text-sm text-gray-400">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose Seedr Lite?
            </h2>
            <p className="text-xl text-gray-400">
              Everything you need for seamless torrent downloads
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400 mb-6">
              Choose the plan that fits your needs
            </p>

            {/* Currency Toggle */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center p-1 bg-gray-800 rounded-lg border border-gray-700">
                <button
                  onClick={() => handleCurrencyChange('USD')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    currency === 'USD'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  💵 USD
                </button>
                <button
                  onClick={() => handleCurrencyChange('INR')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    currency === 'INR'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  ₹ INR
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-gray-800 rounded-2xl border-2 overflow-hidden transition-all hover:scale-105 ${
                  plan.popular
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 text-xs font-bold px-4 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}

                <div className={`bg-gradient-to-br ${plan.color} p-6 text-white`}>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">
                      {plan.priceUSD === 0 ? (currency === 'INR' ? '₹0' : '$0') : formatPrice(plan.priceUSD)}
                    </span>
                    {plan.priceUSD !== 0 && <span className="text-sm ml-2">/month</span>}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {plan.storage} Storage
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {plan.downloads} Concurrent Downloads
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    HD Streaming
                  </div>

                  <button
                    onClick={() => onNavigate('register')}
                    className={`w-full mt-6 py-3 px-4 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 shadow-lg'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of users who trust Seedr Lite for their torrent downloads
          </p>
          <button
            onClick={() => onNavigate('register')}
            className="px-10 py-4 text-lg font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 rounded-xl transition-all shadow-2xl hover:shadow-yellow-500/50 hover:scale-105"
          >
            Create Free Account
          </button>
        </div>
      </section>

    </div>
  );
}
