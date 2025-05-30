import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
}

export const DEXPage: React.FC = () => {
  const [orderBook, setOrderBook] = useState<{buy: OrderBookEntry[], sell: OrderBookEntry[]} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDEXData = async () => {
      try {
        // Fetch DEX order book data
        const orderBookResponse = await fetchAPI('/mychain/dex/v1/order_book');
        setOrderBook(orderBookResponse);
      } catch (error) {
        console.error('Error fetching DEX data:', error);
        // Use mock data for now
        setOrderBook({
          buy: [
            { price: '0.000095', amount: '1000.00', total: '0.095' },
            { price: '0.000090', amount: '2000.00', total: '0.180' },
            { price: '0.000085', amount: '1500.00', total: '0.127' }
          ],
          sell: [
            { price: '0.000105', amount: '1200.00', total: '0.126' },
            { price: '0.000110', amount: '1800.00', total: '0.198' },
            { price: '0.000115', amount: '900.00', total: '0.103' }
          ]
        });
      }
      setLoading(false);
    };

    fetchDEXData();
    const interval = setInterval(fetchDEXData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">DEX</h1>
        <span className="text-sm text-gray-400">Decentralized Exchange</span>
      </div>
      
      <div className="grid gap-6">
        {/* Trading Pair Selection */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Trading Pairs</h2>
          <div className="flex flex-wrap gap-2">
            <button className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 text-sm font-semibold">
              MC/TestUSD
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 text-sm">
              MC/LC
            </button>
          </div>
        </div>

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Form */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Place Order</h2>
            
            <div className="space-y-4">
              {/* Order Type */}
              <div className="flex rounded-lg bg-gray-700 p-1">
                <button className="flex-1 bg-green-600 rounded text-sm py-2 font-semibold">
                  Buy
                </button>
                <button className="flex-1 text-sm py-2">
                  Sell
                </button>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Price (TestUSD)</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 rounded px-3 py-2" 
                  placeholder="0.000100"
                  step="0.000001"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (MC)</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 rounded px-3 py-2" 
                  placeholder="0.00"
                />
              </div>

              {/* Total */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Total (TestUSD)</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 rounded px-3 py-2" 
                  placeholder="0.00"
                  readOnly
                />
              </div>

              {/* Order Button */}
              <button className="w-full bg-green-600 hover:bg-green-700 rounded py-2 font-semibold">
                Place Buy Order
              </button>

              {/* Balance Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Available: 0.00 TestUSD</p>
                <p>Fee: 0.1%</p>
              </div>
            </div>
          </div>

          {/* Order Book */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Order Book</h2>
            
            <div className="space-y-4">
              {/* Sell Orders */}
              <div>
                <h3 className="text-sm font-semibold text-red-400 mb-2">Sell Orders</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 text-xs text-gray-400 mb-1">
                    <div>Price</div>
                    <div>Amount</div>
                    <div>Total</div>
                  </div>
                  {orderBook?.sell.map((order, index) => (
                    <div key={index} className="grid grid-cols-3 text-xs text-red-400 hover:bg-gray-700/50 rounded px-1 py-1">
                      <div>{order.price}</div>
                      <div>{order.amount}</div>
                      <div>{order.total}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Price */}
              <div className="text-center py-2 border-y border-gray-600">
                <div className="text-lg font-bold text-yellow-400">0.000100</div>
                <div className="text-xs text-gray-500">Last Price</div>
              </div>

              {/* Buy Orders */}
              <div>
                <h3 className="text-sm font-semibold text-green-400 mb-2">Buy Orders</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 text-xs text-gray-400 mb-1">
                    <div>Price</div>
                    <div>Amount</div>
                    <div>Total</div>
                  </div>
                  {orderBook?.buy.map((order, index) => (
                    <div key={index} className="grid grid-cols-3 text-xs text-green-400 hover:bg-gray-700/50 rounded px-1 py-1">
                      <div>{order.price}</div>
                      <div>{order.amount}</div>
                      <div>{order.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trade History */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
            
            <div className="space-y-1">
              <div className="grid grid-cols-3 text-xs text-gray-400 mb-2">
                <div>Price</div>
                <div>Amount</div>
                <div>Time</div>
              </div>
              
              {/* Mock trade data */}
              <div className="grid grid-cols-3 text-xs text-green-400 hover:bg-gray-700/50 rounded px-1 py-1">
                <div>0.000100</div>
                <div>500.00</div>
                <div>12:34:56</div>
              </div>
              <div className="grid grid-cols-3 text-xs text-red-400 hover:bg-gray-700/50 rounded px-1 py-1">
                <div>0.000099</div>
                <div>750.00</div>
                <div>12:33:21</div>
              </div>
              <div className="grid grid-cols-3 text-xs text-green-400 hover:bg-gray-700/50 rounded px-1 py-1">
                <div>0.000101</div>
                <div>300.00</div>
                <div>12:31:45</div>
              </div>
            </div>
          </div>
        </div>

        {/* My Orders */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">My Orders</h2>
          
          <div className="space-y-4">
            {/* Open Orders */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Open Orders</h3>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
                <p>No open orders</p>
                <p className="text-sm">Your active orders will appear here</p>
              </div>
            </div>

            {/* Order History */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Order History</h3>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
                <p>No order history</p>
                <p className="text-sm">Your completed orders will appear here</p>
              </div>
            </div>
          </div>
        </div>

        {/* DEX Info */}
        <div className="bg-gray-700/20 rounded-lg p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>• DEX allows peer-to-peer trading of all blockchain tokens</p>
            <p>• 0.1% trading fee collected by the protocol</p>
            <p>• Orders are matched automatically on-chain</p>
            <p>• Support for limit orders and market orders</p>
          </div>
        </div>
      </div>
    </div>
  );
};