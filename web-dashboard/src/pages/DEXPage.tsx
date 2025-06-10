import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { useKeplr } from '../hooks/useKeplr';

interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
}

interface Order {
  id: string;
  maker: string;
  pair_id: string;
  is_buy: boolean;
  price: { denom: string; amount: string };
  amount: { denom: string; amount: string };
  filled_amount: { denom: string; amount: string };
  created_at: string;
  updated_at: string;
}

export const DEXPage: React.FC = () => {
  const { address, isConnected } = useKeplr();
  const [orderBook, setOrderBook] = useState<{buy: OrderBookEntry[], sell: OrderBookEntry[]} | null>(null);
  const [allOrders, setAllOrders] = useState<{buy: Order[], sell: Order[]}>({buy: [], sell: []});
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState<string>('1'); // Default to pair ID 1 (MC/TestUSD)
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [generatedCommand, setGeneratedCommand] = useState<string>('');
  const [useDirectExecution, setUseDirectExecution] = useState(true); // Default to direct execution
  const [userRewards, setUserRewards] = useState<any>(null);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [claimStatus, setClaimStatus] = useState<string>('');

  useEffect(() => {
    const fetchDEXData = async () => {
      try {
        // Fetch DEX order book data for selected pair
        const orderBookResponse = await fetchAPI(`/mychain/dex/v1/order_book/${selectedPair}`);
        
        // Parse the actual order book format
        const buyOrders = orderBookResponse.buy_orders || [];
        const sellOrders = orderBookResponse.sell_orders || [];
        
        // Store full order data
        setAllOrders({
          buy: buyOrders,
          sell: sellOrders
        });

        // Filter orders for current user (hardcoded admin address)
        const adminAddress = 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz';
        const userOrders = [...buyOrders, ...sellOrders].filter(order => order.maker === adminAddress);
        setMyOrders(userOrders);
        
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
        setAllOrders({buy: [], sell: []});
        setMyOrders([]);
      }
      
      // Fetch user rewards
      try {
        const adminAddress = 'cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a';
        const rewardsResponse = await fetchAPI(`/mychain/dex/v1/user_rewards/${adminAddress}`);
        if (rewardsResponse) {
          setUserRewards(rewardsResponse);
        }
      } catch (error) {
        console.error('Failed to fetch user rewards:', error);
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
      if (useDirectExecution) {
        // Direct execution through terminal server
        const response = await fetch('http://localhost:3003/execute-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dex-order',
            orderType: orderType,
            pair: selectedPair,
            price: price,
            amount: amount,
            amountDenom: 'umc',
            priceDenom: selectedPair === '1' ? 'utusd' : 'ulc'
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setOrderStatus('✅ Order placed successfully!');
          setPrice('');
          setAmount('');
          setTotal('');
          // Refresh order book
          setTimeout(() => {
            window.location.reload(); // Force refresh to get latest data
          }, 2000);
        } else {
          setOrderStatus(`❌ Error: ${result.error || 'Failed to place order'}`);
        }
      } else {
        // Generate CLI command for manual execution
        const priceInMicro = Math.floor(parseFloat(price) * 1000000);
        const amountInMicro = Math.floor(parseFloat(amount) * 1000000);
        const priceDenom = selectedPair === '1' ? 'utusd' : 'ulc';
        const amountDenom = 'umc';
        
        const cliCommand = `mychaind tx dex create-order ${selectedPair} ${orderType === 'buy' ? '--is-buy' : ''} --amount ${amountInMicro}${amountDenom} --price ${priceInMicro}${priceDenom} --from [YOUR_KEY_NAME] --chain-id mychain --fees 50000ulc --gas 300000 --keyring-backend test -y`;
        
        setGeneratedCommand(cliCommand);
        setOrderStatus('⚠️ Please run the generated command in your terminal');
      }
    } catch (error) {
      // Terminal server not available - generate CLI command directly
      console.error('Terminal server not available, generating CLI command');
      
      // Convert amounts to micro units
      const priceInMicro = Math.floor(parseFloat(price) * 1000000);
      const amountInMicro = Math.floor(parseFloat(amount) * 1000000);
      
      // Determine denoms based on pair
      const priceDenom = selectedPair === '1' ? 'utusd' : 'ulc';
      const amountDenom = 'umc';
      
      // Generate CLI command
      const cliCommand = `mychaind tx dex create-order ${selectedPair} ${orderType === 'buy' ? '--is-buy' : ''} --amount ${amountInMicro}${amountDenom} --price ${priceInMicro}${priceDenom} --from [YOUR_KEY_NAME] --chain-id mychain --fees 50000ulc --gas 300000 --keyring-backend test -y`;
      
      setGeneratedCommand(cliCommand);
      setOrderStatus('⚠️ Web transactions are not available. Please use the CLI command below.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleClaimRewards = async () => {
    setIsClaimingRewards(true);
    setClaimStatus('');
    
    try {
      if (useDirectExecution) {
        // For now, generate CLI command as claim rewards isn't implemented in terminal server
        const cliCommand = `mychaind tx dex claim-rewards --from admin --chain-id mychain --fees 50000ulc --gas 300000 --keyring-backend test -y`;
        setGeneratedCommand(cliCommand);
        setClaimStatus('⚠️ Please run the generated command to claim rewards');
      } else {
        // Generate CLI command
        const cliCommand = `mychaind tx dex claim-rewards --from [YOUR_KEY_NAME] --chain-id mychain --fees 50000ulc --gas 300000 --keyring-backend test -y`;
        setGeneratedCommand(cliCommand);
        setClaimStatus('⚠️ Please run the generated command to claim rewards');
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      setClaimStatus('❌ Failed to generate claim command');
    } finally {
      setIsClaimingRewards(false);
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Place Order</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Direct Execution:</label>
                <button
                  onClick={() => setUseDirectExecution(!useDirectExecution)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useDirectExecution ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useDirectExecution ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            {/* Connection Status */}
            {useDirectExecution && (
              <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3 mb-4">
                <p className="text-blue-400 font-semibold text-sm">🚀 Direct Execution Mode</p>
                <p className="text-xs text-gray-300">Orders will be executed directly through the admin account.</p>
              </div>
            )}
            
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

              {/* Fee Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Trading Fee: 0.5%</p>
                <p>Min Order: 0.01 MC</p>
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
              {myOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Pair</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-right p-2">Filled</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myOrders.map((order) => {
                        const priceValue = parseFloat(order.price.amount) / 1000000;
                        const amountValue = parseFloat(order.amount.amount) / 1000000;
                        const filledValue = parseFloat(order.filled_amount.amount) / 1000000;
                        const totalValue = priceValue * amountValue / 1000000; // Corrected calculation
                        
                        return (
                          <tr key={order.id} className="border-b border-gray-700">
                            <td className="p-2">#{order.id}</td>
                            <td className={`p-2 ${order.is_buy ? 'text-green-400' : 'text-red-400'}`}>
                              {order.is_buy ? 'Buy' : 'Sell'}
                            </td>
                            <td className="p-2">MC/{order.pair_id === '1' ? 'TestUSD' : 'LC'}</td>
                            <td className="p-2 text-right">{priceValue.toFixed(6)}</td>
                            <td className="p-2 text-right">{amountValue.toFixed(2)} MC</td>
                            <td className="p-2 text-right">{filledValue.toFixed(2)} MC</td>
                            <td className="p-2 text-right">{totalValue.toFixed(6)} {order.pair_id === '1' ? 'TestUSD' : 'LC'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
                  <p>No open orders</p>
                  <p className="text-sm">Your active orders will appear here</p>
                </div>
              )}
            </div>

            {/* Order History */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Order History</h3>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
                <p>No completed orders</p>
                <p className="text-sm">Filled orders are not yet tracked</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rewards Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Liquidity Rewards</h2>
          
          <div className="space-y-4">
            {/* Rewards Summary */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Total Unclaimed Rewards</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {userRewards && userRewards.unclaimed_amount ? 
                      `${(parseFloat(userRewards.unclaimed_amount.amount) / 1000000).toFixed(6)} LC` : 
                      '0.000000 LC'
                    }
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Total Earned (All Time)</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {userRewards && userRewards.total_earned ? 
                      `${(parseFloat(userRewards.total_earned.amount) / 1000000).toFixed(6)} LC` : 
                      '0.000000 LC'
                    }
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Annual Reward Rate</p>
                  <p className="text-2xl font-bold text-green-400">~7%</p>
                </div>
              </div>
            </div>

            {/* Claim Button */}
            <div className="flex justify-center">
              <button
                onClick={handleClaimRewards}
                disabled={isClaimingRewards || !userRewards || !userRewards.unclaimed_amount || parseFloat(userRewards.unclaimed_amount.amount) === 0}
                className={`px-6 py-3 rounded-lg font-semibold ${
                  isClaimingRewards || !userRewards || !userRewards.unclaimed_amount || parseFloat(userRewards.unclaimed_amount.amount) === 0
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isClaimingRewards ? 'Processing...' : 'Claim Rewards'}
              </button>
            </div>

            {/* Claim Status */}
            {claimStatus && (
              <div className={`text-center text-sm ${
                claimStatus.includes('✅') ? 'text-green-400' : 
                claimStatus.includes('❌') ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {claimStatus}
              </div>
            )}

            {/* Rewards by Order */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Rewards by Order</h3>
              {userRewards && userRewards.order_rewards && userRewards.order_rewards.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left p-2">Order ID</th>
                        <th className="text-left p-2">Pair</th>
                        <th className="text-right p-2">Order Size</th>
                        <th className="text-right p-2">Rewards Earned</th>
                        <th className="text-right p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRewards.order_rewards.map((reward: any, index: number) => (
                        <tr key={index} className="border-b border-gray-700">
                          <td className="p-2">#{reward.order_id}</td>
                          <td className="p-2">MC/{reward.pair_id === '1' ? 'TestUSD' : 'LC'}</td>
                          <td className="p-2 text-right">{(parseFloat(reward.order_amount.amount) / 1000000).toFixed(2)} MC</td>
                          <td className="p-2 text-right text-purple-400">{(parseFloat(reward.reward_amount.amount) / 1000000).toFixed(6)} LC</td>
                          <td className="p-2 text-right">
                            <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">Unclaimed</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
                  <p>No rewards earned yet</p>
                  <p className="text-sm">Place orders to earn liquidity rewards</p>
                </div>
              )}
            </div>

            {/* Rewards Info */}
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-2">💎 How to Earn Rewards</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Place limit orders on any trading pair</li>
                <li>• Rewards accumulate based on order size and time</li>
                <li>• Base rate: 0.222% (annualized ~7%)</li>
                <li>• Rewards are paid in LC tokens</li>
                <li>• Claim anytime - no minimum required</li>
              </ul>
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