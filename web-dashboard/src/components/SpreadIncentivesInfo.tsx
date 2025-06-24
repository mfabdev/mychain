import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface SpreadData {
  bestBid: number;
  bestAsk: number;
  spread: number;
  midPrice: number;
}

export const SpreadIncentivesInfo: React.FC = () => {
  const [spreadData, setSpreadData] = useState<SpreadData>({
    bestBid: 0,
    bestAsk: 0,
    spread: 0,
    midPrice: 0
  });
  const [mcPrice, setMcPrice] = useState<number>(0.0001);

  useEffect(() => {
    const fetchSpreadData = async () => {
      try {
        // Fetch MC/TUSD order book
        const orderBookRes = await fetchAPI('/mychain/dex/v1/order_book/1');
        
        let bestBid = 0;
        let bestAsk = Infinity;
        
        // Find best bid
        if (orderBookRes.buy_orders && orderBookRes.buy_orders.length > 0) {
          const topBuy = orderBookRes.buy_orders[0];
          bestBid = parseFloat(topBuy.price.amount) / 1000000;
        }
        
        // Find best ask
        if (orderBookRes.sell_orders && orderBookRes.sell_orders.length > 0) {
          const topSell = orderBookRes.sell_orders[0];
          bestAsk = parseFloat(topSell.price.amount) / 1000000;
        }
        
        // Calculate spread
        const spread = bestAsk !== Infinity && bestBid > 0 
          ? ((bestAsk - bestBid) / bestBid) * 100 
          : 0;
          
        const midPrice = bestBid > 0 && bestAsk !== Infinity 
          ? (bestBid + bestAsk) / 2 
          : mcPrice;
        
        setSpreadData({
          bestBid,
          bestAsk: bestAsk === Infinity ? 0 : bestAsk,
          spread,
          midPrice
        });
        
        // Get current MC price
        const priceRes = await fetchAPI('/mychain/maincoin/v1/current_price');
        if (priceRes?.current_price) {
          setMcPrice(parseFloat(priceRes.current_price) / 1000000);
        }
      } catch (error) {
        console.error('Error fetching spread data:', error);
      }
    };

    fetchSpreadData();
    const interval = setInterval(fetchSpreadData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🎯 Liquidity Rewards System</span>
        <span className="text-sm font-normal text-green-400">(Goal: Support MC Price Appreciation)</span>
      </h2>

      {/* Current Spread Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-2">Current Spread</h3>
          <p className="text-2xl font-bold text-yellow-300">
            {spreadData.spread.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {spreadData.spread < 0.5 ? 'Tight' : spreadData.spread < 2 ? 'Normal' : 'Wide'}
          </p>
        </div>
        
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-sm text-green-400 mb-2">Best Bid</h3>
          <p className="text-2xl font-bold text-green-300">
            ${spreadData.bestBid.toFixed(6)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Highest buy order</p>
        </div>
        
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
          <h3 className="text-sm text-red-400 mb-2">Best Ask</h3>
          <p className="text-2xl font-bold text-red-300">
            ${spreadData.bestAsk > 0 ? spreadData.bestAsk.toFixed(6) : 'None'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Lowest sell order</p>
        </div>
        
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm text-blue-400 mb-2">Mid Price</h3>
          <p className="text-2xl font-bold text-blue-300">
            ${spreadData.midPrice.toFixed(6)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Reference price</p>
        </div>
      </div>

      {/* Current Reward System */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-400 mb-3">📊 Current Liquidity Reward System</h3>
        <div className="space-y-4">
          <div className="bg-gray-700/30 rounded p-4">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Dynamic APR System (7-100%)</h4>
            <p className="text-sm text-gray-300 mb-3">
              All liquidity providers earn the same base APR, which adjusts every 6 hours based on total liquidity:
            </p>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <div>
                  <strong>Current APR:</strong> 100% (decreases by 0.25% every 6 hours when liquidity targets are met)
                  <p className="text-xs mt-1">Minimum: 7% APR when system is fully liquid</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <div>
                  <strong>Rate Adjustment:</strong> Automatic based on bid/ask liquidity vs MC market cap
                  <p className="text-xs mt-1">Both sides must meet targets for rate to decrease</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-gray-700/30 rounded p-4">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Tier-Based Volume Caps</h4>
            <p className="text-sm text-gray-300 mb-3">
              Tiers determine maximum eligible volume, not reward rates. All eligible orders earn the same APR:
            </p>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <div>
                  <strong className="text-green-300">Tier 1 (0-3% from market):</strong> Bid cap: 2%, Ask cap: 1% of MC market cap
                  <p className="text-xs mt-1">Most restrictive caps - encourages broad participation near market</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <div>
                  <strong className="text-yellow-300">Tier 2 (3-8% from market):</strong> Bid cap: 5%, Ask cap: 3% of MC market cap
                  <p className="text-xs mt-1">Higher caps for orders further from market</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <div>
                  <strong className="text-orange-300">Tier 3 (8-12% from market):</strong> Bid cap: 8%, Ask cap: 4% of MC market cap
                  <p className="text-xs mt-1">Even higher caps for backstop liquidity</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <div>
                  <strong className="text-red-300">Tier 4 (&gt;12% from market):</strong> Bid cap: 12%, Ask cap: 5% of MC market cap
                  <p className="text-xs mt-1">Highest caps for deep liquidity providers</p>
                </div>
              </li>
            </ul>
            <div className="mt-3 p-2 bg-green-900/20 border border-green-500/30 rounded">
              <p className="text-xs text-green-400">
                <strong>💎 Price Support Mechanism:</strong> All orders within volume caps earn the same rate (currently 100% APR). 
                Orders are sorted by highest price first to support MC price appreciation:
              </p>
              <ul className="text-xs mt-1 space-y-1">
                <li>• <span className="text-green-400">Buy orders:</span> Those paying MORE for MC get priority (supports price floor)</li>
                <li>• <span className="text-green-400">Sell orders:</span> Those asking MORE for MC get priority (pushes price ceiling up)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Current Bonus System - NOW ACTIVE! */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-400 mb-3">🎯 Spread Bonuses - NOW ACTIVE!</h3>
        <div className="text-sm text-gray-300">
          <p className="mb-3">
            <strong>🚀 NEW:</strong> Spread tightening bonuses are now live! Orders that improve market quality earn bonus multipliers on their rewards.
          </p>
          <div className="bg-green-800/30 rounded p-3 space-y-2">
            <p className="text-green-400">✅ <strong>Active Bonus System:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• Base reward rate: 100% APR (dynamic, adjusts every 6 hours)</li>
              <li>• <strong className="text-yellow-400">Buy order bonuses:</strong> 1.1x to 2.0x for tightening spread (min 5% improvement)</li>
              <li>• <strong className="text-yellow-400">Sell order bonuses:</strong> 1.1x to 1.5x for prices above average ask</li>
              <li>• First order at each bonus tier gets the multiplier</li>
              <li>• Bonuses apply immediately when order is placed</li>
            </ul>
          </div>
          <div className="bg-blue-800/30 rounded p-3 space-y-2 mt-3">
            <p className="text-blue-400">📈 <strong>How it works:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• Place an order that qualifies for a bonus</li>
              <li>• Your effective APR = Base APR × Multiplier</li>
              <li>• Example: 100% base × 2.0x multiplier = 200% APR</li>
              <li>• Rewards are calculated and paid hourly</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Detailed Bonus Structure */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-purple-400 mb-3">💎 Bonus Multiplier Details</h3>
        <div className="text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded p-3">
              <h4 className="font-medium mb-2 text-green-400">Buy Order Bonuses (Tighten Spread):</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between items-center">
                  <span>• Reduce spread by 75%+</span>
                  <span className="text-yellow-400 font-bold">2.0x</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>• Reduce spread by 50-74%</span>
                  <span className="text-yellow-400 font-bold">1.5x</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>• Reduce spread by 25-49%</span>
                  <span className="text-yellow-400 font-bold">1.3x</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>• Reduce spread by 5-24%</span>
                  <span className="text-yellow-400 font-bold">1.1x</span>
                </li>
                <li className="text-gray-500 italic">
                  • Less than 5% improvement = No bonus
                </li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded p-3">
              <h4 className="font-medium mb-2 text-red-400">Sell Order Bonuses (Push Price Up):</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between items-center">
                  <span>• Price 10%+ above avg ask</span>
                  <span className="text-yellow-400 font-bold">1.5x</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>• Price 5-9% above avg ask</span>
                  <span className="text-yellow-400 font-bold">1.3x</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>• Price 2-4% above avg ask</span>
                  <span className="text-yellow-400 font-bold">1.2x</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>• Any price above avg ask</span>
                  <span className="text-yellow-400 font-bold">1.1x</span>
                </li>
                <li className="text-gray-500 italic">
                  • At or below average = No bonus
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
            <p className="text-xs text-yellow-400">
              <strong>⚡ Important:</strong> Only the first order at each bonus tier receives the multiplier. Once claimed, subsequent orders at that tier earn the base rate until market conditions change.
            </p>
          </div>
        </div>
      </div>

      {/* Current Reward Examples */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-purple-400 mb-3">🧮 Real Reward Examples (With Active Bonuses)</h3>
        <div className="space-y-4">
          <div className="bg-gray-700/30 rounded p-3">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Example 1: Spread Tightening Bonus</h4>
            <div className="text-sm">
              <p className="text-gray-300 mb-2">Current spread: 800% (Bid: $0.0001, Ask: $0.0009)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 mb-1">New Buy Order:</p>
                  <p className="font-mono">Buy $10,000 @ $0.0005</p>
                  <p className="text-xs text-gray-500">New spread: 80% (90% reduction!)</p>
                  <p className="text-xs text-green-400 font-bold mt-1">Bonus: 2.0x multiplier</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Annual Rewards:</p>
                  <p className="font-mono text-yellow-300">Base: $10,000 × 100% = $10,000</p>
                  <p className="font-mono text-green-300 font-bold">With 2x: $10,000 × 200% = $20,000/year</p>
                  <p className="text-xs text-blue-400 mt-1">Double rewards for improving spread!</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700/30 rounded p-3">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Example 2: Price Support Bonus</h4>
            <div className="text-sm">
              <p className="text-gray-300 mb-2">Average ask price: $0.0002</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 mb-1">New Sell Order:</p>
                  <p className="font-mono">Sell $5,000 @ $0.00022</p>
                  <p className="text-xs text-gray-500">10% above average ask</p>
                  <p className="text-xs text-green-400 font-bold mt-1">Bonus: 1.5x multiplier</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Annual Rewards:</p>
                  <p className="font-mono text-yellow-300">Base: $5,000 × 100% = $5,000</p>
                  <p className="font-mono text-green-300 font-bold">With 1.5x: $5,000 × 150% = $7,500/year</p>
                  <p className="text-xs text-blue-400 mt-1">50% more for supporting price!</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700/30 rounded p-3">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Example 3: First-Come-First-Served</h4>
            <div className="text-sm">
              <p className="text-gray-300 mb-2">Multiple orders trying for same bonus:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <div>
                    <p className="font-mono">Order A: Buy $10,000 @ $0.0002 (placed at 10:00)</p>
                    <p className="text-xs text-green-400">Gets 1.3x multiplier for 25% spread reduction</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">❌</span>
                  <div>
                    <p className="font-mono">Order B: Buy $15,000 @ $0.00021 (placed at 10:05)</p>
                    <p className="text-xs text-gray-400">No bonus - multiplier already claimed at this tier</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <div>
                    <p className="font-mono">Order C: Buy $20,000 @ $0.0005 (placed at 10:10)</p>
                    <p className="text-xs text-green-400">Gets 2.0x multiplier - different tier (75% reduction)</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-yellow-400 mt-2">💡 Each tier's bonus can only be claimed once until market conditions change</p>
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-400 bg-gray-700/30 rounded p-3">
          <p className="font-medium text-yellow-400 mb-1">📌 Key Understanding:</p>
          <ul className="space-y-1">
            <li>• <strong>Base APR for all eligible orders:</strong> 100% (adjusts every 6 hours)</li>
            <li>• <strong>Spread bonuses multiply your rewards:</strong> 1.1x to 2.0x multipliers</li>
            <li>• <strong>First-come-first-served:</strong> Each bonus tier can only be claimed once</li>
            <li>• <strong>Volume caps still apply:</strong> Orders must be within tier limits to earn</li>
            <li>• System rewards both spread tightening AND price support</li>
          </ul>
        </div>
      </div>

      {/* Current Strategy Guide */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h3 className="font-semibold mb-3">📈 Optimal Strategy (With Bonuses)</h3>
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="text-blue-400 font-medium mb-2">To Maximize Your Rewards:</h4>
            <ol className="text-gray-300 space-y-2 list-decimal list-inside">
              <li><strong className="text-yellow-400">Target spread bonuses early</strong> - Be first to claim multipliers (up to 2x rewards!)</li>
              <li><strong>Buy orders:</strong> Improve spread by at least 5% for 1.1x, aim for 75%+ for 2.0x</li>
              <li><strong>Sell orders:</strong> Price above average ask for 1.1x to 1.5x multipliers</li>
              <li><strong>Monitor claimed bonuses</strong> - Once claimed, that tier's bonus is unavailable</li>
              <li><strong>Volume caps still apply</strong> - Stay within tier limits to earn rewards</li>
              <li><strong>Support MC appreciation</strong> - Higher MC prices always get priority</li>
            </ol>
          </div>
          
          <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
            <h4 className="text-green-400 font-medium mb-2">🚀 Pro Tips:</h4>
            <ul className="text-gray-300 space-y-1 text-xs">
              <li>• Wide spreads = huge bonus opportunities (up to 2x for major improvements)</li>
              <li>• First mover advantage: Early orders capture the best multipliers</li>
              <li>• Combine strategies: Tighten spread AND support price for maximum impact</li>
              <li>• Watch for market changes: Bonuses reset when conditions shift significantly</li>
            </ul>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <p className="text-blue-400">
              <strong>💎 Maximum Returns:</strong> With base 100% APR and up to 2x multipliers, you can earn 200% APR by being first to significantly tighten the spread. Every 6 hours the base rate adjusts, creating new bonus opportunities!
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-4 bg-gray-700/30 border border-gray-600 rounded-lg p-4">
        <h4 className="font-medium text-gray-300 mb-2">📊 Current System Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Base APR</p>
            <p className="font-mono text-yellow-400">100%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Max w/ Bonus</p>
            <p className="font-mono text-green-400">200%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Bonuses</p>
            <p className="font-mono text-green-400">✅ Active</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Next Adjustment</p>
            <p className="font-mono text-gray-300">~6 hours</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p><strong>Dynamic Range:</strong> Base APR adjusts between 7-100% every 6 hours based on liquidity</p>
          <p><strong>Spread Bonuses:</strong> Multiply base APR by 1.1x to 2.0x for market improvements</p>
        </div>
      </div>
    </div>
  );
};