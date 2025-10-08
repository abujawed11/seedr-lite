import { useState, useEffect } from 'react';

export default function UserFilters({ onFilterChange, totalUsers, filteredCount, users }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('all');
  const [ipSearchTerm, setIpSearchTerm] = useState('');
  const [showIpDropdown, setShowIpDropdown] = useState(false);
  const [uniqueIPs, setUniqueIPs] = useState([]);
  const [ipCounts, setIpCounts] = useState({});

  // Calculate unique IPs and their counts
  useEffect(() => {
    if (!users || users.length === 0) return;

    const ipMap = {};
    users.forEach(user => {
      const ip = user.registration_ip || 'Unknown';
      ipMap[ip] = (ipMap[ip] || 0) + 1;
    });

    setIpCounts(ipMap);
    setUniqueIPs(Object.keys(ipMap).sort((a, b) => ipMap[b] - ipMap[a])); // Sort by count descending
  }, [users]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    onFilterChange({ search: value, plan: planFilter, status: statusFilter, ip: ipFilter });
  };

  const handlePlanChange = (value) => {
    setPlanFilter(value);
    onFilterChange({ search: searchTerm, plan: value, status: statusFilter, ip: ipFilter });
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    onFilterChange({ search: searchTerm, plan: planFilter, status: value, ip: ipFilter });
  };

  const handleIpChange = (value) => {
    setIpFilter(value);
    setIpSearchTerm(value === 'all' ? '' : value);
    setShowIpDropdown(false);
    onFilterChange({ search: searchTerm, plan: planFilter, status: statusFilter, ip: value });
  };

  const handleIpSearchChange = (value) => {
    setIpSearchTerm(value);
    setShowIpDropdown(value.length > 0);

    // If input is cleared, reset filter
    if (value === '') {
      setIpFilter('all');
      onFilterChange({ search: searchTerm, plan: planFilter, status: statusFilter, ip: 'all' });
    }
  };

  const handleSelectIp = (ip) => {
    handleIpChange(ip);
  };

  const handleReset = () => {
    setSearchTerm('');
    setPlanFilter('all');
    setStatusFilter('all');
    setIpFilter('all');
    setIpSearchTerm('');
    setShowIpDropdown(false);
    onFilterChange({ search: '', plan: 'all', status: 'all', ip: 'all' });
  };

  // Filter IPs based on search term
  const filteredIPs = uniqueIPs.filter(ip =>
    ip.toLowerCase().includes(ipSearchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            🔍 Search Users
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-end space-x-4">
        {/* Plan Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Plan
          </label>
          <select
            value={planFilter}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {/* IP Address Filter - Searchable */}
        <div className="flex-1 relative">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            IP Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={ipSearchTerm}
              onChange={(e) => handleIpSearchChange(e.target.value)}
              onFocus={() => ipSearchTerm && setShowIpDropdown(true)}
              onBlur={() => setTimeout(() => setShowIpDropdown(false), 200)}
              placeholder="Type IP address to search..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {ipSearchTerm && (
              <button
                onClick={() => {
                  setIpSearchTerm('');
                  setIpFilter('all');
                  setShowIpDropdown(false);
                  onFilterChange({ search: searchTerm, plan: planFilter, status: statusFilter, ip: 'all' });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}

            {/* Dropdown with matching IPs */}
            {showIpDropdown && filteredIPs.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                {filteredIPs.map(ip => (
                  <button
                    key={ip}
                    onClick={() => handleSelectIp(ip)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono text-sm">{ip}</span>
                      <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        {ipCounts[ip]} {ipCounts[ip] === 1 ? 'user' : 'users'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {showIpDropdown && filteredIPs.length === 0 && ipSearchTerm && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-4 text-center text-gray-400 text-sm">
                No matching IP addresses found
              </div>
            )}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
        <span className="text-gray-400">
          Showing <span className="text-white font-medium">{filteredCount}</span> of{' '}
          <span className="text-white font-medium">{totalUsers}</span> users
        </span>
        {(searchTerm || planFilter !== 'all' || statusFilter !== 'all' || ipFilter !== 'all') && (
          <span className="text-blue-400 font-medium">
            🔍 Filters active
          </span>
        )}
      </div>
    </div>
  );
}
