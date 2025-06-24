import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';

interface ValidatorInfo {
  address: string;
  moniker: string;
  stakedAmount: number;
  percentage: number;
}

interface DistributionData {
  totalSupply: number;
  stakedAmount: number;
  unstakedAmount: number;
  validators: ValidatorInfo[];
}

export const InitialDistribution: React.FC = () => {
  const [distribution, setDistribution] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDistributionData = async () => {
      try {
        // Get validators and their stakes
        const validators = await fetchAPI('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
        
        // Get staking pool info
        const pool = await fetchAPI('/cosmos/staking/v1beta1/pool');
        const totalStaked = parseInt(pool.pool?.bonded_tokens || '0') / 1000000;

        // Get current supply to show actual available amount
        const supply = await fetchAPI('/cosmos/bank/v1beta1/supply');
        const alcSupply = supply.supply?.find((s: any) => s.denom === 'ulc');
        const currentTotalSupply = parseInt(alcSupply?.amount || '0') / 1000000;
        
        // Calculate actual unstaked amount (total supply - staked)
        const unstakedAmount = currentTotalSupply - totalStaked;

        // Process validator data
        const validatorInfo = validators.validators?.map((val: any) => ({
          address: val.operator_address,
          moniker: val.description?.moniker || 'Unknown',
          stakedAmount: parseInt(val.tokens || '0') / 1000000,
          percentage: (parseInt(val.tokens || '0') / 1000000 / totalStaked) * 100
        })) || [];

        setDistribution({
          totalSupply: currentTotalSupply,
          stakedAmount: totalStaked,
          unstakedAmount: unstakedAmount,
          validators: validatorInfo
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching distribution data:', error);
        // Use default values if API fails
        setDistribution({
          totalSupply: 100000,
          stakedAmount: 90000,
          unstakedAmount: 10000,
          validators: []
        });
        setLoading(false);
      }
    };

    fetchDistributionData();
  }, []);

  if (loading || !distribution) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Current LC Distribution</h2>
      
      {/* Visual representation */}
      <div className="mb-6">
        <div className="relative h-12 bg-gray-700 rounded-lg overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center text-white font-semibold"
            style={{ width: `${(distribution.stakedAmount / distribution.totalSupply) * 100}%` }}
          >
            <span className="text-sm">Staked: {distribution.stakedAmount.toFixed(6)} LC</span>
          </div>
          <div 
            className="absolute right-0 top-0 h-full bg-gradient-to-r from-gray-600 to-gray-500 flex items-center justify-center text-white font-semibold"
            style={{ width: `${(distribution.unstakedAmount / distribution.totalSupply) * 100}%` }}
          >
            <span className="text-sm">Unstaked: {distribution.unstakedAmount.toFixed(6)} LC</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Current Total Supply</p>
          <p className="text-2xl font-bold text-blue-400">{distribution.totalSupply.toFixed(6)} LC</p>
          <p className="text-xs text-gray-500 mt-1">Including all rewards</p>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <p className="text-sm text-purple-400 mb-1">Staked by Validators</p>
          <p className="text-2xl font-bold text-purple-300">{distribution.stakedAmount.toFixed(6)} LC</p>
          <p className="text-xs text-gray-500 mt-1">Earning 10% APR</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-400 mb-1">Available to Stake</p>
          <p className="text-2xl font-bold text-green-300">{distribution.unstakedAmount.toFixed(6)} LC</p>
          <p className="text-xs text-gray-500 mt-1">Could earn 10% APR</p>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold mb-3">Distribution Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-600/30 rounded">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div>
                <p className="font-semibold">Validator Stakes</p>
                <p className="text-sm text-gray-400">Locked in staking, earning rewards</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-purple-400">{distribution.stakedAmount.toFixed(6)} LC</p>
              <p className="text-sm text-gray-400">{((distribution.stakedAmount / distribution.totalSupply) * 100).toFixed(1)}%</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-600/30 rounded">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <div>
                <p className="font-semibold">Free Balance</p>
                <p className="text-sm text-gray-400">Available for transfers and trading</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{distribution.unstakedAmount.toFixed(6)} LC</p>
              <p className="text-sm text-gray-400">{((distribution.unstakedAmount / distribution.totalSupply) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Validator stakes */}
      {distribution.validators.length > 0 && (
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Validator Stakes</h3>
          <div className="space-y-2">
            {distribution.validators.map((val) => (
              <div key={val.address} className="flex justify-between items-center p-2 bg-gray-600/30 rounded">
                <div>
                  <p className="font-medium">{val.moniker}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {val.address.slice(0, 12)}...{val.address.slice(-8)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{val.stakedAmount.toFixed(6)} LC</p>
                  <p className="text-xs text-gray-400">{val.percentage.toFixed(1)}% of total stake</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-400">
          <strong>Note:</strong> The blockchain was intended to have 90,000 LC staked at genesis, but currently 
          only {distribution.stakedAmount.toFixed(6)} LC is staked. You can use the Staking Manager above to stake 
          your LC tokens with validators to earn 10% APR rewards and help secure the network.
        </p>
      </div>
    </div>
  );
};