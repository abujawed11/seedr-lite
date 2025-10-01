import { useState, useEffect } from 'react';
import { getPlans, submitUpgradeRequest } from '../api';

export default function PlansModal({ isOpen, onClose, currentPlan, onUpgradeSuccess }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: ''
  });

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

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
    setShowForm(true);
    setError('');
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await submitUpgradeRequest(selectedPlan, formData);
      alert('Upgrade request submitted successfully! Admin will review your request soon.');
      onUpgradeSuccess(response);
      setShowForm(false);
      setSelectedPlan(null);
      setFormData({ fullName: '', email: '', phone: '', address: '' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Request submission failed');
      console.error('Upgrade request error:', err);
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

  if (!isOpen) return null;

  // If form is shown, render the form modal
  if (showForm) {
    const selectedPlanDetails = plans.find(p => p.id === selectedPlan);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
          {/* Form Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Upgrade Request Form</h2>
              <p className="text-gray-400 mt-1">
                Requesting: <span className="text-yellow-400 font-semibold">{selectedPlanDetails?.name} Plan</span>
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedPlan(null);
                setError('');
              }}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleFormChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleFormChange}
                required
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Enter your complete address"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedPlan(null);
                  setError('');
                }}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>

            <p className="text-sm text-gray-400 text-center pt-2">
              Your request will be reviewed by an administrator. You'll be notified once processed.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Upgrade Your Storage</h2>
            <p className="text-gray-400 mt-1">Choose the plan that fits your needs</p>
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
                className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                  isCurrent
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Plan Header with Gradient */}
                <div className={`bg-gradient-to-br ${getPlanColor(plan.color)} p-6 text-white`}>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-sm ml-2 opacity-80">/month</span>
                  </div>
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
                <div className="p-6 bg-gray-800/50">
                  <ul className="space-y-3">
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
                    onClick={() => handleSelectPlan(plan.id)}
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
                      : `Request ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="border-t border-gray-700 p-6 bg-gray-800/30">
          <p className="text-sm text-gray-400 text-center">
            📝 Submit an upgrade request with your details. Admin will review and approve your request.
          </p>
        </div>
      </div>
    </div>
  );
}
