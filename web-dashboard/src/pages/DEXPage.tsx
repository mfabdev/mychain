import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { useKeplr } from '../hooks/useKeplr';

interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
}

export const DEXPage: React.FC = () => {
  const { address, balance, isConnected } = useKeplr();
  const [orderBook, setOrderBook] = useState<{buy: OrderBookEntry[], sell: OrderBookEntry[]} | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState<string>('1'); // Default to pair ID 1 (MC/TestUSD)
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [generatedCommand, setGeneratedCommand] = useState<string>('');

  useEffect(() => {
    const fetchDEXData = async () => {
      try {
        // Fetch DEX order book data for selected pair
        const orderBookResponse = await fetchAPI(`/mychain/dex/v1/order_book/${selectedPair}`);
        
        // Parse the actual order book format
        const buyOrders = orderBookResponse.buy_orders || [];
        const sellOrders = orderBookResponse.sell_orders || [];
        
        // Transform orders into display format
        const transformOrder = (order: any) => {
          const priceValue = parseFloat(order.price?.amount || '0') / 1000000;
          const amountValue = parseFloat(order.amount?.amount || '0') / 1000000;
          const totalValue = priceValue * amountValue;
          
          return {
            price: priceValue.toFixed(6),
            amount: amountValue.toFixed(2),
            total: totalValue.toFixed(6)
          };
        };
        
        setOrderBook({
          buy: buyOrders.map(transformOrder),
          sell: sellOrders.map(transformOrder)
        });
      } catch (error) {
        console.error('Error fetching DEX data:', error);
        // Empty order book on error
        setOrderBook({
          buy: [],
          sell: []
        });
      }
      setLoading(false);
    };

    fetchDEXData();
    const interval = setInterval(fetchDEXData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [selectedPair]);

  // Calculate total when price or amount changes
  useEffect(() => {
    if (price && amount) {
      const totalValue = parseFloat(price) * parseFloat(amount);
      setTotal(totalValue.toFixed(6));
    } else {
      setTotal('');
    }
  }, [price, amount]);

  const handlePlaceOrder = async () => {
    if (!price || !amount) {
      alert('Please enter price and amount');
      return;
    }

    setIsPlacingOrder(true);
    setOrderStatus('');
    setGeneratedCommand('');

    try {
      const response = await fetch('http://localhost:3003/execute-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: orderType === 'buy' ? 'dex-buy' : 'dex-sell',
          pairId: selectedPair,
          price: price,
          orderAmount: amount,
          from: 'admin'
        })
      });

      const result = await response.json();
      
      if (result.cliCommand) {
        setGeneratedCommand(result.cliCommand);
        setOrderStatus('⚠️ ' + result.message);
      } else if (result.success) {
        setOrderStatus('✅ Order placed successfully!');
        setPrice('');
        setAmount('');
        // Refresh order book
        setTimeout(() => {
          setSelectedPair(selectedPair); // Trigger refresh
        }, 2000);
      } else {
        setOrderStatus('❌ ' + (result.error || 'Failed to place order'));
      }
    } catch (error) {
      console.error('Order placement error:', error);
      setOrderStatus('❌ Error placing order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCommand);
      alert('Command copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
            <button 
              className={selectedPair === '1' ? "bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 text-sm font-semibold" : "bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 text-sm"}
              onClick={() => setSelectedPair('1')}
            >
              MC/TestUSD
            </button>
            <button 
              className={selectedPair === '2' ? "bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 text-sm font-semibold" : "bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 text-sm"}
              onClick={() => setSelectedPair('2')}
            >
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
                <button 
                  className={`flex-1 rounded text-sm py-2 font-semibold ${orderType === 'buy' ? 'bg-green-600' : ''}`}
                  onClick={() => setOrderType('buy')}
                >
                  Buy
                </button>
                <button 
                  className={`flex-1 rounded text-sm py-2 font-semibold ${orderType === 'sell' ? 'bg-red-600' : ''}`}
                  onClick={() => setOrderType('sell')}
                >
                  Sell
                </button>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Price ({selectedPair === '1' ? 'TestUSD' : 'LC'})</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 rounded px-3 py-2" 
                  placeholder="0.000100"
                  step="0.000001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (MC)</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 rounded px-3 py-2" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Total */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Total ({selectedPair === '1' ? 'TestUSD' : 'LC'})</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-700 rounded px-3 py-2" 
                  placeholder="0.00"
                  value={total}
                  readOnly
                />
              </div>

              {/* Order Button */}
              <button 
                className={`w-full rounded py-2 font-semibold ${orderType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${isPlacingOrder ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? 'Placing Order...' : `Place ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`}
              </button>

              {/* Status Message */}
              {orderStatus && (
                <div className="text-sm mt-2">
                  <p className={orderStatus.includes('✅') ? 'text-green-400' : orderStatus.includes('❌') ? 'text-red-400' : 'text-yellow-400'}>
                    {orderStatus}
                  </p>
                </div>
              )}

              {/* Generated Command */}
              {generatedCommand && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-400">Execute this command in your terminal:</p>
                  <div className="bg-gray-900 rounded p-2 text-xs font-mono break-all">
                    {generatedCommand}
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
                  >
                    Copy Command
                  </button>
                </div>
              )}

              {/* Balance Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Available: {balance ? `${(parseFloat(balance.mc) / 1000000).toFixed(2)} MC` : '0.00 MC'}</p>
                <p>Available: {balance ? `${(parseFloat(balance.tusd) / 1000000).toFixed(2)} TestUSD` : '0.00 TestUSD'}</p>
                <p>Fee: 0.5%</p>
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