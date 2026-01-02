import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function DMCAPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    reporterName: '',
    reporterEmail: '',
    reporterAddress: '',
    reporterPhone: '',
    copyrightedWork: '',
    infringingContent: '',
    goodFaithStatement: false,
    accuracyStatement: false,
    signature: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [reportId, setReportId] = useState('');

  const API_URL = import.meta.env.VITE_API_BASE_URL || '';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.goodFaithStatement || !formData.accuracyStatement) {
      setError('You must check both required statements');
      setLoading(false);
      return;
    }

    if (!formData.signature) {
      setError('Electronic signature is required');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/dmca/report`, formData);
      setSuccess(true);
      setReportId(response.data.reportId);

      // Reset form
      setFormData({
        reporterName: '',
        reporterEmail: '',
        reporterAddress: '',
        reporterPhone: '',
        copyrightedWork: '',
        infringingContent: '',
        goodFaithStatement: false,
        accuracyStatement: false,
        signature: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit DMCA notice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-900/20 border border-green-600 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              DMCA Notice Submitted Successfully
            </h1>
            <p className="text-gray-300 mb-4">
              Your DMCA takedown notice has been received and will be reviewed within 24-48 hours.
            </p>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400">Report ID:</p>
              <p className="text-xl font-mono text-yellow-400">{reportId}</p>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Please save this report ID for your records. You may use it to inquire about the status of your request.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-lg
                       hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 transition-all font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
            DMCA Takedown Notice
          </h1>
          <p className="text-gray-400">
            Report copyright infringement in accordance with the Digital Millennium Copyright Act
          </p>
        </div>

        {/* Information Section */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-300 mb-3">Before You Submit</h2>
          <div className="text-sm text-blue-200/90 space-y-2">
            <p>
              Please ensure you have considered whether the use of copyrighted material qualifies as <strong>fair use</strong> before submitting a DMCA notice.
            </p>
            <p>
              <strong className="text-blue-300">Note:</strong> Submitting false or fraudulent DMCA notices may result in legal consequences, including liability for damages and attorney's fees under 17 U.S.C. § 512(f).
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">DMCA Agent Contact Information</h3>
          <div className="text-gray-300 space-y-1 text-sm">
            <p><strong>Email:</strong> <a href="mailto:dmca@mypeercloud.in" className="text-blue-400 hover:underline">dmca@mypeercloud.in</a></p>
            <p><strong>Service:</strong> MyPeerCloud</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Submit DMCA Notice</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Your Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">1. Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="reporterName"
                    value={formData.reporterName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="reporterEmail"
                    value={formData.reporterEmail}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="reporterPhone"
                    value={formData.reporterPhone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mailing Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="reporterAddress"
                    value={formData.reporterAddress}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>
              </div>
            </div>

            {/* Copyrighted Work */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">2. Copyrighted Work</h3>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Describe the copyrighted work claimed to be infringed <span className="text-red-400">*</span>
              </label>
              <textarea
                name="copyrightedWork"
                value={formData.copyrightedWork}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="E.g., 'Movie Title' (2023), copyright owned by XYZ Studios. Registration number: VA 123-456"
              />
            </div>

            {/* Infringing Content */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">3. Infringing Content Location</h3>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Magnet link, torrent hash, or file path of the infringing content <span className="text-red-400">*</span>
              </label>
              <textarea
                name="infringingContent"
                value={formData.infringingContent}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="magnet:?xt=urn:btih:... OR file path: /user123/movies/example.mp4"
              />
              <p className="text-xs text-gray-400 mt-2">
                Please provide as much detail as possible to help us locate the infringing content.
              </p>
            </div>

            {/* Statements */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">4. Required Statements</h3>
              <div className="space-y-4">
                <label className="flex items-start cursor-pointer group">
                  <input
                    type="checkbox"
                    name="goodFaithStatement"
                    checked={formData.goodFaithStatement}
                    onChange={handleChange}
                    required
                    className="mt-1 mr-3 h-4 w-4 rounded border-gray-500 bg-gray-700 text-yellow-500 focus:ring-2 focus:ring-yellow-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    I have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
                  </span>
                </label>

                <label className="flex items-start cursor-pointer group">
                  <input
                    type="checkbox"
                    name="accuracyStatement"
                    checked={formData.accuracyStatement}
                    onChange={handleChange}
                    required
                    className="mt-1 mr-3 h-4 w-4 rounded border-gray-500 bg-gray-700 text-yellow-500 focus:ring-2 focus:ring-yellow-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    The information in this notification is accurate, and <strong className="text-yellow-300">under penalty of perjury</strong>, I am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                  </span>
                </label>
              </div>
            </div>

            {/* Signature */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">5. Electronic Signature</h3>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type your full name as electronic signature <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="signature"
                value={formData.signature}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Your Full Name"
              />
              <p className="text-xs text-gray-400 mt-2">
                By typing your name above, you are providing a legally binding electronic signature.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg
                         hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting DMCA Notice...
                  </div>
                ) : (
                  'Submit DMCA Takedown Notice'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>All DMCA notices are processed in accordance with 17 U.S.C. § 512 and related laws.</p>
          <p className="mt-1">Response time: 24-48 hours from submission</p>
        </div>
      </div>
    </div>
  );
}
