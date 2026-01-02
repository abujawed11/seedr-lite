import { useState, useEffect } from 'react';
import { getPlans, createPaymentOrder, verifyPayment } from '../api';

export default function PlansModal({ isOpen, onClose, currentPlan, onUpgradeSuccess }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('monthly'); // 'monthly' or 'yearly'
  const [currency, setCurrency] = useState(() => {
    // Load currency preference from localStorage
    return localStorage.getItem('preferredCurrency') || 'USD';
  });

  // Currency conversion rate (approximate - you can update this)
  const USD_TO_INR = 83; // 1 USD = 83 INR (update as needed)

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const response = await getPlans();
      setPlans(response.plans || []);
    } catch (err) {
      setError('Failed to load plans');
      console.error('Error fetching plans:', err);
    }
  };

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSelectPlan = async (planId, duration) => {
    setLoading(true);
    setError('');

    try {
      // Create Razorpay order
      const orderData = await createPaymentOrder(planId, duration, currency);

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'MyPeerCloud',
        description: `${plans.find(p => p.id === planId)?.name} Plan - ${duration === 'yearly' ? 'Yearly' : 'Monthly'}`,
        image: '/mypeercloud.png', // Your logo
        order_id: orderData.order.id,
        prefill: {
          name: orderData.user.name,
          email: orderData.user.email
        },
        theme: {
          color: '#F59E0B' // Orange/yellow color matching your theme
        },
        handler: async function (response) {
          // Payment successful - verify on backend
          try {
            setLoading(true);
            const verifyData = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            console.log('Payment verified:', verifyData);
            alert('🎉 Payment successful! Your plan has been upgraded.');

            // Call success callback to refresh user data
            if (onUpgradeSuccess) {
              onUpgradeSuccess(verifyData);
            }

            onClose();
          } catch (err) {
            console.error('Payment verification failed:', err);
            setError(err.response?.data?.error || 'Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            console.log('Payment cancelled by user');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate payment');
      console.error('Payment initiation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (color) => {
    const colors = {
      gray: 'from-gray-600 to-gray-700',
      blue: 'from-blue-600 to-blue-700',
      purple: 'from-purple-600 to-purple-700',
      gold: 'from-yellow-500 to-yellow-600'
    };
    return colors[color] || colors.gray;
  };

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

  const formatPrice = (price) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `$${price}`;
  };

  const calculatePrice = (monthlyPrice, duration) => {
    let price = monthlyPrice;
    if (duration === 'yearly') {
      price = Math.round(monthlyPrice * 12 * 0.8); // 20% discount for yearly
    }
    return convertPrice(price);
  };

  const getPriceLabel = (monthlyPrice, duration) => {
    const price = calculatePrice(monthlyPrice, duration);
    const period = duration === 'yearly' ? 'year' : 'month';
    return `${formatPrice(price)}/${period}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[95vh] border border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Upgrade Your Storage</h2>
            <p className="text-gray-400 mt-1">Choose the plan that fits your needs</p>

            {/* Duration and Currency Toggle */}
            <div className="flex items-center gap-4 mt-4">
              {/* Duration Toggle */}
              <div className="flex items-center p-1 bg-gray-700 rounded-lg">
                <button
                  onClick={() => setSelectedDuration('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    selectedDuration === 'monthly'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedDuration('yearly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 relative ${
                    selectedDuration === 'yearly'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs px-1 rounded-full">
                    20% OFF
                  </span>
                </button>
              </div>

              {/* Currency Toggle */}
              <div className="flex items-center p-1 bg-gray-700 rounded-lg">
                <button
                  onClick={() => handleCurrencyChange('USD')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    currency === 'USD'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  $ USD
                </button>
                <button
                  onClick={() => handleCurrencyChange('INR')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    currency === 'INR'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  ₹ INR
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Plans Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isDowngrade = plans.findIndex(p => p.id === currentPlan) > plans.findIndex(p => p.id === plan.id);

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 flex flex-col ${
                  isCurrent
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Plan Header with Gradient */}
                <div className={`bg-gradient-to-br ${getPlanColor(plan.color)} p-6 text-white`}>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{formatPrice(calculatePrice(plan.price, selectedDuration))}</span>
                    <span className="text-sm ml-2 opacity-80">/{selectedDuration === 'yearly' ? 'year' : 'month'}</span>
                  </div>
                  {selectedDuration === 'yearly' && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Save {formatPrice(convertPrice(Math.round(plan.price * 12 * 0.2)))}/year vs monthly
                    </p>
                  )}
                  <p className="mt-2 text-sm opacity-90">
                    {(plan.storage / (1024 * 1024 * 1024)).toFixed(0)} GB Storage
                  </p>
                </div>

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Current Plan
                  </div>
                )}

                {/* Plan Details */}
                <div className="p-6 bg-gray-800/50 flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-300">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id, selectedDuration)}
                    disabled={isCurrent || isDowngrade || loading}
                    className={`w-full mt-6 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : isDowngrade
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isCurrent
                      ? 'Current Plan'
                      : isDowngrade
                      ? 'Downgrades Not Available'
                      : loading
                      ? 'Processing...'
                      : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {/* Footer Note */}
          <div className="border-t border-gray-700 p-6 bg-gray-800/30">
            <p className="text-sm text-gray-400 text-center">
              💳 Secure payment powered by <span className="text-blue-400 font-semibold">Razorpay</span> • Instant activation after successful payment
            </p>
            {error && (
              <div className="mt-4 bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
