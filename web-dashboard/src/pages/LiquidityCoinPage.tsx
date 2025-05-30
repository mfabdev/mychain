import React from 'react';
import { StakingRewardsHistory } from '../components/StakingRewardsHistory';
import { RewardsBreakdown } from '../components/RewardsBreakdown';
import { InitialDistribution } from '../components/InitialDistribution';

export const LiquidityCoinPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">LiquidityCoin (ALC)</h1>
        <span className="text-sm text-gray-400">Native Staking Token</span>
      </div>
      
      <div className="grid gap-6">
        {/* ALC Overview */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">ALC Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Total Supply</p>
              <p className="text-2xl font-bold text-blue-400">100,000.00</p>
              <p className="text-xs text-gray-500">ALC</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Staked</p>
              <p className="text-2xl font-bold text-green-400">90,000.00</p>
              <p className="text-xs text-gray-500">ALC (90%)</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Liquid</p>
              <p className="text-2xl font-bold text-yellow-400">10,000.00</p>
              <p className="text-xs text-gray-500">ALC (10%)</p>
            </div>
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