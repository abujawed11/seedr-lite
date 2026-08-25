import { useState } from 'react';
import { createDonationOrder, verifyDonation } from '../api';

const PRESET_AMOUNTS_INR = [99, 199, 499];
const PRESET_AMOUNTS_USD = [2, 5, 10];

export default function DonationPopup({ isOpen, onClose, onDismissForever, user }) {
  const [currency, setCurrency] = useState('INR');
  const [selectedAmount, setSelectedAmount] = useState(PRESET_AMOUNTS_INR[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const presets = currency === 'INR' ? PRESET_AMOUNTS_INR : PRESET_AMOUNTS_USD;
  const symbol = currency === 'INR' ? '₹' : '$';
  const amount = customAmount ? Number(customAmount) : selectedAmount;

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleDonate = async () => {
    setError('');
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load payment gateway. Please try again.');
        setProcessing(false);
        return;
      }

      const orderData = await createDonationOrder(amount, currency);

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'MyPeerCloud',
        description: 'Support MyPeerCloud',
        image: '/mypeercloud.png',
        order_id: orderData.order.id,
        prefill: {
          name: orderData.user.name,
          email: orderData.user.email
        },
        theme: { color: '#F59E0B' },
        handler: async function (response) {
          try {
            await verifyDonation({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            onDismissForever();
          } catch (err) {
            setError(err.response?.data?.error || 'Payment verification failed. Please contact support.');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start donation');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold text-white">Help keep MyPeerCloud online 💛</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            This project is self-funded, and the domain renewal is coming up soon. If you find it useful,
            a small donation goes a long way toward keeping it running.
          </p>

          <div className="flex items-center p-1 bg-gray-700 rounded-lg mb-4 w-fit">
            <button
              onClick={() => { setCurrency('INR'); setSelectedAmount(PRESET_AMOUNTS_INR[1]); setCustomAmount(''); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currency === 'INR' ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => { setCurrency('USD'); setSelectedAmount(PRESET_AMOUNTS_USD[1]); setCustomAmount(''); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currency === 'USD' ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              $ USD
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => { setSelectedAmount(preset); setCustomAmount(''); }}
                className={`py-3 rounded-lg font-semibold border-2 transition-all ${
                  !customAmount && selectedAmount === preset
                    ? 'border-blue-500 bg-blue-600/20 text-white'
                    : 'border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {symbol}{preset}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <input
              type="number"
              min="1"
              placeholder={`Custom amount (${symbol})`}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleDonate}
            disabled={processing}
            className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all disabled:opacity-60"
          >
            {processing ? 'Processing...' : `Donate ${symbol}${amount || ''}`}
          </button>

          <div className="flex justify-between items-center mt-4">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-white transition-colors">
              Maybe later
            </button>
            <button onClick={onDismissForever} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Don't show again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
