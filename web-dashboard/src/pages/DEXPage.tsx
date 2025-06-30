import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { useKeplr } from '../hooks/useKeplr';
import { DynamicRewardsInfo } from '../components/DynamicRewardsInfo';
import { OrderPlacementGuide } from '../components/OrderPlacementGuide';
import { LiquidityPositions } from '../components/LiquidityPositions';
import { DEXTransactionHistory } from '../components/DEXTransactionHistory';
import { LCPriceDisplay } from '../components/LCPriceDisplay';
import { SpreadIncentivesInfo } from '../components/SpreadIncentivesInfo';
import { formatUnixTimestamp } from '../utils/formatters';

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
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [userBalances, setUserBalances] = useState<any>(null);
  const [dexParams, setDexParams] = useState<any>(null);
  const [mcSupply, setMcSupply] = useState<string>('0');
  const [mcMarketPrice, setMcMarketPrice] = useState<number>(0.0001);
  const [lastTradePrice, setLastTradePrice] = useState<number | null>(null);
  const [validationWarning, setValidationWarning] = useState<string>('');
  const [currentAPR, setCurrentAPR] = useState<number>(100); // Default to 100% APR

  // Update manual orders when myOrders changes
  useEffect(() => {
    if (myOrders.length > 0) {
      const formattedOrders = myOrders.map(order => ({
        id: order.id,
        is_buy: order.is_buy,
        price: (parseFloat(order.price.amount) / 1000000).toFixed(6),
        amount: (parseFloat(order.amount.amount) / 1000000).toFixed(6),
        pair: order.pair_id === '1' ? 'MC/TUSD' : 'MC/LC',
        filled: ((parseFloat(order.filled_amount.amount) / parseFloat(order.amount.amount)) * 100).toFixed(0),
        created_at: order.created_at,
        remaining: parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount)
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
          if (priceRes.price) {
            // Price is already in whole units (e.g., 0.000142) - DO NOT DIVIDE BY 1M
            const priceInUSD = parseFloat(priceRes.price);
            console.log('MC Price from API:', priceRes.price, 'Parsed:', priceInUSD);
            setMcMarketPrice(priceInUSD);
          }
        } catch (err) {
          console.error('Failed to fetch MC price:', err);
          // Keep default of 0.0001
        }
        
        // Fetch current dynamic reward APR
        try {
          const rewardRes = await fetchAPI('/mychain/dex/v1/dynamic_reward_state');
          if (rewardRes?.state?.current_annual_rate) {
            setCurrentAPR(parseFloat(rewardRes.state.current_annual_rate));
          }
        } catch (err) {
          console.error('Failed to fetch dynamic reward state:', err);
          // Keep default of 100%
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
          const originalAmount = parseFloat(order.amount?.amount || '0');
          const filledAmount = parseFloat(order.filled_amount?.amount || '0');
          const remainingAmount = (originalAmount - filledAmount) / 1000000;
          const totalValue = priceValue * remainingAmount;
          
          return {
            price: priceValue.toFixed(6),
            amount: remainingAmount.toFixed(6),
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
      
      // Fetch recent trades
      try {
        const tradesResponse = await fetchAPI(`/mychain/dex/v1/trades?pair_id=${selectedPair}&limit=20`);
        if (tradesResponse && tradesResponse.trades) {
          setRecentTrades(tradesResponse.trades);
          // Update last trade price if there are trades
          if (tradesResponse.trades.length > 0) {
            const lastTrade = tradesResponse.trades[0]; // Most recent trade
            const lastPrice = parseFloat(lastTrade.price.amount) / 1000000;
            setLastTradePrice(lastPrice);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      }
      
      setLoading(false);
    };

    fetchDEXData();
    const interval = setInterval(fetchDEXData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [selectedPair]);

  // Calculate total and validate when price or amount changes
  useEffect(() => {
    if (price && amount) {
      const totalValue = parseFloat(price) * parseFloat(amount);
      setTotal(totalValue.toFixed(6));
      
      // Calculate minimum order value to earn rewards
      const minimumOrderValue = 0.000001 * 8760 * 100 / currentAPR; // $0.0876 at 100% APR
      
      // Check if order is too small to earn rewards
      if (totalValue < minimumOrderValue) {
        setValidationWarning(`⚠️ Order too small: Minimum $${minimumOrderValue.toFixed(2)} needed to earn rewards at ${currentAPR.toFixed(1)}% APR`);
        return; // Skip other validations
      }
      
      // Real-time balance validation
      if (userBalances) {
        if (orderType === 'sell') {
          const mcBalance = parseInt(userBalances.find((b: any) => b.denom === 'umc')?.amount || '0') / 1000000;
          if (parseFloat(amount) > mcBalance) {
            setValidationWarning(`⚠️ Insufficient MC: You have ${mcBalance.toFixed(6)} MC`);
          } else {
            setValidationWarning('');
          }
        } else {
          const quoteDenom = selectedPair === '1' ? 'utusd' : 'ulc';
          const quoteName = selectedPair === '1' ? 'TUSD' : 'LC';
          const quoteBalance = parseInt(userBalances.find((b: any) => b.denom === quoteDenom)?.amount || '0') / 1000000;
          
          if (totalValue > quoteBalance) {
            setValidationWarning(`⚠️ Insufficient ${quoteName}: You have ${quoteBalance.toFixed(6)} ${quoteName}`);
          } else {
            setValidationWarning('');
          }
        }
      }
    } else {
      setTotal('');
      setValidationWarning('');
    }
  }, [price, amount, orderType, selectedPair, userBalances, currentAPR]);

  const handlePlaceOrder = async () => {
    if (!price || !amount) {
      setOrderStatus('❌ Please enter price and amount');
      return;
    }

    // Validate minimum order amount (0.01 MC)
    if (parseFloat(amount) < 0.01) {
      setOrderStatus('❌ Minimum order amount is 0.01 MC');
      return;
    }

    // Check balance based on order type
    console.log('Balance validation - userBalances:', userBalances);
    console.log('Order type:', orderType, 'Amount:', amount, 'Price:', price);
    
    if (userBalances) {
      if (orderType === 'sell') {
        // Check MC balance for sell orders
        const mcBalance = parseInt(userBalances.find((b: any) => b.denom === 'umc')?.amount || '0') / 1000000;
        console.log('MC Balance:', mcBalance, 'Trying to sell:', parseFloat(amount));
        if (parseFloat(amount) > mcBalance) {
          setOrderStatus(`❌ Insufficient MC balance. You have ${mcBalance.toFixed(6)} MC, but trying to sell ${amount} MC`);
          return;
        }
      } else {
        // Check quote currency balance for buy orders
        const quoteDenom = selectedPair === '1' ? 'utusd' : 'ulc';
        const quoteName = selectedPair === '1' ? 'TUSD' : 'LC';
        const quoteBalance = parseInt(userBalances.find((b: any) => b.denom === quoteDenom)?.amount || '0') / 1000000;
        const totalNeeded = parseFloat(price) * parseFloat(amount);
        
        if (totalNeeded > quoteBalance) {
          setOrderStatus(`❌ Insufficient ${quoteName} balance. You have ${quoteBalance.toFixed(6)} ${quoteName}, but need ${totalNeeded.toFixed(6)} ${quoteName}`);
          return;
        }
      }
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
          // Data will refresh on next interval
        } else {
          // Parse error message for common issues
          let errorMessage = result.error || 'Failed to place order';
          
          // Check for specific error codes
          if (errorMessage.includes('code 1108') || errorMessage.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for this order';
          } else if (errorMessage.includes('code 1109')) {
            errorMessage = 'Invalid trading pair';
          } else if (errorMessage.includes('code 1110')) {
            errorMessage = 'Order amount too small';
          } else if (errorMessage.includes('code 1111')) {
            errorMessage = 'Invalid price';
          } else if (errorMessage.includes('minimum')) {
            errorMessage = 'Order amount below minimum requirement';
          }
          
          setOrderStatus(`❌ Error: ${errorMessage}`);
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

        {/* Order Placement Guide - Shows current APR, volume caps, and optimal placement */}
        <OrderPlacementGuide />

        {/* Spread Incentives and Strategic Bonuses */}
        <SpreadIncentivesInfo />

        {/* LC Price Information */}
        <LCPriceDisplay />


        {/* Liquidity Terms and Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📊 Liquidity Provider Information</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Available Funds */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Your Available Funds</h3>
              {userBalances && userBalances.map((balance: any) => {
                const amount = (parseInt(balance.amount) / 1000000).toFixed(6);
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
              <h3 className="text-sm text-purple-400 mb-2">LC Reward Rate</h3>
              <p className="text-2xl font-bold text-purple-300">
                {currentAPR.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Annual Rate (Dynamic)</p>
              <p className="text-xs text-gray-500 mt-2">
                Paid in: LC tokens<br/>
                For: All trading pairs<br/>
                Auto-distributed every 100 blocks
              </p>
            </div>
            
            {/* MC Supply Info */}
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm text-blue-400 mb-2">MC Total Supply</h3>
              <p className="text-2xl font-bold text-blue-300">
                {(parseInt(mcSupply) / 1000000).toFixed(6)} MC
              </p>
              <p className="text-xs text-gray-400 mt-1">Used for volume cap calculations</p>
            </div>
          </div>
          
          {/* Tier Information */}
          <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">🎯 Liquidity Reward Tiers</h3>
            
            {/* Market Price Display */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-yellow-400">Current MC Market Price:</span>
                  <span className="text-lg font-bold text-yellow-300">${mcMarketPrice.toFixed(6)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Actual market price from MainCoin module (Segment based pricing)
                </p>
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
                              <span>Volume: {tierVolume.toFixed(6)} MC</span>
                              <span>Cap: {tierCap.toFixed(6)} MC</span>
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
                              Reward eligible: {Math.min(tierVolume, tierCap).toFixed(6)} MC
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
                      { tier: 1, desc: "At market price", threshold: marketPrice, cap: 0.01, discount: 0 },
                      { tier: 2, desc: "3% below market", threshold: marketPrice * 0.97, cap: 0.03, discount: 3 },
                      { tier: 3, desc: "8% below market", threshold: marketPrice * 0.92, cap: 0.04, discount: 8 },
                      { tier: 4, desc: "12% below market", threshold: marketPrice * 0.88, cap: 0.05, discount: 12 }
                    ];
                    
                    return sellTiers.map(tier => {
                      // Calculate volume in this tier
                      const tierVolume = allOrders.sell.reduce((sum, order) => {
                        const orderPrice = parseFloat(order.price.amount) / 1000000;
                        const remaining = parseFloat(order.amount.amount) - parseFloat(order.filled_amount.amount);
                        
                        // Check if order falls in this tier's price range
                        // For sell orders with negative deviation, check if price is at or below threshold
                        const maxPrice = tier.threshold;
                        const prevTier = tier.tier > 1 ? sellTiers[tier.tier - 2] : null;
                        const minPrice = prevTier ? prevTier.threshold : 0;
                        
                        if (orderPrice <= maxPrice && orderPrice > minPrice) {
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
                              <span>Volume: {tierVolume.toFixed(6)} MC</span>
                              <span>Cap: {tierCap.toFixed(6)} MC</span>
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
                              Reward eligible: {Math.min(tierVolume, tierCap).toFixed(6)} MC
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
              {/* Available Balances */}
              <div className="bg-gray-700/50 rounded-lg p-3 mb-2">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Available Balances</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">MC:</span>
                    <span className="font-mono">
                      {userBalances ? 
                        (parseInt(userBalances.find((b: any) => b.denom === 'umc')?.amount || '0') / 1000000).toFixed(6) 
                        : '0.000000'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">TUSD:</span>
                    <span className="font-mono">
                      {userBalances ? 
                        (parseInt(userBalances.find((b: any) => b.denom === 'utusd')?.amount || '0') / 1000000).toFixed(6) 
                        : '0.000000'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">LC:</span>
                    <span className="font-mono">
                      {userBalances ? 
                        (parseInt(userBalances.find((b: any) => b.denom === 'ulc')?.amount || '0') / 1000000).toFixed(6) 
                        : '0.000000'
                      }
                    </span>
                  </div>
                </div>
              </div>

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

              {/* Validation Warning */}
              {validationWarning && (
                <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm font-medium">
                    {validationWarning}
                  </p>
                </div>
              )}

              {/* Order Button */}
              <button 
                className={`w-full rounded py-2 font-semibold ${orderType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${isPlacingOrder || validationWarning ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !!validationWarning}
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

              {/* Fee Info & Minimum for Rewards */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Trading Fee: 0.5%</p>
                <p>Min Order: 0.01 MC</p>
                <div className="mt-2 p-2 bg-orange-900/20 border border-orange-500/30 rounded">
                  <p className="text-orange-400 font-medium">Minimum for LC Rewards:</p>
                  <p className="text-orange-300">${(0.000001 * 8760 * 100 / currentAPR).toFixed(2)} at {currentAPR.toFixed(1)}% APR</p>
                  <p className="text-gray-400 text-xs mt-1">Orders below this earn 0 LC</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Book */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">📊 Order Book</h2>
            
            {/* Explanation */}
            <div className="bg-gray-700/30 rounded-lg p-3 mb-4 text-sm text-gray-400">
              <p className="mb-1"><strong>What is this?</strong> Live buy and sell orders for MC/TUSD trading pair.</p>
              <p><strong>Current Market Price:</strong> ${mcMarketPrice.toFixed(6)} (from MainCoin segment pricing)</p>
            </div>
            
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
                <div className="text-lg font-bold text-yellow-400">
                  {lastTradePrice ? lastTradePrice.toFixed(6) : 'No trades yet'}
                </div>
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
              <div className="grid grid-cols-4 text-xs text-gray-400 mb-2">
                <div>Price</div>
                <div>Amount</div>
                <div>Type</div>
                <div>Time</div>
              </div>
              
              {recentTrades && recentTrades.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {recentTrades.map((trade, index) => {
                    const price = parseFloat(trade.price.amount) / 1000000;
                    const amount = parseFloat(trade.amount.amount) / 1000000;
                    const isBuyerTaker = trade.buy_order_id > trade.sell_order_id;
                    const timestamp = new Date(parseInt(trade.executed_at) * 1000);
                    const timeStr = timestamp.toLocaleTimeString();
                    
                    return (
                      <div key={index} className="grid grid-cols-4 text-xs hover:bg-gray-700/50 rounded px-1 py-1">
                        <div className={isBuyerTaker ? 'text-green-400' : 'text-red-400'}>
                          {price.toFixed(6)}
                        </div>
                        <div>{amount.toFixed(2)}</div>
                        <div className={isBuyerTaker ? 'text-green-400' : 'text-red-400'}>
                          {isBuyerTaker ? 'Buy' : 'Sell'}
                        </div>
                        <div className="text-gray-500">{timeStr}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm py-4">
                  No trades executed yet
                </div>
              )}
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
                        <th className="text-left p-2">Placed</th>
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
                            <td className="p-2 text-right">{amountValue.toFixed(6)} MC</td>
                            <td className="p-2 text-right">{filledValue.toFixed(6)} MC</td>
                            <td className="p-2 text-right">{totalValue.toFixed(6)} {order.pair_id === '1' ? 'TestUSD' : 'LC'}</td>
                            <td className="p-2 text-xs">{formatUnixTimestamp(order.created_at)}</td>
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
                          <td className="p-2 text-right">{(parseFloat(reward.order_amount.amount) / 1000000).toFixed(6)} MC</td>
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
              <h4 className="font-semibold text-blue-400 mb-2">💎 How to Earn LC Rewards</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Place limit orders on any trading pair (MC/TUSD or MC/LC)</li>
                <li>• <strong>All rewards are paid in LC tokens</strong> regardless of trading pair</li>
                <li>• Rewards accumulate based on order size and time</li>
                <li>• Dynamic rate: 7-100% APR (currently {currentAPR.toFixed(1)}%)</li>
                <li>• LC starts at 0.0001 MC and can appreciate in value</li>
                <li>• Auto-distributed every 100 blocks (~8.3 minutes)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Liquidity Positions Tracker */}
        <LiquidityPositions 
          userAddress="cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0"
          currentAPR={currentAPR}
          mcPrice={mcMarketPrice}
          onCancelOrder={handleCancelSpecificOrder}
        />

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
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                          <span>Placed: {formatUnixTimestamp(order.created_at)}</span>
                          {(() => {
                            // Calculate potential spread bonus
                            const marketPrice = mcMarketPrice;
                            const orderPrice = parseFloat(order.price);
                            let spreadBonus = '';
                            
                            if (order.is_buy) {
                              // Buy orders that tighten spread
                              const improvement = ((orderPrice - marketPrice * 0.95) / (marketPrice * 0.05)) * 100;
                              if (improvement >= 75) spreadBonus = '2.0x spread bonus';
                              else if (improvement >= 50) spreadBonus = '1.5x spread bonus';
                              else if (improvement >= 25) spreadBonus = '1.3x spread bonus';
                              else if (improvement >= 5) spreadBonus = '1.1x spread bonus';
                            } else {
                              // Sell orders above average ask
                              const priceAboveMarket = ((orderPrice - marketPrice) / marketPrice) * 100;
                              if (priceAboveMarket >= 10) spreadBonus = '1.5x spread bonus';
                              else if (priceAboveMarket >= 5) spreadBonus = '1.3x spread bonus';
                              else if (priceAboveMarket >= 2) spreadBonus = '1.2x spread bonus';
                              else if (priceAboveMarket > 0) spreadBonus = '1.1x spread bonus';
                            }
                            
                            return spreadBonus && (
                              <span className="text-green-400 font-medium">
                                🎯 {spreadBonus}
                              </span>
                            );
                          })()}
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
            
            {/* Spread Bonus Info */}
            {manualOrders.length > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mt-3">
                <p className="text-xs text-green-400 font-medium mb-1">🎯 Spread Bonus Indicators</p>
                <p className="text-xs text-gray-300">
                  Orders that improve market spreads earn bonus rewards. Your actual bonus depends on the 
                  current order book state when rewards are distributed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DEX Transaction History */}
        <DEXTransactionHistory 
          userAddress="cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz" 
          mcPrice={mcMarketPrice} 
        />

        {/* DEX Info */}
        <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-green-400 mb-2">🚀 DEX Mission: MC Price Appreciation</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <p>• <strong>Primary Goal:</strong> Support and drive MC price upward through incentivized liquidity</p>
            <p>• <strong>Reward Priority:</strong> Orders with higher MC prices (both buy and sell) get rewards first</p>
            <p>• <strong>Dynamic APR:</strong> 7-100% rewards paid in LC to preserve MC value</p>
            <p>• <strong>Volume Caps:</strong> Encourage broad participation across all price levels</p>
            <p>• <strong>Result:</strong> Systematic upward pressure on MC price over time</p>
          </div>
        </div>
      </div>
    </div>
  );
};