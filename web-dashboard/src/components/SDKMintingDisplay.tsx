import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface MintingInfo {
  inflation: number;
  params: {
    mint_denom: string;
    inflation_rate_change: string;
    inflation_max: string;
    inflation_min: string;
    goal_bonded: string;
    blocks_per_year: string;
  };
  bonded_ratio: number;
  total_staked: number;
  total_supply: number;
}

export const SDKMintingDisplay: React.FC = () => {
  const [mintingInfo, setMintingInfo] = useState<MintingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMintingInfo();
    const interval = setInterval(fetchMintingInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMintingInfo = async () => {
    try {
      // Fetch inflation
      const inflationRes = await fetchAPI('/cosmos/mint/v1beta1/inflation');
      const paramsRes = await fetchAPI('/cosmos/mint/v1beta1/params');
      
      // Fetch bonded ratio and supply
      const poolRes = await fetchAPI('/cosmos/staking/v1beta1/pool');
      const supplyRes = await fetchAPI('/cosmos/bank/v1beta1/supply');
      
      const alcSupply = supplyRes.supply?.find((s: any) => s.denom === 'ulc');
      const totalSupply = parseInt(alcSupply?.amount || '0');
      const bonded = parseInt(poolRes.pool?.bonded_tokens || '0');
      const bondedRatio = bonded / totalSupply;
      
      setMintingInfo({
        inflation: parseFloat(inflationRes.inflation),
        params: paramsRes.params,
        bonded_ratio: bondedRatio,
        total_staked: bonded,
        total_supply: totalSupply,
      });
    } catch (err) {
      console.error('Error fetching minting info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !mintingInfo) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2 w-1/3"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const inflationPercent = (mintingInfo.inflation * 100).toFixed(2);
  const bondedPercent = (mintingInfo.bonded_ratio * 100).toFixed(1);
  const goalBondedPercent = (parseFloat(mintingInfo.params.goal_bonded) * 100).toFixed(0);
  const minInflationPercent = (parseFloat(mintingInfo.params.inflation_min) * 100).toFixed(0);
  const maxInflationPercent = (parseFloat(mintingInfo.params.inflation_max) * 100).toFixed(0);
  const rateChangePercent = (parseFloat(mintingInfo.params.inflation_rate_change) * 100).toFixed(0);

  // Calculate effective APR for stakers
  const effectiveAPR = mintingInfo.bonded_ratio > 0 
    ? (mintingInfo.inflation / mintingInfo.bonded_ratio * 100).toFixed(2)
    : '0.00';

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">SDK Minting</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded p-4 border border-green-500/30">
          <p className="text-sm text-gray-400 mb-1">Current Inflation</p>
          <p className="text-3xl font-bold text-green-400">{inflationPercent}%</p>
          <p className="text-xs text-gray-500 mt-1">Annual rate</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded p-4 border border-blue-500/30">
          <p className="text-sm text-gray-400 mb-1">Effective Staking APR</p>
          <p className="text-3xl font-bold text-blue-400">{effectiveAPR}%</p>
          <p className="text-xs text-gray-500 mt-1">Inflation ÷ Bonded Ratio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded p-4">
          <p className="text-sm text-gray-400 mb-1">Bonded Ratio</p>
          <p className="text-xl font-semibold">{bondedPercent}%</p>
          <p className="text-xs text-gray-500">Target: {goalBondedPercent}%</p>
        </div>
        
        <div className="bg-gray-700/30 rounded p-4">
          <p className="text-sm text-gray-400 mb-1">Total Staked</p>
          <p className="text-xl font-semibold">{(mintingInfo.total_staked / 1000000).toFixed(0)} LC</p>
          <p className="text-xs text-gray-500">Of {(mintingInfo.total_supply / 1000000).toFixed(0)} LC</p>
        </div>
        
        <div className="bg-gray-700/30 rounded p-4">
          <p className="text-sm text-gray-400 mb-1">Rate Change</p>
          <p className="text-xl font-semibold">{rateChangePercent}%</p>
          <p className="text-xs text-gray-500">Per year</p>
        </div>
      </div>

      <div className="bg-gray-700/20 border border-gray-600 p-4 rounded-lg">
        <h3 className="font-semibold text-sm mb-2">How SDK Minting Works</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Inflation adjusts dynamically based on bonded ratio vs goal ({goalBondedPercent}%)</li>
          <li>• When bonded ratio {'>'} goal: inflation decreases (min {minInflationPercent}%)</li>
          <li>• When bonded ratio {'<'} goal: inflation increases (max {maxInflationPercent}%)</li>
          <li>• Rate changes by up to {rateChangePercent}% per year</li>
          <li>• New LC is minted each block and distributed to stakers</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-600/10 rounded-lg border border-blue-500/30">
        <h3 className="font-semibold text-sm mb-2 text-blue-400">Current Status</h3>
        <p className="text-xs text-gray-300">
          With {bondedPercent}% bonded (above {goalBondedPercent}% goal), inflation is decreasing toward {minInflationPercent}%.
          Stakers earn {effectiveAPR}% APR from newly minted LC tokens.
        </p>
      </div>
    </div>
  );
};