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
  const [orderIdToCancel, setOrderIdToCancel] = useState<string>('');
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<string>('');
  const [manualOrders, setManualOrders] = useState<any[]>([]);
  const [userBalances, setUserBalances] = useState<any>(null);
  const [dexParams, setDexParams] = useState<any>(null);
  const [mcSupply, setMcSupply] = useState<string>('0');
  const [mcMarketPrice, setMcMarketPrice] = useState<number>(0.0001);

  // Update manual orders when myOrders changes
  useEffect(() => {
    if (myOrders.length > 0) {
      const formattedOrders = myOrders.map(order => ({
        id: order.id,
        is_buy: order.is_buy,
        price: (parseFloat(order.price.amount) / 1000000).toFixed(6),
        amount: (parseFloat(order.amount.amount) / 1000000).toFixed(2),
        pair: order.pair_id === '1' ? 'MC/TUSD' : 'MC/LC',
        filled: ((parseFloat(order.filled_amount.amount) / parseFloat(order.amount.amount)) * 100).toFixed(0)
      }));
      setManualOrders(formattedOrders);
    }
  }, [myOrders]);

  const handleCancelOrder = async () => {
    if (!orderIdToCancel) return;
    
    setIsCancellingOrder(true);
    setCancelStatus('');
    
    try {
      const response = await fetch('http://localhost:3003/execute-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cancel-order',
          orderId: orderIdToCancel
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCancelStatus(`✅ Order ${orderIdToCancel} cancelled successfully!`);
        setOrderIdToCancel('');
        
        // Refresh order data after cancellation
        setTimeout(() => {
          setCancelStatus('');
        }, 5000);
      } else {
        setCancelStatus(`❌ Failed to cancel order: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setCancelStatus('❌ Failed to cancel order. Please check if terminal server is running.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleCancelSpecificOrder = async (orderId: string) => {
    setIsCancellingOrder(true);
    setCancelStatus('');
    
    try {
      const response = await fetch('http://localhost:3003/execute-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cancel-order',
          orderId: orderId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCancelStatus(`✅ Order ${orderId} cancelled successfully!`);
        // Remove from manual orders list
        setManualOrders(manualOrders.filter(order => order.id !== orderId));
        
        setTimeout(() => {
          setCancelStatus('');
        }, 3000);
      } else {
        setCancelStatus(`❌ Failed to cancel order ${orderId}: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setCancelStatus('❌ Failed to cancel order. Please check if terminal server is running.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  useEffect(() => {
    const fetchDEXData = async () => {
      try {
        // Fetch user balances
        const adminAddress = 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz';
        try {
          const balanceRes = await fetchAPI(`/cosmos/bank/v1beta1/balances/${adminAddress}`);
          setUserBalances(balanceRes.balances || []);
        } catch (err) {
          console.error('Failed to fetch balances:', err);
        }
        
        // Fetch DEX parameters
        try {
          const paramsRes = await fetchAPI('/mychain/dex/v1/params');
          setDexParams(paramsRes.params);
        } catch (err) {
          console.error('Failed to fetch DEX params:', err);
        }
        
        // Fetch MC supply
        try {
          const supplyRes = await fetchAPI('/cosmos/bank/v1beta1/supply');
          const mcSupply = supplyRes.supply?.find((s: any) => s.denom === 'umc');
          setMcSupply(mcSupply?.amount || '0');
        } catch (err) {
          console.error('Failed to fetch MC supply:', err);
        }
        
        // Fetch current MC price
        try {
          const priceRes = await fetchAPI('/mychain/maincoin/v1/current_price');
          if (priceRes.current_price) {
            const priceInUSD = parseFloat(priceRes.current_price) / 1000000;
            setMcMarketPrice(priceInUSD);
          }
        } catch (err) {
          console.error('Failed to fetch MC price:', err);
          // Keep default of 0.0001
        }
        
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

        // Filter orders for current user (using admin address from above)
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

        {/* Liquidity Terms and Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📊 Liquidity Provider Information</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Available Funds */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Your Available Funds</h3>
              {userBalances && userBalances.map((balance: any) => {
                const amount = (parseInt(balance.amount) / 1000000).toFixed(2);
                const denom = balance.denom === 'ulc' ? 'LC' : balance.denom === 'umc' ? 'MC' : balance.denom === 'utusd' ? 'TUSD' : balance.denom;
                return (
                  <div key={balance.denom} className="flex justify-between items-center py-1">
                    <span className="text-gray-300">{denom}:</span>
                    <span className="font-bold">{amount}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Current Reward Rate */}
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm text-purple-400 mb-2">Current Reward Rate</h3>
              <p className="text-2xl font-bold text-purple-300">
                {dexParams ? `${(parseFloat(dexParams.base_reward_rate) / 10000).toFixed(1)}%` : '0.0%'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Annual Rate</p>
              <p className="text-xs text-gray-500 mt-2">
                Distribution: Every block<br/>
                Auto-distributed (no claiming needed)
              </p>
            </div>
            
            {/* MC Supply Info */}
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm text-blue-400 mb-2">MC Total Supply</h3>
              <p className="text-2xl font-bold text-blue-300">
                {(parseInt(mcSupply) / 1000000).toLocaleString()} MC
              </p>
              <p className="text-xs text-gray-400 mt-1">Used for volume cap calculations</p>
            </div>
          </div>
          
          {/* Tier Information */}
          <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">🎯 Liquidity Reward Tiers</h3>
            
            {/* Market Price Display */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-400">Current MC Market Price:</span>
                <span className="text-lg font-bold text-yellow-300">${mcMarketPrice.toFixed(6)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Buy Side Tiers */}
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2">Buy Orders (Bid Side)</h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const marketPrice = mcMarketPrice;
                    const mcSupplyValue = parseInt(mcSupply) / 1000000;
                    
                    // Calculate tier thresholds and volumes
                    const buyTiers = [
                      { tier: 1, desc: "At market price", threshold: marketPrice, cap: 0.02, discount: 0 },
                      { tier: 2, desc: "3% below market", threshold: marketPrice * 0.97, cap: 0.05, discount: 3 },
                      { tier: 3, desc: "8% below market", threshold: marketPrice * 0.92, cap: 0.08, discount: 8 },
                      { tier: 4, desc: "12% below market", threshold: marketPrice * 0.88, cap: 0.12, discount: 12 }
                    ];
                    
                    return buyTiers.map(tier => {
                      // Calculate volume in this tier
                      const tierVolume = allOrders.buy.reduce((sum, order) => {
                        const orderPrice = parseFloat(order.price.amount) / 1000000;
                        const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                        
                        // Check if order falls in this tier's price range
                        const prevTier = tier.tier > 1 ? buyTiers[tier.tier - 2] : null;
                        const minPrice = prevTier ? prevTier.threshold : 0;
                        const maxPrice = tier.threshold;
                        
                        if (orderPrice >= minPrice && orderPrice <= maxPrice) {
                          return sum + (remaining / 1000000);
                        }
                        return sum;
                      }, 0);
                      
                      const tierCap = mcSupplyValue * tier.cap;
                      const tierUsage = tierCap > 0 ? (tierVolume / tierCap * 100) : 0;
                      const isFull = tierUsage >= 100;
                      
                      return (
                        <div key={tier.tier} className={`p-2 rounded border ${isFull ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="font-medium">Tier {tier.tier}</span>
                              <span className="text-xs text-gray-400 ml-2">({tier.desc})</span>
                            </div>
                            {isFull && <span className="text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">FULL</span>}
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            Orders ≥ ${tier.threshold.toFixed(6)}
                          </div>
                          <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Volume: {tierVolume.toFixed(2)} MC</span>
                              <span>Cap: {tierCap.toFixed(0)} MC</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${isFull ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(tierUsage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {tierUsage.toFixed(1)}% used
                            </div>
                          </div>
                          {tierVolume > 0 && (
                            <div className="text-xs text-gray-400">
                              Reward eligible: {Math.min(tierVolume, tierCap).toFixed(2)} MC
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* Sell Side Tiers */}
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-2">Sell Orders (Ask Side)</h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const marketPrice = mcMarketPrice;
                    const mcSupplyValue = parseInt(mcSupply) / 1000000;
                    
                    // Calculate tier thresholds and volumes
                    const sellTiers = [
                      { tier: 1, desc: "At market price", threshold: marketPrice, cap: 0.01, premium: 0 },
                      { tier: 2, desc: "3% above market", threshold: marketPrice * 1.03, cap: 0.03, premium: 3 },
                      { tier: 3, desc: "8% above market", threshold: marketPrice * 1.08, cap: 0.04, premium: 8 },
                      { tier: 4, desc: "12% above market", threshold: marketPrice * 1.12, cap: 0.05, premium: 12 }
                    ];
                    
                    return sellTiers.map(tier => {
                      // Calculate volume in this tier
                      const tierVolume = allOrders.sell.reduce((sum, order) => {
                        const orderPrice = parseFloat(order.price.amount) / 1000000;
                        const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                        
                        // Check if order falls in this tier's price range
                        const minPrice = tier.threshold;
                        const nextTier = tier.tier < 4 ? sellTiers[tier.tier] : null;
                        const maxPrice = nextTier ? nextTier.threshold : Infinity;
                        
                        if (orderPrice >= minPrice && orderPrice < maxPrice) {
                          return sum + (remaining / 1000000);
                        }
                        return sum;
                      }, 0);
                      
                      const tierCap = mcSupplyValue * tier.cap;
                      const tierUsage = tierCap > 0 ? (tierVolume / tierCap * 100) : 0;
                      const isFull = tierUsage >= 100;
                      
                      return (
                        <div key={tier.tier} className={`p-2 rounded border ${isFull ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="font-medium">Tier {tier.tier}</span>
                              <span className="text-xs text-gray-400 ml-2">({tier.desc})</span>
                            </div>
                            {isFull && <span className="text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">FULL</span>}
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            Orders ≤ ${tier.threshold.toFixed(6)}
                          </div>
                          <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Volume: {tierVolume.toFixed(2)} MC</span>
                              <span>Cap: {tierCap.toFixed(0)} MC</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${isFull ? 'bg-red-500' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(tierUsage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {tierUsage.toFixed(1)}% used
                            </div>
                          </div>
                          {tierVolume > 0 && (
                            <div className="text-xs text-gray-400">
                              Reward eligible: {Math.min(tierVolume, tierCap).toFixed(2)} MC
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            
            {/* Active Tiers Summary */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">📊 Active Tiers Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Buy side active tiers:</span>
                  <span className="ml-2 text-green-400">
                    {(() => {
                      const activeBuyTiers = allOrders.buy.filter(order => {
                        const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                        return remaining > 0;
                      }).length > 0 ? 'Active' : 'None';
                      return activeBuyTiers;
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Sell side active tiers:</span>
                  <span className="ml-2 text-red-400">
                    {(() => {
                      const activeSellTiers = allOrders.sell.filter(order => {
                        const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                        return remaining > 0;
                      }).length > 0 ? 'Active' : 'None';
                      return activeSellTiers;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Current Volume Analysis */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-400 mb-2">📈 Current Liquidity Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Total Buy Order Volume:</p>
                <p className="font-bold">
                  {(() => {
                    const totalBuyVolume = allOrders.buy.reduce((sum, order) => {
                      const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                      const price = parseFloat(order.price.amount) / 1000000;
                      return sum + (remaining * price / 1000000);
                    }, 0);
                    return `$${totalBuyVolume.toFixed(2)}`;
                  })()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const mcSupplyValue = parseInt(mcSupply) / 1000000;
                    const totalBuyVolume = allOrders.buy.reduce((sum, order) => {
                      const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                      const price = parseFloat(order.price.amount) / 1000000;
                      return sum + (remaining * price / 1000000);
                    }, 0);
                    const percentage = mcSupplyValue > 0 ? (totalBuyVolume / (mcSupplyValue * 0.0001) * 100).toFixed(2) : '0';
                    return `${percentage}% of MC market cap`;
                  })()}
                </p>
              </div>
              
              <div>
                <p className="text-gray-400 mb-1">Total Sell Order Volume:</p>
                <p className="font-bold">
                  {(() => {
                    const totalSellVolume = allOrders.sell.reduce((sum, order) => {
                      const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                      const price = parseFloat(order.price.amount) / 1000000;
                      return sum + (remaining * price / 1000000);
                    }, 0);
                    return `$${totalSellVolume.toFixed(2)}`;
                  })()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const mcSupplyValue = parseInt(mcSupply) / 1000000;
                    const totalSellVolume = allOrders.sell.reduce((sum, order) => {
                      const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                      const price = parseFloat(order.price.amount) / 1000000;
                      return sum + (remaining * price / 1000000);
                    }, 0);
                    const percentage = mcSupplyValue > 0 ? (totalSellVolume / (mcSupplyValue * 0.0001) * 100).toFixed(2) : '0';
                    return `${percentage}% of MC market cap`;
                  })()}
                </p>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-gray-800/50 rounded">
              <p className="text-xs text-gray-400 mb-1">⚠️ Volume Cap Status:</p>
              <p className="text-sm">
                Orders are eligible for rewards based on their tier and total volume. Once a tier's volume cap is reached, additional orders in that tier won't earn rewards. Orders are processed by price priority (best prices first).
              </p>
            </div>
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
              
              {/* No trades yet */}
              <div className="text-center text-gray-500 text-sm py-4">
                No trades executed yet
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

        {/* Your Active Orders */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Your Active Orders</h2>
          
          <div className="space-y-4">
            {cancelStatus && (
              <div className={`p-3 rounded ${
                cancelStatus.includes('success') ? 'bg-green-900/20 text-green-400 border border-green-500' : 
                cancelStatus.includes('error') || cancelStatus.includes('failed') ? 'bg-red-900/20 text-red-400 border border-red-500' : 
                'bg-yellow-900/20 text-yellow-400 border border-yellow-500'
              }`}>
                {cancelStatus}
              </div>
            )}
            
            {manualOrders.length > 0 ? (
              <div className="space-y-3">
                {manualOrders.map((order) => (
                  <div key={order.id} className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.is_buy ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {order.is_buy ? 'BUY' : 'SELL'}
                          </span>
                          <span className="text-lg font-semibold">{order.pair}</span>
                          <span className="text-sm text-gray-400">Order #{order.id}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Price:</span>
                            <p className="font-medium">${order.price}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Amount:</span>
                            <p className="font-medium">{order.amount} MC</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Filled:</span>
                            <p className="font-medium">{order.filled}%</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelSpecificOrder(order.id)}
                        disabled={isCancellingOrder}
                        className={`ml-4 px-4 py-2 rounded font-medium text-sm ${
                          isCancellingOrder
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {isCancellingOrder ? 'Processing...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-700/30 rounded-lg p-6 text-center">
                <p className="text-gray-400">No active orders found</p>
                <p className="text-sm text-gray-500 mt-2">Place new orders above to start trading</p>
              </div>
            )}
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-400">
                Note: This shows your known active orders. For the most up-to-date list, run:
                <code className="bg-gray-700 px-2 py-1 rounded ml-2">mychaind query dex order-book 1</code>
              </p>
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