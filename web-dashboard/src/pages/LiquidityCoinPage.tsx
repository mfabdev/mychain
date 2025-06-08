import React, { useEffect, useState } from 'react';
import { StakingRewardsHistory } from '../components/StakingRewardsHistory';
import { RewardsBreakdown } from '../components/RewardsBreakdown';
import { InitialDistribution } from '../components/InitialDistribution';
import { fetchAPI } from '../utils/api';

export const LiquidityCoinPage: React.FC = () => {
  const [inflationInfo, setInflationInfo] = useState<{
    currentRate: string;
    bondedRatio: string;
    totalStaked: string;
    annualProvisions: string;
    totalSupply: string;
    liquidSupply: string;
  } | null>(null);

  useEffect(() => {
    const fetchInflationData = async () => {
      try {
        const inflation = await fetchAPI('/cosmos/mint/v1beta1/inflation');
        const annualProvisions = await fetchAPI('/cosmos/mint/v1beta1/annual_provisions');
        const pool = await fetchAPI('/cosmos/staking/v1beta1/pool');
        const supply = await fetchAPI('/cosmos/bank/v1beta1/supply');
        
        const totalLC = supply.supply?.find((s: any) => s.denom === 'ulc');
        const totalLCAmount = parseInt(totalLC?.amount || '0');
        const bondedTokens = parseInt(pool.pool?.bonded_tokens || '0');
        const bondedRatio = totalLCAmount > 0 ? (bondedTokens / totalLCAmount) * 100 : 0;
        const liquidTokens = totalLCAmount - bondedTokens;
        
        setInflationInfo({
          currentRate: (parseFloat(inflation.inflation) * 100).toFixed(2),
          bondedRatio: bondedRatio.toFixed(2),
          totalStaked: (bondedTokens / 1_000_000).toLocaleString(),
          annualProvisions: (parseFloat(annualProvisions.annual_provisions) / 1_000_000).toLocaleString(),
          totalSupply: (totalLCAmount / 1_000_000).toLocaleString(),
          liquidSupply: (liquidTokens / 1_000_000).toLocaleString()
        });
      } catch (error) {
        console.error('Failed to fetch inflation data:', error);
      }
    };
    
    fetchInflationData();
    const interval = setInterval(fetchInflationData, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">LiquidityCoin (LC)</h1>
        <span className="text-sm text-gray-400">Native Staking Token</span>
      </div>
      
      <div className="grid gap-6">
        {/* LC Overview */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">LC Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Total Supply</p>
              <p className="text-2xl font-bold text-blue-400">{inflationInfo?.totalSupply || '100,000'}</p>
              <p className="text-xs text-gray-500">LC</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Staked</p>
              <p className="text-2xl font-bold text-green-400">{inflationInfo?.totalStaked || '90,000'}</p>
              <p className="text-xs text-gray-500">LC ({inflationInfo?.bondedRatio || '90'}%)</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Liquid</p>
              <p className="text-2xl font-bold text-yellow-400">{inflationInfo?.liquidSupply || '10,000'}</p>
              <p className="text-xs text-gray-500">LC ({((parseFloat(inflationInfo?.liquidSupply?.replace(/,/g, '') || '10000') / parseFloat(inflationInfo?.totalSupply?.replace(/,/g, '') || '100000')) * 100).toFixed(1)}%)</p>
            </div>
          </div>
        </div>

        {/* SDK Minting Info */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Dynamic Inflation (SDK Minting)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
              <p className="text-sm text-purple-400 mb-1">Current Inflation</p>
              <p className="text-2xl font-bold text-purple-300">{inflationInfo?.currentRate || '100'}%</p>
              <p className="text-xs text-gray-500">Annual rate</p>
            </div>
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400 mb-1">Bonded Ratio</p>
              <p className="text-2xl font-bold text-blue-300">{inflationInfo?.bondedRatio || '90'}%</p>
              <p className="text-xs text-gray-500">Goal: 50%</p>
            </div>
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-green-400 mb-1">Total Staked</p>
              <p className="text-xl font-bold text-green-300">{inflationInfo?.totalStaked || '90,000'} LC</p>
              <p className="text-xs text-gray-500">Earning rewards</p>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-sm text-yellow-400 mb-1">Annual Provisions</p>
              <p className="text-xl font-bold text-yellow-300">{inflationInfo?.annualProvisions || '100,000'} LC</p>
              <p className="text-xs text-gray-500">Per year</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              <strong>How it works:</strong> The inflation rate adjusts dynamically based on the bonded ratio. 
              Since {inflationInfo?.bondedRatio || '90'}% is bonded (goal: 50%), inflation will decrease from {inflationInfo?.currentRate || '100'}% 
              towards 7% to encourage unstaking. Range: 7-100% APR, adjusts by up to 93% per year.
            </p>
          </div>
        </div>

        {/* Staking Information */}
        <StakingRewardsHistory />
        
        {/* Rewards Breakdown */}
        <RewardsBreakdown />
        
        {/* Initial Distribution */}
        <InitialDistribution />

        {/* Token Economics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Token Economics</h2>
          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Staking Rewards</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Annual Percentage Rate: 10%</li>
                <li>• Rewards distributed per block</li>
                <li>• Compounding rewards for validators</li>
                <li>• No slashing for downtime (test network)</li>
              </ul>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Utility</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Network security through staking</li>
                <li>• Transaction fee payments</li>
                <li>• Governance voting rights</li>
                <li>• Validator delegation rewards</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};