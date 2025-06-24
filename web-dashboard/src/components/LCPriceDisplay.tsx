import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface LCPriceInfo {
  currentPrice: number;
  marketPrice: number | null;
  priceInUSD: number;
  lastUpdate: string;
  has24HourData: boolean;
  lowestPrice24H: number | null;
}

export const LCPriceDisplay: React.FC = () => {
  const [priceInfo, setPriceInfo] = useState<LCPriceInfo>({
    currentPrice: 0.0001, // Initial price: 0.0001 MC per LC
    marketPrice: null,
    priceInUSD: 0.000001, // 0.0001 MC * $0.0001 per MC
    lastUpdate: new Date().toLocaleString(),
    has24HourData: false,
    lowestPrice24H: null
  });
  const [mcPrice, setMcPrice] = useState<number>(0.0001);

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        // Get MC price in USD
        const mcPriceRes = await fetchAPI('/mychain/maincoin/v1/current_price');
        const mcPriceUSD = mcPriceRes?.current_price ? parseFloat(mcPriceRes.current_price) / 1000000 : 0.0001;
        setMcPrice(mcPriceUSD);

        // Get MC/LC order book (pair 2)
        const orderBookRes = await fetchAPI('/mychain/dex/v1/order_book/2');
        
        // Calculate market price from order book
        let marketPrice = null;
        let bestBid = 0;
        let bestAsk = 0;
        
        if (orderBookRes.buy_orders && orderBookRes.buy_orders.length > 0) {
          bestBid = parseFloat(orderBookRes.buy_orders[0].price.amount) / 1000000;
        }
        
        if (orderBookRes.sell_orders && orderBookRes.sell_orders.length > 0) {
          bestAsk = parseFloat(orderBookRes.sell_orders[0].price.amount) / 1000000;
        }
        
        if (bestBid > 0 && bestAsk > 0) {
          marketPrice = (bestBid + bestAsk) / 2;
        } else if (bestBid > 0) {
          marketPrice = bestBid;
        } else if (bestAsk > 0) {
          marketPrice = bestAsk;
        }
        
        // LC reference price logic:
        // MAX(0.0001, market_price, lowest_24h_price)
        // Since we don't have 24h data yet, use initial price
        const referencePrice = marketPrice ? Math.max(0.0001, marketPrice) : 0.0001;
        
        setPriceInfo({
          currentPrice: referencePrice,
          marketPrice: marketPrice,
          priceInUSD: referencePrice * mcPriceUSD,
          lastUpdate: new Date().toLocaleString(),
          has24HourData: false,
          lowestPrice24H: null
        });
      } catch (error) {
        console.error('Error fetching LC price data:', error);
      }
    };

    fetchPriceData();
    const interval = setInterval(fetchPriceData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>💰 LC (LiquidityCoin) Price</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Reference Price */}
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-sm text-green-400 mb-2">Reference Price</h3>
          <p className="text-2xl font-bold text-green-300">{priceInfo.currentPrice.toFixed(6)} MC</p>
          <p className="text-sm text-gray-400 mt-1">${priceInfo.priceInUSD.toFixed(8)} USD</p>
          <p className="text-xs text-gray-500 mt-2">Never decreases</p>
        </div>

        {/* Market Price */}
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm text-blue-400 mb-2">Market Price</h3>
          {priceInfo.marketPrice ? (
            <>
              <p className="text-2xl font-bold text-blue-300">{priceInfo.marketPrice.toFixed(6)} MC</p>
              <p className="text-sm text-gray-400 mt-1">${(priceInfo.marketPrice * mcPrice).toFixed(8)} USD</p>
              <p className="text-xs text-gray-500 mt-2">From order book</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-500">No Market</p>
              <p className="text-sm text-gray-400 mt-1">Place MC/LC orders</p>
            </>
          )}
        </div>

        {/* Price Rules */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-sm text-purple-400 mb-2">Price Rules</h3>
          <div className="text-xs space-y-1 text-gray-300">
            <p>• Initial: 0.0001 MC per LC</p>
            <p>• Can only increase</p>
            <p>• 72-hour rule applies</p>
            <p>• Based on lowest in 24h</p>
          </div>
        </div>
      </div>

      {/* LC Rewards Value Calculator */}
      <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
        <h3 className="font-semibold mb-3">💎 Your LC Rewards Value</h3>
        <p className="text-sm text-gray-400 mb-3">All DEX liquidity rewards (MC/TUSD & MC/LC) are paid in LC tokens</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-2">Reward Examples at Current Price:</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>1 LC reward:</span>
                <span className="font-mono text-green-400">${priceInfo.priceInUSD.toFixed(8)}</span>
              </div>
              <div className="flex justify-between">
                <span>100 LC reward:</span>
                <span className="font-mono text-green-400">${(priceInfo.priceInUSD * 100).toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span>1,000 LC reward:</span>
                <span className="font-mono text-green-400">${(priceInfo.priceInUSD * 1000).toFixed(4)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-gray-400 mb-2">Annual Earnings Potential:</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>$100 @ 100% APR:</span>
                <span className="font-mono text-blue-400">{(100 / priceInfo.priceInUSD).toFixed(2)} LC/year</span>
              </div>
              <div className="flex justify-between">
                <span>$1,000 @ 100% APR:</span>
                <span className="font-mono text-blue-400">{(1000 / priceInfo.priceInUSD).toFixed(2)} LC/year</span>
              </div>
              <div className="flex justify-between">
                <span>$10,000 @ 100% APR:</span>
                <span className="font-mono text-blue-400">{(10000 / priceInfo.priceInUSD).toFixed(2)} LC/year</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Appreciation Info */}
      <div className="mt-4 bg-gradient-to-r from-yellow-900/20 to-green-900/20 border border-green-500/30 rounded-lg p-4">
        <h4 className="font-medium text-green-400 mb-2">💎 Dual Appreciation Strategy</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>MC Price:</strong> DEX rewards incentivize higher MC prices, pushing value up</li>
          <li>• <strong>LC Price:</strong> Starts at 0.0001 MC, can only increase over time</li>
          <li>• <strong>Combined Effect:</strong> As MC price rises, your LC rewards gain double value</li>
          <li>• <strong>Example:</strong> If MC goes 10x and LC goes 2x = 20x value gain</li>
          <li>• <strong>Strategy:</strong> Support MC price appreciation to maximize reward value</li>
        </ul>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Last updated: {priceInfo.lastUpdate}
      </div>
    </div>
  );
};