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
  orderBook?: {
    buy_orders: OrderBookOrder[];
    sell_orders: OrderBookOrder[];
  };
}

export const OrderPlacementGuide: React.FC = () => {
  const [placementData, setPlacementData] = useState<PlacementData | null>(null);
  const [userAmount, setUserAmount] = useState<string>('1000');
  const [userPrice, setUserPrice] = useState<string>('');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
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
          tier: currentTier,
          orderBook: orderBookRes
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
          <div className="mt-1 space-y-1">
            <p className="text-xs text-gray-400">
              Total cap: ${placementData.volumeCaps.buy.toFixed(2)}
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${placementData.rewardedVolume.buy >= placementData.volumeCaps.buy ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((placementData.rewardedVolume.buy / placementData.volumeCaps.buy) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {((placementData.rewardedVolume.buy / placementData.volumeCaps.buy) * 100).toFixed(1)}% used
            </p>
          </div>
        </div>

        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
          <h3 className="text-sm text-red-400 mb-2">Sell Volume Earning Rewards</h3>
          <p className="text-xl font-bold text-red-300">${placementData.rewardedVolume.sell.toFixed(2)}</p>
          <div className="mt-1 space-y-1">
            <p className="text-xs text-gray-400">
              Total cap: ${placementData.volumeCaps.sell.toFixed(2)}
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${placementData.rewardedVolume.sell >= placementData.volumeCaps.sell ? 'bg-red-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min((placementData.rewardedVolume.sell / placementData.volumeCaps.sell) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {((placementData.rewardedVolume.sell / placementData.volumeCaps.sell) * 100).toFixed(1)}% used
            </p>
          </div>
        </div>
      </div>

      {/* Optimal Price Ranges */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">🎯 Where to Place Orders for Rewards</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buy Orders */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-3">Buy Orders</h4>
            {(() => {
              const remainingBuyCap = placementData.volumeCaps.buy - placementData.rewardedVolume.buy;
              const capPercentUsed = (placementData.rewardedVolume.buy / placementData.volumeCaps.buy) * 100;
              
              if (remainingBuyCap > 100) {
                return (
                  <div className="space-y-2">
                    <div className="p-2 bg-green-900/30 rounded">
                      <p className="text-sm font-medium text-green-400">✅ Cap has plenty of space</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Maximum eligible:</span>
                        <span className="font-mono text-white">${remainingBuyCap.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price requirement:</span>
                        <span className="font-mono text-green-400">Any price</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cap usage:</span>
                        <span className="font-mono">{capPercentUsed.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs">
                      <p>💡 Place at market price or higher for best priority</p>
                    </div>
                  </div>
                );
              } else if (remainingBuyCap > 0) {
                return (
                  <div className="space-y-2">
                    <div className="p-2 bg-yellow-900/30 rounded">
                      <p className="text-sm font-medium text-yellow-400">⚠️ Cap nearly full</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Maximum eligible:</span>
                        <span className="font-mono text-yellow-400">${remainingBuyCap.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price requirement:</span>
                        <span className="font-mono text-green-400">Any price (for now)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cap usage:</span>
                        <span className="font-mono text-yellow-400">{capPercentUsed.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-orange-900/30 rounded text-xs">
                      <p>⚡ Act fast! Only ${remainingBuyCap.toFixed(2)} left</p>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-2">
                    <div className="p-2 bg-red-900/30 rounded">
                      <p className="text-sm font-medium text-red-400">❌ Cap is full</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total cap volume:</span>
                        <span className="font-mono">${placementData.volumeCaps.buy.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Currently used:</span>
                        <span className="font-mono text-red-400">${placementData.rewardedVolume.buy.toFixed(2)} (100%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Required price:</span>
                        <span className="font-mono text-yellow-400">≥ ${buyCutoffPrice.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current range:</span>
                        <span className="font-mono text-xs">
                          ${buyCutoffPrice.toFixed(6)} - ${placementData.optimalPrices.buy.length > 0 ? Math.max(...placementData.optimalPrices.buy).toFixed(6) : buyCutoffPrice.toFixed(6)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-red-900/30 rounded text-xs">
                      <p>💰 Must outbid existing orders to earn rewards</p>
                    </div>
                  </div>
                );
              }
            })()}
          </div>

          {/* Sell Orders */}
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-red-400 font-medium mb-3">Sell Orders</h4>
            {(() => {
              const remainingSellCap = placementData.volumeCaps.sell - placementData.rewardedVolume.sell;
              const capPercentUsed = (placementData.rewardedVolume.sell / placementData.volumeCaps.sell) * 100;
              
              if (remainingSellCap > 50) {
                return (
                  <div className="space-y-2">
                    <div className="p-2 bg-green-900/30 rounded">
                      <p className="text-sm font-medium text-green-400">✅ Cap has plenty of space</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Maximum eligible:</span>
                        <span className="font-mono text-white">${remainingSellCap.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price requirement:</span>
                        <span className="font-mono text-green-400">Any price</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cap usage:</span>
                        <span className="font-mono">{capPercentUsed.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs">
                      <p>💡 Place at market price or higher for best priority</p>
                    </div>
                  </div>
                );
              } else if (remainingSellCap > 0) {
                return (
                  <div className="space-y-2">
                    <div className="p-2 bg-yellow-900/30 rounded">
                      <p className="text-sm font-medium text-yellow-400">⚠️ Cap nearly full</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Maximum eligible:</span>
                        <span className="font-mono text-yellow-400">${remainingSellCap.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price requirement:</span>
                        <span className="font-mono text-green-400">Any price (for now)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cap usage:</span>
                        <span className="font-mono text-yellow-400">{capPercentUsed.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-orange-900/30 rounded text-xs">
                      <p>⚡ Act fast! Only ${remainingSellCap.toFixed(2)} left</p>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-2">
                    <div className="p-2 bg-red-900/30 rounded">
                      <p className="text-sm font-medium text-red-400">❌ Cap is full</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total cap volume:</span>
                        <span className="font-mono">${placementData.volumeCaps.sell.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Currently used:</span>
                        <span className="font-mono text-red-400">${placementData.rewardedVolume.sell.toFixed(2)} (100%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Required price:</span>
                        <span className="font-mono text-yellow-400">≥ ${sellCutoffPrice.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current range:</span>
                        <span className="font-mono text-xs">
                          ${sellCutoffPrice.toFixed(6)} - ${placementData.optimalPrices.sell.length > 0 ? Math.max(...placementData.optimalPrices.sell).toFixed(6) : sellCutoffPrice.toFixed(6)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-red-900/30 rounded text-xs">
                      <p>💰 Must outbid existing orders to earn rewards</p>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
          <p className="text-sm text-yellow-400">
            💡 <strong>Key Insight:</strong> Maximum eligible volume depends on remaining cap space. When caps are full, you must outbid existing orders to push them out and earn rewards.
          </p>
        </div>
      </div>

      {/* Order Calculator */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">🧮 Reward Calculator</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as 'buy' | 'sell')}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="buy">Buy Order</option>
              <option value="sell">Sell Order</option>
            </select>
          </div>
          
          <div>
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
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Price per MC ($)</label>
            <input
              type="number"
              value={userPrice}
              onChange={(e) => setUserPrice(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              placeholder={placementData ? placementData.mcPrice.toFixed(6) : "Enter price"}
              min="0"
              step="0.000001"
            />
          </div>
        </div>

        {amount > 0 && (
          <div className="space-y-4">
            {/* Price Analysis */}
            {(() => {
              const price = parseFloat(userPrice) || placementData.mcPrice;
              const priceDeviation = ((price - placementData.mcPrice) / placementData.mcPrice) * 100;
              
              // Determine if price qualifies for rewards based on order type
              const willEarnRewards = orderType === 'buy' 
                ? (placementData.rewardedVolume.buy < placementData.volumeCaps.buy || price >= buyCutoffPrice)
                : (placementData.rewardedVolume.sell < placementData.volumeCaps.sell || price >= sellCutoffPrice);
              
              // Calculate suggested prices
              const suggestedPrices = orderType === 'buy' ? {
                minimum: placementData.rewardedVolume.buy >= placementData.volumeCaps.buy ? buyCutoffPrice : placementData.mcPrice * 0.95,
                optimal: placementData.mcPrice,
                aggressive: placementData.mcPrice * 1.02
              } : {
                minimum: placementData.rewardedVolume.sell >= placementData.volumeCaps.sell ? sellCutoffPrice : placementData.mcPrice * 0.98,
                optimal: placementData.mcPrice,
                aggressive: placementData.mcPrice * 1.03
              };
              
              return (
                <div className="bg-gray-800/50 rounded p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    💰 Price Analysis for {orderType === 'buy' ? 'Buy' : 'Sell'} Order
                  </h4>
                  
                  {/* Price Status */}
                  <div className={`p-3 rounded mb-3 ${willEarnRewards ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        Price: ${price.toFixed(6)}
                      </span>
                      <span className={`text-sm ${willEarnRewards ? 'text-green-400' : 'text-red-400'}`}>
                        {willEarnRewards ? '✅ Eligible for rewards' : '❌ No rewards at this price'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {priceDeviation > 0 ? '+' : ''}{priceDeviation.toFixed(2)}% from market (${placementData.mcPrice.toFixed(6)})
                    </div>
                  </div>
                  
                  {/* Maximum Eligible Volume */}
                  <div className="mb-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded">
                    <h5 className="text-sm font-medium text-purple-400 mb-2">💎 Maximum Eligible Volume Analysis</h5>
                    {(() => {
                      const currentPrice = parseFloat(userPrice) || placementData.mcPrice;
                      const remainingCap = orderType === 'buy' 
                        ? placementData.volumeCaps.buy - placementData.rewardedVolume.buy
                        : placementData.volumeCaps.sell - placementData.rewardedVolume.sell;
                      
                      // If cap has space, simple case
                      if (remainingCap > 0) {
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Available cap space:</span>
                              <span className="font-mono text-white">${remainingCap.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Your max eligible:</span>
                              <span className="font-mono text-green-400">${Math.min(amount, remainingCap).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Required price:</span>
                              <span className="font-mono text-green-400">Any price</span>
                            </div>
                            {amount > remainingCap && (
                              <div className="mt-2 p-2 bg-yellow-900/30 rounded">
                                <p className="text-yellow-400">⚠️ Only ${remainingCap.toFixed(2)} of your ${amount.toFixed(2)} order will earn rewards</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Cap is full - analyze what would be displaced
                      if (orderType === 'buy') {
                        // For buy orders, calculate volume that would be displaced at user's price
                        let volumeAtOrBelowPrice = 0;
                        
                        // Get all buy orders sorted by price ascending (lowest first)
                        const buyOrders = (placementData.orderBook?.buy_orders || [])
                          .map((o: OrderBookOrder) => ({
                            price: parseFloat(o.price.amount) / 1000000,
                            remaining: (parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000,
                            value: ((parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000) * (parseFloat(o.price.amount) / 1000000)
                          }))
                          .sort((a: any, b: any) => a.price - b.price);
                        
                        // Calculate how much volume would be displaced
                        for (const order of buyOrders) {
                          if (order.price < currentPrice) {
                            volumeAtOrBelowPrice += order.value;
                          }
                        }
                        
                        const maxEligible = Math.min(amount, Math.min(volumeAtOrBelowPrice, placementData.volumeCaps.buy));
                        
                        // Calculate price needed for full amount
                        let priceNeededForFullAmount = buyCutoffPrice;
                        let cumulativeVolume = 0;
                        const sortedBuyOrders = [...buyOrders].sort((a: any, b: any) => a.price - b.price);
                        
                        for (let i = 0; i < sortedBuyOrders.length; i++) {
                          cumulativeVolume += sortedBuyOrders[i].value;
                          if (cumulativeVolume >= Math.min(amount, placementData.volumeCaps.buy)) {
                            priceNeededForFullAmount = sortedBuyOrders[i].price + 0.000001;
                            break;
                          }
                        }
                        
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total cap:</span>
                              <span className="font-mono">${placementData.volumeCaps.buy.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Your amount:</span>
                              <span className="font-mono">${amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Your price:</span>
                              <span className="font-mono">${currentPrice.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Volume you'd displace:</span>
                              <span className="font-mono text-yellow-400">${volumeAtOrBelowPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Your max eligible:</span>
                              <span className="font-mono text-green-400">${maxEligible.toFixed(2)}</span>
                            </div>
                            
                            {/* Price recommendation */}
                            {amount > 0 && (
                              <div className="mt-2 p-2 bg-purple-900/30 border border-purple-500/30 rounded">
                                <p className="text-purple-400 font-medium mb-1">💎 Price needed for ${Math.min(amount, placementData.volumeCaps.buy).toFixed(2)}:</p>
                                <p className="font-mono text-lg text-white">${priceNeededForFullAmount.toFixed(6)}</p>
                                {amount > placementData.volumeCaps.buy && (
                                  <p className="text-xs text-yellow-400 mt-1">
                                    ⚠️ Cap is ${placementData.volumeCaps.buy.toFixed(2)}, so max possible is capped
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {currentPrice <= buyCutoffPrice && (
                              <div className="mt-2 p-2 bg-red-900/30 rounded">
                                <p className="text-red-400">❌ Price too low! Minimum: ${buyCutoffPrice.toFixed(6)}</p>
                              </div>
                            )}
                            {currentPrice > buyCutoffPrice && maxEligible < amount && (
                              <div className="mt-2 p-2 bg-yellow-900/30 rounded">
                                <p className="text-yellow-400">💡 Increase to ${priceNeededForFullAmount.toFixed(6)} for full amount</p>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        // Similar logic for sell orders
                        let volumeAtOrBelowPrice = 0;
                        
                        const sellOrders = (placementData.orderBook?.sell_orders || [])
                          .map((o: OrderBookOrder) => ({
                            price: parseFloat(o.price.amount) / 1000000,
                            remaining: (parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000,
                            value: ((parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000) * (parseFloat(o.price.amount) / 1000000)
                          }))
                          .sort((a: any, b: any) => a.price - b.price);
                        
                        for (const order of sellOrders) {
                          if (order.price < currentPrice) {
                            volumeAtOrBelowPrice += order.value;
                          }
                        }
                        
                        const maxEligible = Math.min(amount, Math.min(volumeAtOrBelowPrice, placementData.volumeCaps.sell));
                        
                        // Calculate price needed for full amount
                        let priceNeededForFullAmount = sellCutoffPrice;
                        let cumulativeVolume = 0;
                        const sortedSellOrders = [...sellOrders].sort((a: any, b: any) => a.price - b.price);
                        
                        for (let i = 0; i < sortedSellOrders.length; i++) {
                          cumulativeVolume += sortedSellOrders[i].value;
                          if (cumulativeVolume >= Math.min(amount, placementData.volumeCaps.sell)) {
                            priceNeededForFullAmount = sortedSellOrders[i].price + 0.000001;
                            break;
                          }
                        }
                        
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total cap:</span>
                              <span className="font-mono">${placementData.volumeCaps.sell.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Your amount:</span>
                              <span className="font-mono">${amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Your price:</span>
                              <span className="font-mono">${currentPrice.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Volume you'd displace:</span>
                              <span className="font-mono text-yellow-400">${volumeAtOrBelowPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Your max eligible:</span>
                              <span className="font-mono text-green-400">${maxEligible.toFixed(2)}</span>
                            </div>
                            
                            {/* Price recommendation */}
                            {amount > 0 && (
                              <div className="mt-2 p-2 bg-purple-900/30 border border-purple-500/30 rounded">
                                <p className="text-purple-400 font-medium mb-1">💎 Price needed for ${Math.min(amount, placementData.volumeCaps.sell).toFixed(2)}:</p>
                                <p className="font-mono text-lg text-white">${priceNeededForFullAmount.toFixed(6)}</p>
                                {amount > placementData.volumeCaps.sell && (
                                  <p className="text-xs text-yellow-400 mt-1">
                                    ⚠️ Cap is ${placementData.volumeCaps.sell.toFixed(2)}, so max possible is capped
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {currentPrice <= sellCutoffPrice && (
                              <div className="mt-2 p-2 bg-red-900/30 rounded">
                                <p className="text-red-400">❌ Price too low! Minimum: ${sellCutoffPrice.toFixed(6)}</p>
                              </div>
                            )}
                            {currentPrice > sellCutoffPrice && maxEligible < amount && (
                              <div className="mt-2 p-2 bg-yellow-900/30 rounded">
                                <p className="text-yellow-400">💡 Increase to ${priceNeededForFullAmount.toFixed(6)} for full amount</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* Order Book Position */}
                  {amount > 0 && price > 0 && (
                    <div className="mb-3 p-3 bg-gray-800/50 rounded">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">📍 Your Order Position in Book</h5>
                      {(() => {
                        const orders = orderType === 'buy' 
                          ? (placementData.orderBook?.buy_orders || [])
                              .map((o: OrderBookOrder) => ({
                                price: parseFloat(o.price.amount) / 1000000,
                                amount: (parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000,
                                value: ((parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000) * (parseFloat(o.price.amount) / 1000000)
                              }))
                              .filter((o: any) => o.amount > 0)
                              .sort((a: any, b: any) => b.price - a.price)
                          : (placementData.orderBook?.sell_orders || [])
                              .map((o: OrderBookOrder) => ({
                                price: parseFloat(o.price.amount) / 1000000,
                                amount: (parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000,
                                value: ((parseFloat(o.amount.amount) - parseFloat(o.filled_amount.amount)) / 1000000) * (parseFloat(o.price.amount) / 1000000)
                              }))
                              .filter((o: any) => o.amount > 0)
                              .sort((a: any, b: any) => a.price - b.price);
                        
                        // Find position
                        let ordersAbove = 0;
                        let ordersBelow = 0;
                        let volumeAbove = 0;
                        let volumeBelow = 0;
                        
                        for (const order of orders) {
                          if (orderType === 'buy') {
                            if (order.price > price) {
                              ordersAbove++;
                              volumeAbove += order.value;
                            } else if (order.price < price) {
                              ordersBelow++;
                              volumeBelow += order.value;
                            }
                          } else {
                            if (order.price < price) {
                              ordersAbove++;
                              volumeAbove += order.value;
                            } else if (order.price > price) {
                              ordersBelow++;
                              volumeBelow += order.value;
                            }
                          }
                        }
                        
                        // Show more orders for better context
                        const ordersToShow = 5;
                        
                        // Get all unique prices
                        const priceSet = new Set(orders.map((o: any) => o.price));
                        const uniquePrices = Array.from(priceSet).sort((a, b) => 
                          orderType === 'buy' ? b - a : a - b
                        );
                        
                        // Find where user's price would fit
                        let userPriceIndex = uniquePrices.findIndex(p => 
                          orderType === 'buy' ? p <= price : p >= price
                        );
                        if (userPriceIndex === -1) userPriceIndex = uniquePrices.length;
                        
                        // Get surrounding prices
                        const startIndex = Math.max(0, userPriceIndex - ordersToShow);
                        const endIndex = Math.min(uniquePrices.length, userPriceIndex + ordersToShow + 1);
                        const pricesToShow = uniquePrices.slice(startIndex, endIndex);
                        
                        // Group orders by price
                        const ordersByPrice = new Map();
                        orders.forEach((o: any) => {
                          if (!ordersByPrice.has(o.price)) {
                            ordersByPrice.set(o.price, { count: 0, totalAmount: 0, totalValue: 0 });
                          }
                          const group = ordersByPrice.get(o.price);
                          group.count += 1;
                          group.totalAmount += o.amount;
                          group.totalValue += o.value;
                        });
                        
                        return (
                          <div className="space-y-2">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div className="bg-gray-700/50 rounded p-2">
                                <p className="text-gray-400">Orders above:</p>
                                <p className="font-mono">{ordersAbove} orders (${volumeAbove.toFixed(2)})</p>
                              </div>
                              <div className="bg-gray-700/50 rounded p-2">
                                <p className="text-gray-400">Orders below:</p>
                                <p className="font-mono">{ordersBelow} orders (${volumeBelow.toFixed(2)})</p>
                              </div>
                            </div>
                            
                            {/* Price level visualization */}
                            <div className="bg-gray-900/50 rounded p-2 mb-2">
                              <div className="text-xs text-gray-400 mb-2">Price Levels & Order Distribution:</div>
                              <div className="space-y-1 text-xs font-mono">
                                {/* Header */}
                                <div className="flex justify-between text-gray-500 border-b border-gray-700 pb-1">
                                  <span className="w-24">Price</span>
                                  <span className="w-16 text-center">Orders</span>
                                  <span className="w-20 text-right">Total MC</span>
                                  <span className="w-20 text-right">Value</span>
                                  <span className="w-16 text-center">Status</span>
                                </div>
                                
                                {(() => {
                                  // Calculate cumulative volume for eligibility
                                  let cumulativeVolume = 0;
                                  const volumeByPrice = new Map();
                                  const eligiblePrices = new Set();
                                  
                                  // Calculate which prices are eligible
                                  const sortedOrders = orderType === 'buy' 
                                    ? [...orders].sort((a: any, b: any) => b.price - a.price)
                                    : [...orders].sort((a: any, b: any) => a.price - b.price);
                                  
                                  const volumeCap = orderType === 'buy' ? placementData.volumeCaps.buy : placementData.volumeCaps.sell;
                                  
                                  for (const order of sortedOrders) {
                                    if (cumulativeVolume < volumeCap) {
                                      eligiblePrices.add(order.price);
                                      const remaining = Math.min(order.value, volumeCap - cumulativeVolume);
                                      volumeByPrice.set(order.price, (volumeByPrice.get(order.price) || 0) + remaining);
                                      cumulativeVolume += order.value;
                                    }
                                  }
                                  
                                  const eligibilityCutoff = orderType === 'buy' ? buyCutoffPrice : sellCutoffPrice;
                                  let shownCutoffLine = false;
                                  
                                  return (
                                    <>
                                      {/* Show prices above */}
                                      {pricesToShow.map((priceLevel: number, i: number) => {
                                  const isUserPrice = (orderType === 'buy' && priceLevel <= price && (i === pricesToShow.length - 1 || pricesToShow[i + 1] > price)) ||
                                                     (orderType === 'sell' && priceLevel >= price && (i === pricesToShow.length - 1 || pricesToShow[i + 1] < price));
                                  const group = ordersByPrice.get(priceLevel);
                                  const isEligible = eligiblePrices.has(priceLevel);
                                  const eligibleVolume = volumeByPrice.get(priceLevel) || 0;
                                  
                                  // Check if we should show cutoff line
                                  const shouldShowCutoff = !shownCutoffLine && (
                                    (orderType === 'buy' && i > 0 && pricesToShow[i-1] >= eligibilityCutoff && priceLevel < eligibilityCutoff) ||
                                    (orderType === 'sell' && i > 0 && pricesToShow[i-1] <= eligibilityCutoff && priceLevel > eligibilityCutoff)
                                  );
                                  
                                  if (shouldShowCutoff) shownCutoffLine = true;
                                  
                                  return (
                                    <React.Fragment key={priceLevel}>
                                      {/* Eligibility cutoff line */}
                                      {shouldShowCutoff && (
                                        <div className="relative my-2">
                                          <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-red-500/50"></div>
                                          </div>
                                          <div className="relative flex justify-center">
                                            <span className="bg-gray-900 px-2 text-xs text-red-400">
                                              ← Eligibility Cutoff (${eligibilityCutoff.toFixed(6)}) →
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Existing orders at this price */}
                                      {group && (
                                        <div className={`flex justify-between p-1 rounded hover:bg-gray-700/50 transition-colors ${
                                          isEligible ? 'bg-green-900/20' : 'bg-gray-700/30'
                                        }`}>
                                          <span className="w-24">${priceLevel.toFixed(6)}</span>
                                          <span className="w-16 text-center text-gray-400">{group.count}</span>
                                          <span className="w-20 text-right text-gray-400">{group.totalAmount.toFixed(2)}</span>
                                          <span className="w-20 text-right text-gray-500">${group.totalValue.toFixed(2)}</span>
                                          <span className="w-16 text-center">
                                            {isEligible ? (
                                              <span className="text-green-400 text-xs">
                                                ✓ ${eligibleVolume.toFixed(2)}
                                              </span>
                                            ) : (
                                              <span className="text-gray-500">-</span>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {/* Insert user's order in the right position */}
                                      {isUserPrice && (
                                        <div className="relative">
                                          <div className="absolute inset-x-0 top-1/2 border-t border-purple-500/50"></div>
                                          <div className="relative flex justify-between p-2 bg-purple-900/50 border border-purple-500/50 rounded my-1">
                                            <span className="w-24 text-purple-400 font-bold">→ ${price.toFixed(6)}</span>
                                            <span className="w-16 text-center text-purple-400">NEW</span>
                                            <span className="w-20 text-right text-purple-400">{(amount / price).toFixed(2)}</span>
                                            <span className="w-20 text-right text-purple-400 font-bold">${amount.toFixed(2)}</span>
                                            <span className="w-16 text-center">
                                              {(() => {
                                                const wouldBeEligible = (orderType === 'buy' && price >= eligibilityCutoff) || 
                                                                       (orderType === 'sell' && price <= eligibilityCutoff);
                                                const availableSpace = volumeCap - cumulativeVolume;
                                                const userEligible = wouldBeEligible ? Math.min(amount, Math.max(0, availableSpace)) : 0;
                                                
                                                if (userEligible === 0) {
                                                  return <span className="text-red-400 text-xs">✗ None</span>;
                                                } else if (userEligible < amount) {
                                                  return <span className="text-yellow-400 text-xs">⚠ ${userEligible.toFixed(2)}</span>;
                                                } else {
                                                  return <span className="text-green-400 text-xs">✓ ${userEligible.toFixed(2)}</span>;
                                                }
                                              })()}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                                
                                {/* If user price is beyond all shown prices */}
                                {((orderType === 'buy' && price > Math.max(...pricesToShow, 0)) ||
                                  (orderType === 'sell' && price < Math.min(...pricesToShow, Infinity))) && (
                                  <div className="relative">
                                    <div className="text-center text-gray-500 my-1">...</div>
                                    <div className="relative flex justify-between p-2 bg-purple-900/50 border border-purple-500/50 rounded">
                                      <span className="w-24 text-purple-400 font-bold">→ ${price.toFixed(6)}</span>
                                      <span className="w-16 text-center text-purple-400">NEW</span>
                                      <span className="w-20 text-right text-purple-400">{(amount / price).toFixed(2)}</span>
                                      <span className="w-20 text-right text-purple-400 font-bold">${amount.toFixed(2)}</span>
                                      <span className="w-16 text-center">
                                        {(() => {
                                          const wouldBeEligible = (orderType === 'buy' && price >= eligibilityCutoff) || 
                                                                 (orderType === 'sell' && price <= eligibilityCutoff);
                                          const availableSpace = volumeCap - cumulativeVolume;
                                          const userEligible = wouldBeEligible ? Math.min(amount, Math.max(0, availableSpace)) : 0;
                                          
                                          if (userEligible === 0) {
                                            return <span className="text-red-400 text-xs">✗ None</span>;
                                          } else if (userEligible < amount) {
                                            return <span className="text-yellow-400 text-xs">⚠ ${userEligible.toFixed(2)}</span>;
                                          } else {
                                            return <span className="text-green-400 text-xs">✓ ${userEligible.toFixed(2)}</span>;
                                          }
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            
                            {/* Legend */}
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-400">Earning rewards</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-400">⚠</span>
                                <span className="text-gray-400">Partially eligible</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-red-400">✗</span>
                                <span className="text-gray-400">No rewards</span>
                              </div>
                            </div>
                            
                            {/* Position indicator */}
                            <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs">
                              <p className="text-blue-400">
                                {orderType === 'buy' ? (
                                  <>Position #{ordersAbove + 1} in buy queue (higher price = better priority)</>
                                ) : (
                                  <>Position #{ordersAbove + 1} in sell queue (lower price = better priority)</>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Price Suggestions */}
                  <div className="space-y-2 mb-3">
                    <h5 className="text-sm font-medium text-gray-300">📊 Suggested Prices:</h5>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        onClick={() => setUserPrice(suggestedPrices.minimum.toFixed(6))}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition-colors"
                      >
                        <div className="font-medium">Minimum</div>
                        <div className="text-gray-400">${suggestedPrices.minimum.toFixed(6)}</div>
                        <div className="text-xs text-gray-500">Just qualifies</div>
                      </button>
                      <button
                        onClick={() => setUserPrice(suggestedPrices.optimal.toFixed(6))}
                        className="p-2 bg-blue-900/30 hover:bg-blue-900/50 rounded border border-blue-500/30 transition-colors"
                      >
                        <div className="font-medium text-blue-400">Market Price</div>
                        <div className="text-gray-400">${suggestedPrices.optimal.toFixed(6)}</div>
                        <div className="text-xs text-gray-500">Recommended</div>
                      </button>
                      <button
                        onClick={() => setUserPrice(suggestedPrices.aggressive.toFixed(6))}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition-colors"
                      >
                        <div className="font-medium">Aggressive</div>
                        <div className="text-gray-400">${suggestedPrices.aggressive.toFixed(6)}</div>
                        <div className="text-xs text-gray-500">Higher priority</div>
                      </button>
                    </div>
                  </div>
                  
                  {/* Detailed explanation */}
                  {!willEarnRewards && (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
                      <p className="text-yellow-400 font-medium mb-1">Why this price won't earn rewards:</p>
                      {orderType === 'buy' ? (
                        <p>Buy orders must bid at least ${buyCutoffPrice.toFixed(6)} because the volume cap is full. Only the highest bids earn rewards.</p>
                      ) : (
                        <p>Sell orders must ask at least ${sellCutoffPrice.toFixed(6)} because the volume cap is full. Only the highest asks earn rewards.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Placement Analysis */}
            <div className="bg-gray-800/50 rounded p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">📍 Order Placement Analysis</h4>
              
              <div className="space-y-3">
                {orderType === 'buy' ? (
                  <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
                    <h5 className="text-green-400 font-medium mb-2">Buy Order Details</h5>
                    {(() => {
                      const remainingBuyCap = placementData.volumeCaps.buy - placementData.rewardedVolume.buy;
                      const canFitInBuyCap = amount <= remainingBuyCap;
                      const orderPrice = parseFloat(userPrice) || placementData.mcPrice;
                      const willGetRewards = remainingBuyCap > 0 || orderPrice >= buyCutoffPrice;
                      
                      if (canFitInBuyCap && willGetRewards) {
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="p-2 bg-green-900/30 rounded">
                              <span className="text-green-400">✅ Full order will earn rewards</span>
                            </div>
                            <p className="text-gray-300">
                              Cap has ${remainingBuyCap.toFixed(2)} space available
                            </p>
                            {remainingBuyCap < amount * 2 && (
                              <p className="text-yellow-400">
                                ⚠️ Cap is {((placementData.rewardedVolume.buy / placementData.volumeCaps.buy) * 100).toFixed(0)}% full - place order soon
                              </p>
                            )}
                          </div>
                        );
                      } else if (!willGetRewards) {
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="p-2 bg-red-900/30 rounded">
                              <span className="text-red-400">❌ Price too low - no rewards</span>
                            </div>
                            <p className="text-gray-300">
                              Increase price to at least ${buyCutoffPrice.toFixed(6)}
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="p-2 bg-yellow-900/30 rounded">
                              <span className="text-yellow-400">⚠️ Partially eligible</span>
                            </div>
                            <p className="text-gray-300">
                              Only ${remainingBuyCap.toFixed(2)} will earn rewards
                            </p>
                            <div className="mt-2 p-2 bg-orange-900/30 rounded">
                              <p className="text-orange-400 font-medium">💡 Recommendation:</p>
                              <p className="text-xs">Split into smaller orders or wait for cap reset</p>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                    <h5 className="text-red-400 font-medium mb-2">Sell Order Details</h5>
                    {(() => {
                      const remainingSellCap = placementData.volumeCaps.sell - placementData.rewardedVolume.sell;
                      const canFitInSellCap = amount <= remainingSellCap;
                      const orderPrice = parseFloat(userPrice) || placementData.mcPrice;
                      const willGetRewards = remainingSellCap > 0 || orderPrice >= sellCutoffPrice;
                      
                      if (canFitInSellCap && willGetRewards) {
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="p-2 bg-green-900/30 rounded">
                              <span className="text-green-400">✅ Full order will earn rewards</span>
                            </div>
                            <p className="text-gray-300">
                              Cap has ${remainingSellCap.toFixed(2)} space available
                            </p>
                            {remainingSellCap < amount * 2 && (
                              <p className="text-yellow-400">
                                ⚠️ Cap is {((placementData.rewardedVolume.sell / placementData.volumeCaps.sell) * 100).toFixed(0)}% full - place order soon
                              </p>
                            )}
                          </div>
                        );
                      } else if (!willGetRewards) {
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="p-2 bg-red-900/30 rounded">
                              <span className="text-red-400">❌ Price too low - no rewards</span>
                            </div>
                            <p className="text-gray-300">
                              Increase price to at least ${sellCutoffPrice.toFixed(6)}
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="p-2 bg-yellow-900/30 rounded">
                              <span className="text-yellow-400">⚠️ Partially eligible</span>
                            </div>
                            <p className="text-gray-300">
                              Only ${remainingSellCap.toFixed(2)} will earn rewards
                            </p>
                            <div className="mt-2 p-2 bg-orange-900/30 rounded">
                              <p className="text-orange-400 font-medium">💡 Recommendation:</p>
                              <p className="text-xs">Split into smaller orders or wait for cap reset</p>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Reward Estimates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded p-3">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Expected LC Rewards</h4>
                {amount < minimumOrder ? (
                  <div className="p-2 bg-red-900/30 rounded">
                    <span className="text-red-400">❌ Order too small - will earn 0 LC</span>
                    <p className="text-xs mt-1">Minimum: ${minimumOrder.toFixed(2)}</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Per hour:</span>
                      <span className="font-mono text-green-400">{hourlyReward.toFixed(6)} LC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Per day:</span>
                      <span className="font-mono text-green-400">{(estimatedReward).toFixed(6)} LC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Per year:</span>
                      <span className="font-mono text-green-400">{(estimatedReward * 365).toFixed(6)} LC</span>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-900/30 rounded">
                      <p className="text-yellow-400 text-xs">
                        ⚠️ Actual rewards depend on cap availability
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-800/50 rounded p-3">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Order Details</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Order size:</span>
                    <span>${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MC amount:</span>
                    <span>{(amount / placementData.mcPrice).toFixed(2)} MC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current APR:</span>
                    <span className="text-purple-400">{placementData.currentAPR.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-gray-400">Minimum order for rewards:</p>
                    <p className="font-mono">${minimumOrder.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tier-Based Volume Caps */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h3 className="font-semibold mb-3">📊 Current Tier {placementData.tier} Volume Caps</h3>
        <div className="space-y-3">
          {/* Market Value Calculation */}
          <div className="bg-gray-800/50 rounded p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">MC Market Value Calculation</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">MC Supply:</span>
                <span className="font-mono">{placementData.mcSupply.toFixed(2)} MC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MC Price:</span>
                <span className="font-mono">${placementData.mcPrice.toFixed(6)}</span>
              </div>
              <div className="border-t border-gray-600 pt-1 mt-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total MC Market Value:</span>
                  <span className="font-mono text-white">${(placementData.mcSupply * placementData.mcPrice).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tier Percentages */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <h4 className="text-sm font-medium text-blue-400 mb-2">Tier {placementData.tier} Percentages</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Buy side percentage:</span>
                <span className="font-mono">{(placementData.volumeCaps.buy / (placementData.mcSupply * placementData.mcPrice) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sell side percentage:</span>
                <span className="font-mono">{(placementData.volumeCaps.sell / (placementData.mcSupply * placementData.mcPrice) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          {/* Resulting Caps */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
              <p className="text-green-400 font-medium mb-1">Buy Side Cap</p>
              <p className="text-2xl font-bold">${placementData.volumeCaps.buy.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Max buy volume eligible for rewards
              </p>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
              <p className="text-red-400 font-medium mb-1">Sell Side Cap</p>
              <p className="text-2xl font-bold">${placementData.volumeCaps.sell.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Max sell volume eligible for rewards
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
            <p className="text-yellow-400">
              ⚠️ <strong>Note:</strong> Small caps are due to low MC price. As MC price increases, caps will grow proportionally. 
              With current MC price of ${placementData.mcPrice.toFixed(6)}, the total market value is only ${(placementData.mcSupply * placementData.mcPrice).toFixed(2)}.
            </p>
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