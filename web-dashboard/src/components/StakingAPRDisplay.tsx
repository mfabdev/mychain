import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { formatNumber } from '../utils/formatters';

interface StakingInfo {
  total_supply: string;
  total_staked: string;
  effective_apr: string;
  annual_rewards: string;
  hourly_rewards: string;
  num_delegators: number;
  next_distribution_height: number;
}

export const StakingAPRDisplay: React.FC = () => {
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [currentHeight, setCurrentHeight] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStakingInfo();
    const interval = setInterval(() => {
      fetchStakingInfo();
      fetchCurrentHeight();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStakingInfo = async () => {
    try {
      const response = await fetchAPI('/mychain/mychain/v1/staking-info');
      if (response && response.info) {
        setStakingInfo(response.info);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch staking info:', err);
      setError('Failed to load staking information');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentHeight = async () => {
    try {
      const response = await fetchAPI('/cosmos/base/tendermint/v1beta1/blocks/latest');
      if (response && response.block && response.block.header) {
        setCurrentHeight(parseInt(response.block.header.height));
      }
    } catch (err) {
      console.error('Failed to fetch current height:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !stakingInfo) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-red-500">{error || 'No staking information available'}</p>
      </div>
    );
  }

  // Parse values
  const totalSupply = parseInt(stakingInfo.total_supply.replace('alc', ''));
  const totalStaked = parseInt(stakingInfo.total_staked.replace('alc', ''));
  const effectiveAPR = parseFloat(stakingInfo.effective_apr) * 100;
  const stakingRatio = (totalStaked / totalSupply) * 100;
  const blocksUntilDistribution = stakingInfo.next_distribution_height - currentHeight;
  const minutesUntilDistribution = Math.max(0, (blocksUntilDistribution * 5) / 60);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Staking Rewards</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Effective APR</p>
          <p className="text-3xl font-bold text-green-600">{effectiveAPR.toFixed(2)}%</p>
          <p className="text-xs text-gray-500 mt-1">Current reward rate for stakers</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Staking Ratio</p>
          <p className="text-3xl font-bold text-blue-600">{stakingRatio.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{formatNumber(totalStaked)} / {formatNumber(totalSupply)} ALC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Annual Rewards Pool</p>
          <p className="text-xl font-semibold text-gray-800">{stakingInfo.annual_rewards}</p>
          <p className="text-xs text-gray-500">20% of total supply</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Hourly Distribution</p>
          <p className="text-xl font-semibold text-gray-800">{stakingInfo.hourly_rewards}</p>
          <p className="text-xs text-gray-500">Distributed to stakers</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Active Stakers</p>
          <p className="text-xl font-semibold text-gray-800">{stakingInfo.num_delegators}</p>
          <p className="text-xs text-gray-500">Unique delegators</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">Next Distribution</p>
            <p className="text-xs text-yellow-600">
              Block #{stakingInfo.next_distribution_height} ({minutesUntilDistribution.toFixed(1)} minutes)
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-yellow-800">
              Progress: {((720 - blocksUntilDistribution) / 720 * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
          <div 
            className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(720 - blocksUntilDistribution) / 720 * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-sm mb-2">How Rewards Work</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 20% annual rewards calculated on <strong>total supply</strong> ({formatNumber(totalSupply)} ALC)</li>
          <li>• Distributed only to <strong>staked tokens</strong> ({formatNumber(totalStaked)} ALC)</li>
          <li>• Lower staking ratio = Higher effective APR for stakers</li>
          <li>• Rewards distributed every hour (720 blocks)</li>
        </ul>
      </div>
    </div>
  );
};