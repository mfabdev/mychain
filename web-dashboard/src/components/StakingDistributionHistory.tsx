import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { formatNumber } from '../utils/formatters';

interface StakingDistribution {
  height: number;
  timestamp: number;
  total_supply: string;
  total_staked: string;
  rewards_distributed: string;
  effective_apr: string;
  num_delegators: number;
}

export const StakingDistributionHistory: React.FC = () => {
  const [distributions, setDistributions] = useState<StakingDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    fetchDistributions();
  }, [page]);

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI(
        `/mychain/mychain/v1/staking-distribution-history?limit=${limit}&offset=${page * limit}`
      );
      
      if (response && response.distributions) {
        if (page === 0) {
          setDistributions(response.distributions);
        } else {
          setDistributions(prev => [...prev, ...response.distributions]);
        }
        setHasMore(response.distributions.length === limit);
      }
    } catch (err) {
      console.error('Failed to fetch distribution history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const parseAmount = (amount: string) => {
    return parseInt(amount.replace('alc', '').replace('ulc', ''));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Distribution History</h2>
      
      {distributions.length === 0 && !loading ? (
        <p className="text-gray-500 text-center py-8">No distributions yet</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rewards
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective APR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staking Ratio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stakers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {distributions.map((dist, index) => {
                  const totalSupply = parseAmount(dist.total_supply);
                  const totalStaked = parseAmount(dist.total_staked);
                  const stakingRatio = totalStaked > 0 ? (totalStaked / totalSupply * 100) : 0;
                  const effectiveAPR = parseFloat(dist.effective_apr) * 100;
                  
                  return (
                    <tr key={`${dist.height}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(dist.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        #{dist.height.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                        {dist.rewards_distributed}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="font-semibold text-blue-600">{effectiveAPR.toFixed(2)}%</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {stakingRatio.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {dist.num_delegators}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setPage(page + 1)}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">Distribution Stats</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Distributions occur every 720 blocks (≈1 hour)</li>
            <li>• Total annual rewards: 20% of total supply</li>
            <li>• All rewards go to active stakers</li>
          </ul>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">APR Calculation</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Base rate: 20% of total supply annually</li>
            <li>• Effective APR = (Total Supply × 20%) ÷ Total Staked</li>
            <li>• Lower staking participation = Higher APR</li>
          </ul>
        </div>
      </div>
    </div>
  );
};