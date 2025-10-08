import { useState, useEffect } from 'react';

export default function UserFilters({ onFilterChange, totalUsers, filteredCount, users }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('all');
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
    onFilterChange({ search: searchTerm, plan: planFilter, status: statusFilter, ip: value });
  };

  const handleReset = () => {
    setSearchTerm('');
    setPlanFilter('all');
    setStatusFilter('all');
    setIpFilter('all');
    onFilterChange({ search: '', plan: 'all', status: 'all', ip: 'all' });
  };

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

        {/* IP Address Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            IP Address
          </label>
          <select
            value={ipFilter}
            onChange={(e) => handleIpChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All IPs</option>
            {uniqueIPs.map(ip => (
              <option key={ip} value={ip}>
                {ip} ({ipCounts[ip]} {ipCounts[ip] === 1 ? 'user' : 'users'})
              </option>
            ))}
          </select>
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
