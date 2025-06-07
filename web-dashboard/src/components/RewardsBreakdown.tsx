import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';

interface RewardsData {
  totalSupply: number;
  initialSupply: number;
  totalDistributed: number;
  totalClaimed: number;
  totalUnclaimed: number;
  validators: {
    address: string;
    unclaimedRewards: number;
  }[];
}

export const RewardsBreakdown: React.FC = () => {
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewardsData = async () => {
      try {
        // Get current supply
        const supply = await fetchAPI('/cosmos/bank/v1beta1/supply');
        const alcSupply = supply.supply?.find((s: any) => s.denom === 'ulc');
        const currentSupply = parseInt(alcSupply?.amount || '0') / 1000000;

        // Initial supply
        const initialSupply = 100000;
        const totalDistributed = currentSupply - initialSupply;

        // Get validators
        const validators = await fetchAPI('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
        
        // Get unclaimed rewards for each validator
        const validatorRewards = await Promise.all(
          validators.validators?.map(async (val: any) => {
            try {
              const delegatorAddr = val.operator_address.replace('valoper', '');
              const rewards = await fetchAPI(`/cosmos/distribution/v1beta1/delegators/${delegatorAddr}/rewards`);
              const alcReward = rewards.total?.find((r: any) => r.denom === 'alc');
              const unclaimedAmount = alcReward ? parseFloat(alcReward.amount) / 1000000 : 0;
              
              return {
                address: delegatorAddr,
                unclaimedRewards: unclaimedAmount
              };
            } catch (err) {
              console.error('Error fetching rewards for validator:', val.operator_address, err);
              return {
                address: val.operator_address,
                unclaimedRewards: 0
              };
            }
          }) || []
        );

        const totalUnclaimed = validatorRewards.reduce((sum, val) => sum + val.unclaimedRewards, 0);
        const totalClaimed = totalDistributed - totalUnclaimed;

        setRewardsData({
          totalSupply: currentSupply,
          initialSupply,
          totalDistributed,
          totalClaimed,
          totalUnclaimed,
          validators: validatorRewards.filter(v => v.unclaimedRewards > 0)
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching rewards data:', error);
        setLoading(false);
      }
    };

    fetchRewardsData();
    const interval = setInterval(fetchRewardsData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading || !rewardsData) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Staking Rewards Breakdown</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Initial Supply</p>
          <p className="text-2xl font-bold">{rewardsData.initialSupply.toFixed(2)} ALC</p>
        </div>
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400 mb-1">Total Distributed</p>
          <p className="text-2xl font-bold text-blue-300">+{rewardsData.totalDistributed.toFixed(2)} ALC</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-400 mb-1">Claimed Rewards</p>
          <p className="text-2xl font-bold text-green-300">{rewardsData.totalClaimed.toFixed(2)} ALC</p>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400 mb-1">Unclaimed Rewards</p>
          <p className="text-2xl font-bold text-yellow-300">{rewardsData.totalUnclaimed.toFixed(2)} ALC</p>
        </div>
      </div>

      <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold mb-3">Supply Calculation</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Initial Supply:</span>
            <span className="font-mono">{rewardsData.initialSupply.toFixed(2)} ALC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">+ Staking Rewards Distributed:</span>
            <span className="font-mono text-blue-400">+{rewardsData.totalDistributed.toFixed(2)} ALC</span>
          </div>
          <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold">
            <span>Current Total Supply:</span>
            <span className="font-mono text-purple-400">{rewardsData.totalSupply.toFixed(2)} ALC</span>
          </div>
        </div>
      </div>

      {rewardsData.validators.length > 0 && (
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Unclaimed Rewards by Validator</h3>
          <div className="space-y-2">
            {rewardsData.validators.map((val) => (
              <div key={val.address} className="flex justify-between items-center p-2 bg-gray-600/30 rounded">
                <span className="font-mono text-sm text-gray-300">
                  {val.address.slice(0, 10)}...{val.address.slice(-8)}
                </span>
                <span className="text-yellow-400 font-semibold">
                  {val.unclaimedRewards.toFixed(6)} ALC
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Note: These rewards have been distributed but not yet claimed by validators. 
            They still count towards the total supply.
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-400">
          <strong>Understanding the Numbers:</strong> The blockchain started with 100,000 ALC, of which 90,000 ALC 
          was staked by validators and 10,000 ALC remained unstaked. Through staking rewards (10% APR on the 90,000 
          staked ALC), {rewardsData.totalDistributed.toFixed(2)} ALC has been distributed. Of this, 
          {rewardsData.totalClaimed.toFixed(2)} ALC has been claimed and {rewardsData.totalUnclaimed.toFixed(2)} ALC 
          remains unclaimed but is already part of the total supply.
        </p>
      </div>
    </div>
  );
};