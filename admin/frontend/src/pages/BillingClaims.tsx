import React, { useState, useEffect } from 'react';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface Claim {
  id: string;
  patientName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: Date;
  medicalAidNumber: string;
  claimNumber: string;
  serviceType: string;
}

const BillingClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        // Replace with actual API call
        const response = await new Promise<Claim[]>((resolve) =>
          setTimeout(() => resolve([
            {
              id: '1',
              patientName: 'John Doe',
              amount: 200,
              status: 'pending',
              date: new Date(),
              medicalAidNumber: 'MA123456',
              claimNumber: 'CLM001',
              serviceType: 'Consultation'
            },
            // Add more mock data as needed
          ]), 1000)
        );
        setClaims(response);
      } catch (error) {
        setError('Failed to fetch claims');
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, []);

  const filteredClaims = claims.filter(claim => {
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    const matchesSearch = claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalAmount = filteredClaims.reduce((sum, claim) => sum + claim.amount, 0);

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Claims</h1>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Claim
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Claims</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{filteredClaims.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Amount</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">R{totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Pending Claims</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {filteredClaims.filter(claim => claim.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search claims..."
                className="w-full px-4 py-2 border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-md"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Claims Table */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Claim Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Medical Aid #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Service Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{claim.claimNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{claim.patientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{claim.medicalAidNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{claim.serviceType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">R{claim.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${claim.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          claim.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {claim.date.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingClaims; 