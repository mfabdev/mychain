import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
// import { formatCurrency, formatPercentage } from '../utils/formatters';

interface DynamicRewardState {
  state: {
    current_annual_rate: string;
    last_update_block: string;
    last_update_time: string;
  };
  current_liquidity: string;
  liquidity_target: string;
}

interface TierInfo {
  tier: number;
  priceDeviation: string;
  bidVolumeCap: string;
  askVolumeCap: string;
  description: string;
  active?: boolean;
}

export const DynamicRewardsInfo: React.FC = () => {
  const [rewardState, setRewardState] = useState<DynamicRewardState | null>(null);
  const [mcPrice, setMcPrice] = useState<number>(0.0001);
  const [mcSupply, setMcSupply] = useState<string>('0');
  const [currentTier, setCurrentTier] = useState<number>(1);
  const [bidLiquidity, setBidLiquidity] = useState<number>(0);
  const [askLiquidity, setAskLiquidity] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const tiers: TierInfo[] = [
    {
      tier: 1,
      priceDeviation: "0% to -3%",
      bidVolumeCap: "2%",
      askVolumeCap: "1%",
      description: "Supporting price appreciation"
    },
    {
      tier: 2,
      priceDeviation: "-3% to -8%",
      bidVolumeCap: "5%",
      askVolumeCap: "3%",
      description: "Incentivizing price support"
    },
    {
      tier: 3,
      priceDeviation: "-8% to -12%",
      bidVolumeCap: "8%",
      askVolumeCap: "4%",
      description: "Strong price support needed"
    },
    {
      tier: 4,
      priceDeviation: "Below -12%",
      bidVolumeCap: "12%",
      askVolumeCap: "5%",
      description: "Maximum price support active"
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dynamic reward state
        const rewardRes = await fetchAPI('/mychain/dex/v1/dynamic_reward_state');
        if (rewardRes) {
          setRewardState(rewardRes);
        }

        // Fetch MC price
        const priceRes = await fetchAPI('/mychain/maincoin/v1/current_price');
        if (priceRes?.current_price) {
          setMcPrice(parseFloat(priceRes.current_price) / 1000000);
        }

        // Fetch MC supply
        const supplyRes = await fetchAPI('/cosmos/bank/v1beta1/supply');
        const mcSupplyData = supplyRes.supply?.find((s: any) => s.denom === 'umc');
        if (mcSupplyData) {
          setMcSupply(mcSupplyData.amount);
        }

        // Fetch order book to calculate bid/ask liquidity
        const orderBookRes = await fetchAPI('/mychain/dex/v1/order_book/1');
        if (orderBookRes) {
          // Calculate bid liquidity
          const bidTotal = (orderBookRes.buy_orders || []).reduce((sum: number, order: any) => {
            const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
            const price = parseFloat(order.price.amount) / 1000000;
            return sum + (remaining * price / 1000000);
          }, 0);
          setBidLiquidity(bidTotal);

          // Calculate ask liquidity
          const askTotal = (orderBookRes.sell_orders || []).reduce((sum: number, order: any) => {
            const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
            const price = parseFloat(order.price.amount) / 1000000;
            return sum + (remaining * price / 1000000);
          }, 0);
          setAskLiquidity(askTotal);
        }

        // Determine current tier based on price
        // For now, assume tier 1 (would need reference price endpoint)
        setCurrentTier(1);

      } catch (error) {
        console.error('Error fetching dynamic rewards data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  const currentRate = rewardState ? parseFloat(rewardState.state.current_annual_rate) : 100;
  const mcSupplyValue = (parseInt(mcSupply) / 1000000) * mcPrice;
  const activeTier = tiers[currentTier - 1];

  // Calculate target liquidity based on active tier
  const bidTarget = mcSupplyValue * (parseFloat(activeTier.bidVolumeCap) / 100);
  const askTarget = mcSupplyValue * (parseFloat(activeTier.askVolumeCap) / 100);
  const bidPercentage = mcSupplyValue > 0 ? (bidLiquidity / mcSupplyValue) * 100 : 0;
  const askPercentage = mcSupplyValue > 0 ? (askLiquidity / mcSupplyValue) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🎯 Dynamic Liquidity Rewards</span>
        <span className="text-sm font-normal text-gray-400">(7-100% APR)</span>
      </h2>
      
      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
        <p className="text-sm text-green-400">
          <strong>System Goal:</strong> Push MC price up by rewarding orders with higher MC prices. 
          Both buy orders (higher bids) and sell orders (higher asks) that value MC more get priority rewards.
        </p>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-sm text-purple-400 mb-2">Current APR</h3>
          <p className="text-3xl font-bold text-purple-300">{currentRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {currentRate >= 100 ? 'Maximum rate - Need liquidity!' : 
             currentRate <= 7 ? 'Minimum rate - Targets met' : 
             'Adjusting based on liquidity'}
          </p>
        </div>

        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm text-blue-400 mb-2">Active Tier</h3>
          <p className="text-3xl font-bold text-blue-300">Tier {currentTier}</p>
          <p className="text-xs text-gray-400 mt-1">{activeTier.description}</p>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-sm text-yellow-400 mb-2">MC Price</h3>
          <p className="text-3xl font-bold text-yellow-300">${mcPrice.toFixed(6)}</p>
          <p className="text-xs text-gray-400 mt-1">Reference for tier calculation</p>
        </div>
      </div>

      {/* Bid/Ask Liquidity Status */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">📊 Current Liquidity vs Targets</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bid Side */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-green-400 font-medium">Buy Orders (Bid)</span>
              <span className="text-sm text-gray-400">
                Target: {activeTier.bidVolumeCap} of MC supply
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Current: ${bidLiquidity.toFixed(2)}</span>
                <span>Target: ${bidTarget.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    bidPercentage >= parseFloat(activeTier.bidVolumeCap) ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min((bidLiquidity / bidTarget) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">
                {bidPercentage.toFixed(2)}% of MC supply 
                {bidPercentage >= parseFloat(activeTier.bidVolumeCap) ? ' ✅ Target met' : ' ⚠️ Need more liquidity'}
              </div>
            </div>
          </div>

          {/* Ask Side */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-red-400 font-medium">Sell Orders (Ask)</span>
              <span className="text-sm text-gray-400">
                Target: {activeTier.askVolumeCap} of MC supply
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Current: ${askLiquidity.toFixed(2)}</span>
                <span>Target: ${askTarget.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    askPercentage >= parseFloat(activeTier.askVolumeCap) ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min((askLiquidity / askTarget) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">
                {askPercentage.toFixed(2)}% of MC supply
                {askPercentage >= parseFloat(activeTier.askVolumeCap) ? ' ✅ Target met' : ' ⚠️ Need more liquidity'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
          <p className="text-sm text-yellow-400">
            💡 Rate decreases only when BOTH bid and ask targets are met. Currently: 
            {bidPercentage >= parseFloat(activeTier.bidVolumeCap) && askPercentage >= parseFloat(activeTier.askVolumeCap) 
              ? ' Both targets met - rate will decrease' 
              : ' Targets not met - rate stays high'}
          </p>
        </div>
      </div>

      {/* Tier System */}
      <div className="space-y-3">
        <h3 className="font-semibold">🏆 Tier System Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          {tiers.map((tier) => (
            <div 
              key={tier.tier}
              className={`p-3 rounded-lg border transition-all ${
                tier.tier === currentTier 
                  ? 'bg-blue-900/30 border-blue-500 shadow-lg' 
                  : 'bg-gray-700/30 border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Tier {tier.tier}</h4>
                {tier.tier === currentTier && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-2">{tier.description}</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price range:</span>
                  <span>{tier.priceDeviation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bid cap:</span>
                  <span className="text-green-400">{tier.bidVolumeCap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ask cap:</span>
                  <span className="text-red-400">{tier.askVolumeCap}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minimum Deposit Requirements */}
      <div className="mt-6 bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
        <h3 className="font-semibold text-orange-400 mb-3">⚠️ Minimum Order Requirements</h3>
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            Orders must be large enough to generate at least 1 micro-LC (0.000001 LC) per distribution cycle to avoid rounding to zero.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Minimum Order Sizes at {currentRate.toFixed(1)}% APR</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">For 1 micro-LC per hour:</span>
                  <span className="font-mono text-yellow-400">${(0.000001 * 8760 * 100 / currentRate).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">For 1 LC per hour:</span>
                  <span className="font-mono text-green-400">${(1 * 8760 * 100 / currentRate).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">For 10 LC per hour:</span>
                  <span className="font-mono text-blue-400">${(10 * 8760 * 100 / currentRate).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Recommended Minimums</h4>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-red-900/30 rounded">
                  <span className="text-red-400">❌ Too Small:</span>
                  <span className="ml-2">Orders under ${(0.000001 * 8760 * 100 / currentRate).toFixed(2)} earn 0 LC</span>
                </div>
                <div className="p-2 bg-yellow-900/30 rounded">
                  <span className="text-yellow-400">⚠️ Minimal:</span>
                  <span className="ml-2">$100-500 orders earn dust amounts</span>
                </div>
                <div className="p-2 bg-green-900/30 rounded">
                  <span className="text-green-400">✅ Optimal:</span>
                  <span className="ml-2">$1,000+ orders for meaningful rewards</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-400 bg-gray-800/30 rounded p-2">
            💡 <strong>Pro tip:</strong> The exact threshold is ${(0.000001 * 8760 * 100 / currentRate).toFixed(2)} at current {currentRate.toFixed(1)}% APR.
            Below this amount, your hourly rewards round down to 0 LC due to integer precision.
          </div>
        </div>
      </div>

      {/* LC Reward Payment Notice */}
      <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="font-semibold text-blue-400 mb-2">💎 Liquidity Rewards Payment</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• <strong>All rewards are paid in LC tokens</strong> for both trading pairs:</p>
          <div className="ml-4 space-y-1">
            <p>- MC/TUSD orders earn LC rewards</p>
            <p>- MC/LC orders also earn LC rewards</p>
          </div>
          <p>• LC value starts at 0.0001 MC and can appreciate over time</p>
          <p>• Your order value determines LC rewards, regardless of trading pair</p>
        </div>
      </div>

      {/* Reward Examples */}
      <div className="mt-6 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <h3 className="font-semibold text-purple-400 mb-3">💰 LC Reward Examples at {currentRate.toFixed(1)}% APR</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="text-green-400 font-medium mb-2">Buy Order Examples</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>$100 order for 1 hour:</span>
                <span className={`font-mono ${100 < (0.000001 * 8760 * 100 / currentRate) ? 'text-red-400 line-through' : ''}`}>
                  {(100 * currentRate / 100 / 8760).toFixed(6)} LC
                  {100 < (0.000001 * 8760 * 100 / currentRate) && ' (0 LC)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>$1,000 order for 1 day:</span>
                <span className="font-mono">{(1000 * currentRate / 100 / 365).toFixed(6)} LC</span>
              </div>
              <div className="flex justify-between">
                <span>$10,000 order for 1 week:</span>
                <span className="font-mono">{(10000 * currentRate / 100 / 52).toFixed(6)} LC</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-red-400 font-medium mb-2">Sell Order Examples</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>$100 order for 1 hour:</span>
                <span className={`font-mono ${100 < (0.000001 * 8760 * 100 / currentRate) ? 'text-red-400 line-through' : ''}`}>
                  {(100 * currentRate / 100 / 8760).toFixed(6)} LC
                  {100 < (0.000001 * 8760 * 100 / currentRate) && ' (0 LC)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>$1,000 order for 1 day:</span>
                <span className="font-mono">{(1000 * currentRate / 100 / 365).toFixed(6)} LC</span>
              </div>
              <div className="flex justify-between">
                <span>$10,000 order for 1 week:</span>
                <span className="font-mono">{(10000 * currentRate / 100 / 52).toFixed(6)} LC</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          * Rewards are distributed every 100 blocks (~8.3 minutes) and auto-sent to your wallet<br/>
          * All eligible orders earn the same APR - no bonuses are currently active
        </p>
      </div>

      {/* How It Works */}
      <div className="mt-4 bg-gray-700/30 rounded-lg p-4">
        <h4 className="font-medium mb-2">🚀 How Rewards Drive MC Price Up</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>Goal: Push MC price higher</strong> by rewarding orders with higher MC prices</li>
          <li>• Buy orders: Higher bids get priority - those paying MORE for MC</li>
          <li>• Sell orders: Higher asks get priority - those valuing MC MORE</li>
          <li>• APR starts at 100% to attract price-supporting liquidity</li>
          <li>• Rate adjusts every 6 hours based on liquidity targets</li>
          <li>• System activates stronger incentives when price support is needed</li>
          <li>• <strong>All rewards paid in LC tokens</strong> to preserve MC value</li>
          <li>• <strong>Spread bonuses planned</strong> for orders that support price appreciation</li>
        </ul>
      </div>
    </div>
  );
};