import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface OrderBookOrder {
  id: string;
  price: { amount: string };
  amount: { amount: string };
  filled_amount: { amount: string };
}

interface PlacementData {
  currentAPR: number;
  rewardedVolume: {
    buy: number;
    sell: number;
  };
  volumeCaps: {
    buy: number;
    sell: number;
  };
  optimalPrices: {
    buy: number[];
    sell: number[];
  };
  mcPrice: number;
  mcSupply: number;
  tier: number;
}

export const OrderPlacementGuide: React.FC = () => {
  const [placementData, setPlacementData] = useState<PlacementData | null>(null);
  const [userAmount, setUserAmount] = useState<string>('1000');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dynamic reward state
        const rewardRes = await fetchAPI('/mychain/dex/v1/dynamic_reward_state');
        const currentAPR = rewardRes ? parseFloat(rewardRes.state.current_annual_rate) : 100;

        // Fetch MC price
        const priceRes = await fetchAPI('/mychain/maincoin/v1/current_price');
        const mcPrice = priceRes?.price ? parseFloat(priceRes.price) : 0.0001;

        // Fetch MC supply
        const supplyRes = await fetchAPI('/cosmos/bank/v1beta1/supply');
        const mcSupplyData = supplyRes.supply?.find((s: any) => s.denom === 'umc');
        const mcSupply = mcSupplyData ? parseInt(mcSupplyData.amount) / 1000000 : 0;

        // Fetch tier info
        const tierRes = await fetchAPI('/mychain/dex/v1/tier_info/1');
        const currentTier = tierRes?.current_tier || 1;

        // Determine volume caps based on tier
        const tierCaps = [
          { buy: 0.02, sell: 0.01 },  // Tier 1
          { buy: 0.05, sell: 0.03 },  // Tier 2
          { buy: 0.08, sell: 0.04 },  // Tier 3
          { buy: 0.12, sell: 0.05 },  // Tier 4
        ];
        const caps = tierCaps[currentTier - 1] || tierCaps[0];

        // Fetch order book
        const orderBookRes = await fetchAPI('/mychain/dex/v1/order_book/1');
        
        // Calculate rewarded volume
        let rewardedBuyVolume = 0;
        let rewardedSellVolume = 0;
        const buyPrices: number[] = [];
        const sellPrices: number[] = [];

        if (orderBookRes) {
          // Process buy orders (sorted by price descending)
          const buyOrders = (orderBookRes.buy_orders || [])
            .map((o: OrderBookOrder) => ({
              price: parseFloat(o.price.amount) / 1000000,
              remaining: (parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000
            }))
            .sort((a: any, b: any) => b.price - a.price);

          const maxBuyVolume = mcSupply * mcPrice * caps.buy;
          let accumulatedBuyVolume = 0;

          for (const order of buyOrders) {
            const orderValue = order.remaining * order.price;
            if (accumulatedBuyVolume + orderValue <= maxBuyVolume) {
              rewardedBuyVolume += orderValue;
              accumulatedBuyVolume += orderValue;
              buyPrices.push(order.price);
            } else {
              // This order partially gets rewards
              const remainingCap = maxBuyVolume - accumulatedBuyVolume;
              if (remainingCap > 0) {
                rewardedBuyVolume += remainingCap;
                buyPrices.push(order.price);
              }
              break;
            }
          }

          // Process sell orders (sorted by price ascending)
          const sellOrders = (orderBookRes.sell_orders || [])
            .map((o: OrderBookOrder) => ({
              price: parseFloat(o.price.amount) / 1000000,
              remaining: (parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000
            }))
            .sort((a: any, b: any) => a.price - b.price);

          const maxSellVolume = mcSupply * mcPrice * caps.sell;
          let accumulatedSellVolume = 0;

          for (const order of sellOrders) {
            const orderValue = order.remaining * order.price;
            if (accumulatedSellVolume + orderValue <= maxSellVolume) {
              rewardedSellVolume += orderValue;
              accumulatedSellVolume += orderValue;
              sellPrices.push(order.price);
            } else {
              // This order partially gets rewards
              const remainingCap = maxSellVolume - accumulatedSellVolume;
              if (remainingCap > 0) {
                rewardedSellVolume += remainingCap;
                sellPrices.push(order.price);
              }
              break;
            }
          }
        }

        setPlacementData({
          currentAPR,
          rewardedVolume: {
            buy: rewardedBuyVolume,
            sell: rewardedSellVolume
          },
          volumeCaps: {
            buy: mcSupply * mcPrice * caps.buy,
            sell: mcSupply * mcPrice * caps.sell
          },
          optimalPrices: {
            buy: buyPrices,
            sell: sellPrices
          },
          mcPrice,
          mcSupply,
          tier: currentTier
        });

      } catch (error) {
        console.error('Error fetching placement data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !placementData) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  const amount = parseFloat(userAmount) || 0;
  const minimumOrder = (0.000001 * 8760 * 100 / placementData.currentAPR);
  const estimatedReward = amount * placementData.currentAPR / 100 / 365;
  const hourlyReward = amount * placementData.currentAPR / 100 / 8760;

  // Calculate cutoff prices
  const buyCutoffPrice = placementData.optimalPrices.buy.length > 0 
    ? Math.min(...placementData.optimalPrices.buy) 
    : placementData.mcPrice;
  const sellCutoffPrice = placementData.optimalPrices.sell.length > 0 
    ? Math.max(...placementData.optimalPrices.sell) 
    : placementData.mcPrice;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">📍 Order Placement Guide</h2>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-sm text-purple-400 mb-2">Current APR</h3>
          <p className="text-3xl font-bold text-purple-300">{placementData.currentAPR.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">Applied to all eligible orders</p>
        </div>

        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-sm text-green-400 mb-2">Buy Volume Earning Rewards</h3>
          <p className="text-xl font-bold text-green-300">${placementData.rewardedVolume.buy.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">
            of ${placementData.volumeCaps.buy.toFixed(2)} cap ({((placementData.rewardedVolume.buy / placementData.volumeCaps.buy) * 100).toFixed(1)}%)
          </p>
        </div>

        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
          <h3 className="text-sm text-red-400 mb-2">Sell Volume Earning Rewards</h3>
          <p className="text-xl font-bold text-red-300">${placementData.rewardedVolume.sell.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">
            of ${placementData.volumeCaps.sell.toFixed(2)} cap ({((placementData.rewardedVolume.sell / placementData.volumeCaps.sell) * 100).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Optimal Price Ranges */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">🎯 Where to Place Orders for Rewards</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buy Orders */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-3">Buy Orders</h4>
            {placementData.rewardedVolume.buy < placementData.volumeCaps.buy ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  ✅ <strong>Any price will earn rewards</strong> - cap not reached
                </p>
                <p className="text-xs text-gray-400">
                  ${(placementData.volumeCaps.buy - placementData.rewardedVolume.buy).toFixed(2)} of cap space available
                </p>
                <div className="mt-2 p-2 bg-green-900/30 rounded">
                  <p className="text-xs">
                    💡 Higher prices get priority when cap fills
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  ⚠️ <strong>Must bid above ${buyCutoffPrice.toFixed(6)}</strong>
                </p>
                <p className="text-xs text-gray-400">
                  Cap is full - only higher prices earn rewards
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-400">Current rewarded range:</p>
                  <p className="text-xs font-mono">
                    ${Math.max(...placementData.optimalPrices.buy).toFixed(6)} - ${buyCutoffPrice.toFixed(6)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sell Orders */}
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-red-400 font-medium mb-3">Sell Orders</h4>
            {placementData.rewardedVolume.sell < placementData.volumeCaps.sell ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  ✅ <strong>Any price will earn rewards</strong> - cap not reached
                </p>
                <p className="text-xs text-gray-400">
                  ${(placementData.volumeCaps.sell - placementData.rewardedVolume.sell).toFixed(2)} of cap space available
                </p>
                <div className="mt-2 p-2 bg-red-900/30 rounded">
                  <p className="text-xs">
                    💡 Higher asks get priority when cap fills
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  ⚠️ <strong>Must ask above ${sellCutoffPrice.toFixed(6)}</strong>
                </p>
                <p className="text-xs text-gray-400">
                  Cap is full - only higher prices earn rewards
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-400">Current rewarded range:</p>
                  <p className="text-xs font-mono">
                    ${sellCutoffPrice.toFixed(6)} - ${Math.min(...placementData.optimalPrices.sell).toFixed(6)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
          <p className="text-sm text-yellow-400">
            💡 <strong>Key Insight:</strong> Orders are rewarded by price priority. Higher MC valuations (higher bids, higher asks) get rewarded first up to the volume cap.
          </p>
        </div>
      </div>

      {/* Order Calculator */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">🧮 Reward Calculator</h3>
        
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Order Amount ($)</label>
          <input
            type="number"
            value={userAmount}
            onChange={(e) => setUserAmount(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            placeholder="Enter order amount"
            min="0"
            step="100"
          />
        </div>

        {amount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Expected LC Rewards</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Per hour:</span>
                  <span className={`font-mono ${amount < minimumOrder ? 'text-red-400' : 'text-green-400'}`}>
                    {amount < minimumOrder ? '0.000000 LC' : hourlyReward.toFixed(6) + ' LC'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Per day:</span>
                  <span className={`font-mono ${amount < minimumOrder ? 'text-red-400' : 'text-green-400'}`}>
                    {amount < minimumOrder ? '0.000000 LC' : (estimatedReward).toFixed(6) + ' LC'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Per year:</span>
                  <span className={`font-mono ${amount < minimumOrder ? 'text-red-400' : 'text-green-400'}`}>
                    {amount < minimumOrder ? '0.000000 LC' : (estimatedReward * 365).toFixed(6) + ' LC'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Order Status</h4>
              <div className="space-y-2 text-xs">
                {amount < minimumOrder ? (
                  <div className="p-2 bg-red-900/30 rounded">
                    <span className="text-red-400">❌ Too small - no rewards</span>
                    <p className="text-xs mt-1">Need at least ${minimumOrder.toFixed(2)}</p>
                  </div>
                ) : (
                  <div className="p-2 bg-green-900/30 rounded">
                    <span className="text-green-400">✅ Eligible for rewards</span>
                    <p className="text-xs mt-1">Will earn {placementData.currentAPR.toFixed(1)}% APR</p>
                  </div>
                )}
                
                <div className="p-2 bg-blue-900/30 rounded">
                  <p className="text-blue-400">At current market price:</p>
                  <p className="text-xs">{(amount / placementData.mcPrice).toFixed(2)} MC</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tier-Based Volume Caps */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h3 className="font-semibold mb-3">📊 Current Tier {placementData.tier} Volume Caps</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• MC Supply: {placementData.mcSupply.toFixed(2)} MC</p>
          <p>• MC Price: ${placementData.mcPrice.toFixed(6)}</p>
          <p>• Total MC Value: ${(placementData.mcSupply * placementData.mcPrice).toFixed(2)}</p>
          <div className="mt-2 p-3 bg-gray-800/50 rounded">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-green-400 font-medium">Buy Side Cap:</p>
                <p className="text-lg">${placementData.volumeCaps.buy.toFixed(2)}</p>
                <p className="text-xs text-gray-400">
                  {((placementData.volumeCaps.buy / (placementData.mcSupply * placementData.mcPrice)) * 100).toFixed(1)}% of MC value
                </p>
              </div>
              <div>
                <p className="text-red-400 font-medium">Sell Side Cap:</p>
                <p className="text-lg">${placementData.volumeCaps.sell.toFixed(2)}</p>
                <p className="text-xs text-gray-400">
                  {((placementData.volumeCaps.sell / (placementData.mcSupply * placementData.mcPrice)) * 100).toFixed(1)}% of MC value
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Tips */}
      <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="font-semibold text-blue-400 mb-2">💡 Strategic Tips</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Place orders at market price or better to guarantee rewards when caps aren't full</li>
          <li>• Monitor cap usage - when near full, only the highest prices earn rewards</li>
          <li>• Orders below ${minimumOrder.toFixed(2)} earn 0 LC due to rounding</li>
          <li>• All rewards are paid in LC tokens, regardless of trading pair</li>
          <li>• Rewards are distributed every 100 blocks (~8.3 minutes)</li>
          <li>• The system prioritizes orders that value MC higher</li>
        </ul>
      </div>
    </div>
  );
};