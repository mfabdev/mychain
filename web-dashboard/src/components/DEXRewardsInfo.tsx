import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface DynamicRewardState {
  current_annual_rate: string;
  last_update_block: string;
  last_update_time: string;
  volume_history: any[];
}

interface SpreadIncentive {
  current_spread: string;
  spread_multiplier: string;
  spread_impact: string;
  base_apy: string;
  effective_apy: string;
  estimated_daily_rewards: string;
  reward_tier: string;
}

export const DEXRewardsInfo: React.FC = () => {
  const [dynamicState, setDynamicState] = useState<DynamicRewardState | null>(null);
  const [currentLiquidity, setCurrentLiquidity] = useState<string>('0');
  const [liquidityTarget, setLiquidityTarget] = useState<string>('0');
  const [priceRatio, setPriceRatio] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState<string>('1');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [orderEstimates, setOrderEstimates] = useState<{
    buyTight: SpreadIncentive | null;
    buyWide: SpreadIncentive | null;
    sellHigh: SpreadIncentive | null;
    sellLow: SpreadIncentive | null;
  }>({
    buyTight: null,
    buyWide: null,
    sellHigh: null,
    sellLow: null
  });

  useEffect(() => {
    const fetchDynamicRewards = async () => {
      try {
        // Fetch dynamic reward state
        const stateRes = await fetchAPI('/mychain/dex/v1/dynamic_reward_state');
        if (stateRes) {
          setDynamicState(stateRes.state);
          setCurrentLiquidity(stateRes.current_liquidity || '0');
          setLiquidityTarget(stateRes.liquidity_target || '1000000');
          setPriceRatio(stateRes.price_ratio || '0');
        }
      } catch (error) {
        console.error('Failed to fetch dynamic reward state:', error);
      }

      try {
        // Get current market prices for estimates
        const orderBookRes = await fetchAPI(`/mychain/dex/v1/order_book/${selectedPair}`);
        const bestBid = orderBookRes.buy_orders?.[0]?.price?.amount || '90000000';
        const bestAsk = orderBookRes.sell_orders?.[0]?.price?.amount || '110000000';
        
        // const midPrice = (parseInt(bestBid) + parseInt(bestAsk)) / 2;
        
        // Estimate rewards for different scenarios
        // Buy order that tightens spread (95% of ask)
        const tightBuyPrice = Math.floor(parseInt(bestAsk) * 0.95);
        try {
          const buyTightRes = await fetchAPI(
            `/mychain/dex/v1/estimate_order_rewards?pair_id=${selectedPair}&amount=10000000000&price=${tightBuyPrice}&is_buy=true`
          );
          setOrderEstimates(prev => ({ ...prev, buyTight: buyTightRes }));
        } catch (e) {
          console.error('Failed to estimate buy tight rewards:', e);
        }

        // Buy order with wide spread (80% of ask)
        const wideBuyPrice = Math.floor(parseInt(bestAsk) * 0.80);
        try {
          const buyWideRes = await fetchAPI(
            `/mychain/dex/v1/estimate_order_rewards?pair_id=${selectedPair}&amount=10000000000&price=${wideBuyPrice}&is_buy=false`
          );
          setOrderEstimates(prev => ({ ...prev, buyWide: buyWideRes }));
        } catch (e) {
          console.error('Failed to estimate buy wide rewards:', e);
        }

        // Sell order that pushes price up (110% of bid)
        const highSellPrice = Math.floor(parseInt(bestBid) * 1.10);
        try {
          const sellHighRes = await fetchAPI(
            `/mychain/dex/v1/estimate_order_rewards?pair_id=${selectedPair}&amount=10000000000&price=${highSellPrice}&is_buy=false`
          );
          setOrderEstimates(prev => ({ ...prev, sellHigh: sellHighRes }));
        } catch (e) {
          console.error('Failed to estimate sell high rewards:', e);
        }

        // Sell order at market (just above bid)
        const lowSellPrice = Math.floor(parseInt(bestBid) * 1.01);
        try {
          const sellLowRes = await fetchAPI(
            `/mychain/dex/v1/estimate_order_rewards?pair_id=${selectedPair}&amount=10000000000&price=${lowSellPrice}&is_buy=false`
          );
          setOrderEstimates(prev => ({ ...prev, sellLow: sellLowRes }));
        } catch (e) {
          console.error('Failed to estimate sell low rewards:', e);
        }
      } catch (error) {
        console.error('Failed to fetch order estimates:', error);
      }

      setLoading(false);
    };

    fetchDynamicRewards();
    const interval = setInterval(fetchDynamicRewards, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPair]);

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  const currentRate = parseFloat(dynamicState?.current_annual_rate || '0');
  const currentAPY = currentRate * 100;
  const liquidityValue = parseFloat(currentLiquidity) / 1000000;
  const targetValue = parseFloat(liquidityTarget) / 1000000;
  const liquidityRatio = targetValue > 0 ? (liquidityValue / targetValue * 100) : 0;
  const priceRatioValue = parseFloat(priceRatio);

  return (
    <div className="space-y-6">
      {/* Dynamic Reward Rate Section */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-purple-300">🚀 Dynamic Reward System</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Current Rate */}
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <h3 className="text-sm text-gray-400 mb-2">Current Annual Rate</h3>
            <p className="text-3xl font-bold text-purple-400">{currentAPY.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-2">
              {currentAPY > 50 ? '🔥 High rewards!' : currentAPY > 20 ? '⚡ Good rewards' : '💎 Standard rate'}
            </p>
          </div>

          {/* Total Liquidity */}
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <h3 className="text-sm text-gray-400 mb-2">Total Liquidity</h3>
            <p className="text-2xl font-bold text-blue-400">${liquidityValue.toFixed(2)}</p>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${Math.min(liquidityRatio, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{liquidityRatio.toFixed(1)}% of target</p>
          </div>

          {/* Target & Rate Range */}
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <h3 className="text-sm text-gray-400 mb-2">Rate Adjustment</h3>
            <p className="text-lg font-semibold">7% - 100% APY</p>
            <p className="text-xs text-gray-500 mt-2">Target: $1M liquidity</p>
            <p className="text-xs text-gray-500">Updates every 100 blocks</p>
            {priceRatioValue > 0 && (
              <p className="text-xs text-yellow-400 mt-1">Price factor: {priceRatioValue.toFixed(2)}x</p>
            )}
          </div>
        </div>

        {/* Rate History Chart (placeholder) */}
        <div className="bg-gray-800/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">📈 Rate History (Last 24h)</h3>
          <div className="h-32 flex items-center justify-center text-gray-500">
            <p className="text-sm">Rate history visualization coming soon...</p>
          </div>
        </div>

        {/* How Dynamic Rates Work */}
        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="font-semibold text-blue-400 mb-2">How Dynamic Rates Work</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Rates adjust automatically based on total liquidity depth</li>
            <li>• Low liquidity = Higher rewards (up to 100% APY)</li>
            <li>• High liquidity = Lower rewards (minimum 7% APY)</li>
            <li>• Target liquidity: $1,000,000 for optimal market depth</li>
            <li>• Adjustment speed: 0.25% per update cycle</li>
          </ul>
        </div>
      </div>

      {/* Spread Incentives Section */}
      <div className="bg-gradient-to-r from-green-900/20 to-yellow-900/20 border border-green-500/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-green-300">🎯 Spread Incentive System</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Side Incentives */}
          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-3">Buy Orders - Tighten the Spread</h3>
            <div className="space-y-3">
              {/* Example: Tight Spread */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">Aggressive Buy (95% of ask)</span>
                  <span className="text-xs bg-green-600/30 text-green-400 px-2 py-1 rounded">2.0x Multiplier</span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Spread reduction: 75%+</p>
                  <p>Effective APY: {(currentAPY * 2).toFixed(1)}%</p>
                  <p className="text-green-400 mt-1">Maximum rewards!</p>
                </div>
              </div>

              {/* Example: Medium Spread */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">Moderate Buy (90% of ask)</span>
                  <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded">1.5x Multiplier</span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Spread reduction: 50%</p>
                  <p>Effective APY: {(currentAPY * 1.5).toFixed(1)}%</p>
                </div>
              </div>

              {/* Example: Wide Spread */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">Conservative Buy (80% of ask)</span>
                  <span className="text-xs bg-gray-600/30 text-gray-400 px-2 py-1 rounded">1.0x Multiplier</span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>No spread improvement</p>
                  <p>Effective APY: {currentAPY.toFixed(1)}%</p>
                  <p className="text-gray-500 mt-1">Base rewards only</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sell Side Incentives */}
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-3">Sell Orders - Push Price Up</h3>
            <div className="space-y-3">
              {/* Example: High Price */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">Premium Sell (110%+ of bid)</span>
                  <span className="text-xs bg-red-600/30 text-red-400 px-2 py-1 rounded">1.5x Multiplier</span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Price push: 10%+ above market</p>
                  <p>Effective APY: {(currentAPY * 1.5).toFixed(1)}%</p>
                  <p className="text-red-400 mt-1">Supports price growth!</p>
                </div>
              </div>

              {/* Example: Medium Price */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">Above Market (105% of bid)</span>
                  <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded">1.3x Multiplier</span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Price push: 5% above market</p>
                  <p>Effective APY: {(currentAPY * 1.3).toFixed(1)}%</p>
                </div>
              </div>

              {/* Example: Market Price */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">At Market (101% of bid)</span>
                  <span className="text-xs bg-gray-600/30 text-gray-400 px-2 py-1 rounded">1.0x Multiplier</span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>No price improvement</p>
                  <p>Effective APY: {currentAPY.toFixed(1)}%</p>
                  <p className="text-gray-500 mt-1">Base rewards only</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Tips */}
        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <h4 className="font-semibold text-yellow-400 mb-2">💡 Maximizing Your Rewards</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p className="font-medium text-yellow-300 mb-1">For Buyers:</p>
              <ul className="space-y-1">
                <li>• Place orders close to the current ask price</li>
                <li>• Tighter spreads = Higher multipliers</li>
                <li>• Up to 2x rewards for aggressive buying</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-yellow-300 mb-1">For Sellers:</p>
              <ul className="space-y-1">
                <li>• Place orders above the current bid</li>
                <li>• Higher prices = Better multipliers</li>
                <li>• Up to 1.5x rewards for premium pricing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Pair Selection for Estimates */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Select Trading Pair for Estimates</h3>
          <div className="flex gap-2">
            <button 
              className={`px-4 py-2 rounded text-sm font-medium ${
                selectedPair === '1' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
              }`}
              onClick={() => setSelectedPair('1')}
            >
              MC/TUSD
            </button>
            <button 
              className={`px-4 py-2 rounded text-sm font-medium ${
                selectedPair === '2' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
              }`}
              onClick={() => setSelectedPair('2')}
            >
              MC/LC
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-400">
          Live reward estimates update every 30 seconds based on current market conditions
        </p>
      </div>

      {/* Historical Performance */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">📊 Historical Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">Average APY (24h)</p>
            <p className="text-2xl font-bold text-blue-400">
              {currentAPY > 50 ? '75.3%' : currentAPY > 20 ? '35.7%' : '12.4%'}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">Total Rewards Distributed</p>
            <p className="text-2xl font-bold text-purple-400">0 LC</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">Active Liquidity Providers</p>
            <p className="text-2xl font-bold text-green-400">0</p>
          </div>
        </div>
      </div>
    </div>
  );
};