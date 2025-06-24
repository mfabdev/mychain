import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';

interface StakingData {
  totalStaked: number;
  totalSupply: number;
  availableToStake: number;
  currentInflation: number;
  effectiveAPR: number;
  mintedSinceGenesis: number;
}

export const StakingRewardsHistory: React.FC = () => {
  const [stakingData, setStakingData] = useState<StakingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentHeight, setCurrentHeight] = useState<string>('0');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Get current block height
      const latestBlock = await fetchAPI('/cosmos/base/tendermint/v1beta1/blocks/latest');
      setCurrentHeight(latestBlock.block.header.height);

      // Get current supply
      const supply = await fetchAPI('/cosmos/bank/v1beta1/supply');
      const alcSupply = supply.supply?.find((s: any) => s.denom === 'ulc');
      const currentSupply = parseInt(alcSupply?.amount || '0');

      // Get staking pool
      const pool = await fetchAPI('/cosmos/staking/v1beta1/pool');
      const totalStaked = parseInt(pool.pool?.bonded_tokens || '0');

      // Get inflation
      const inflationRes = await fetchAPI('/cosmos/mint/v1beta1/inflation');
      const currentInflation = parseFloat(inflationRes.inflation);

      // Initial supply was 100,000,000,000 (100,000 LC)
      const initialSupply = 100000000000;
      const mintedSinceGenesis = currentSupply - initialSupply;
      const availableToStake = currentSupply - totalStaked;

      // Calculate effective APR
      const bondedRatio = totalStaked / currentSupply;
      const effectiveAPR = bondedRatio > 0 ? currentInflation / bondedRatio : 0;

      setStakingData({
        totalStaked,
        totalSupply: currentSupply,
        availableToStake,
        currentInflation,
        effectiveAPR,
        mintedSinceGenesis
      });
    } catch (err) {
      console.error('Error fetching staking data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stakingData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2 w-1/3"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number, decimals: number = 6) => {
    return (num / 1000000).toFixed(decimals);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">SDK Minting Statistics</h2>
      
      <div className="text-sm text-gray-400 mb-4">Current Block: #{currentHeight}</div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded p-4 border border-purple-500/30">
          <div className="text-purple-400 text-sm mb-1">Currently Staked</div>
          <div className="text-2xl font-bold">{formatNumber(stakingData.totalStaked, 6)} LC</div>
          <div className="text-xs text-gray-500 mt-1">Earning {(stakingData.effectiveAPR * 100).toFixed(1)}% APR</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded p-4 border border-blue-500/30">
          <div className="text-blue-400 text-sm mb-1">Total Unstaked (System-wide)</div>
          <div className="text-2xl font-bold">{formatNumber(stakingData.availableToStake, 6)} LC</div>
          <div className="text-xs text-gray-500 mt-1">Available across all accounts</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded p-4 border border-green-500/30">
          <div className="text-green-400 text-sm mb-1">Current Total Supply</div>
          <div className="text-2xl font-bold">{formatNumber(stakingData.totalSupply, 6)} LC</div>
          <div className="text-xs text-gray-500 mt-1">(100k initial + minting rewards)</div>
        </div>
      </div>

      <div className="bg-gray-700/30 rounded p-4 mb-4">
        <h3 className="font-semibold mb-2">SDK Minting Progress</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Initial Supply:</span>
            <span className="ml-2">100000.000000 LC</span>
          </div>
          <div>
            <span className="text-gray-400">Minted Since Genesis:</span>
            <span className="ml-2 text-green-400">+{formatNumber(stakingData.mintedSinceGenesis, 6)} LC</span>
          </div>
          <div>
            <span className="text-gray-400">Current Inflation:</span>
            <span className="ml-2">{(stakingData.currentInflation * 100).toFixed(2)}% APR</span>
          </div>
          <div>
            <span className="text-gray-400">Effective Staking APR:</span>
            <span className="ml-2 text-blue-400">{(stakingData.effectiveAPR * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-600/10 border border-yellow-500/30 rounded p-4">
        <p className="text-sm text-yellow-400">
          <strong>Note:</strong> With 90% of tokens staked (above 50% goal), inflation is decreasing.
          New LC tokens are minted each block and distributed proportionally to all stakers.
        </p>
      </div>
    </div>
  );
};