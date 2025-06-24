import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { formatUnixTimestamp } from '../utils/formatters';

interface LiquidityPosition {
  orderId: string;
  pairId: string;
  isBuy: boolean;
  price: number;
  amount: number;
  filled: number;
  value: number;
  placedAt: string;
  lastRewardAt?: string;
  totalRewardsEarned: number;
  isEligible: boolean;
  eligibilityReason?: string;
  tier: number;
  hourlyReward: number;
  spreadMultiplier: number;
  bonusType: string;
  potentialMultiplier: number;
  potentialBonusType: string;
  rewardPayments?: RewardPayment[];
}

interface RewardPayment {
  timestamp: string;
  amount: number;
  orderId: string;
  blockHeight: number;
  lcPriceAtTime: number;  // LC price in MC at time of payment
  mcPriceAtTime: number;  // MC price in TUSD at time of payment
  valueInTUSD: number;    // Total value in TUSD
}

interface Props {
  userAddress: string;
  currentAPR: number;
  mcPrice: number;
  onCancelOrder: (orderId: string) => void;
}

export const LiquidityPositions: React.FC<Props> = ({ 
  userAddress, 
  currentAPR, 
  mcPrice,
  onCancelOrder 
}) => {
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [rewardHistory, setRewardHistory] = useState<RewardPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPositionsAndHistory();
    const interval = setInterval(fetchPositionsAndHistory, 10000);
    return () => clearInterval(interval);
  }, [userAddress]);

  const fetchPositionsAndHistory = async () => {
    try {
      // Fetch all orders
      const orderBookRes = await fetchAPI('/mychain/dex/v1/order_book/1');
      const allOrders = [...(orderBookRes.buy_orders || []), ...(orderBookRes.sell_orders || [])];
      
      // Filter user's orders
      const userOrders = allOrders.filter((order: any) => order.maker === userAddress);
      
      // Fetch order rewards info to get actual spread multipliers
      const orderRewardsRes = await fetchAPI(`/mychain/dex/v1/order_rewards/${userAddress}`);
      const orderRewardsMap = new Map();
      if (orderRewardsRes.order_rewards) {
        orderRewardsRes.order_rewards.forEach((reward: any) => {
          orderRewardsMap.set(reward.order_id, reward);
        });
      }
      
      // Fetch transaction history for reward payments
      const txHistoryRes = await fetchAPI(`/mychain/mychain/v1/transaction-history/${userAddress}`);
      
      // Get current LC price (for reference)
      const lcPriceInMC = 0.0001; // Initial LC price, would need historical data for accurate past prices
      
      const rewardTxs = (txHistoryRes.transactions || [])
        .filter((tx: any) => tx.type === 'dex_reward_distribution')
        .map((tx: any) => {
          const lcAmount = parseFloat(tx.amount[0]?.amount || '0') / 1000000;
          // For historical accuracy, we'd need price at tx time, using current prices as approximation
          const lcPrice = lcPriceInMC; // LC price in MC
          const mcPriceUSD = mcPrice; // MC price in TUSD
          const valueInTUSD = lcAmount * lcPrice * mcPriceUSD;
          
          return {
            timestamp: new Date(tx.timestamp).toLocaleString(),
            amount: lcAmount,
            orderId: tx.metadata || 'N/A',
            blockHeight: parseInt(tx.height),
            lcPriceAtTime: lcPrice,
            mcPriceAtTime: mcPriceUSD,
            valueInTUSD: valueInTUSD
          };
        });
      
      const totalRewardsSum = rewardTxs.reduce((sum: number, tx: any) => sum + tx.amount, 0);
      console.log('DEBUG: Reward transactions found:', rewardTxs.length);
      console.log('DEBUG: First few rewards:', rewardTxs.slice(0, 3));
      console.log('DEBUG: Total rewards sum (LC):', totalRewardsSum);
      console.log('DEBUG: Total rewards sum (ulc):', totalRewardsSum * 1000000);
      
      setRewardHistory(rewardTxs);
      
      // Process positions
      const processedPositions = userOrders.map((order: any) => {
        const price = parseFloat(order.price.amount) / 1000000;
        const amount = parseFloat(order.amount.amount) / 1000000;
        const filled = parseFloat(order.filled_amount.amount) / 1000000;
        const remaining = amount - filled;
        const value = remaining * price;
        
        // Calculate minimum value for rewards
        const minimumValue = 0.000001 * 8760 * 100 / currentAPR;
        
        // Determine eligibility
        let isEligible = true;
        let eligibilityReason = '';
        
        if (value < minimumValue) {
          isEligible = false;
          eligibilityReason = `Order too small (min: $${minimumValue.toFixed(2)})`;
        } else if (remaining === 0) {
          isEligible = false;
          eligibilityReason = 'Order fully filled';
        }
        
        
        // Get order reward info from backend
        const orderRewardInfo = orderRewardsMap.get(order.id);
        
        // Get tier from backend order reward info
        let tier = 1;
        if (orderRewardInfo && orderRewardInfo.tier_id) {
          tier = orderRewardInfo.tier_id;
        }
        
        // Get actual spread multiplier from backend
        let spreadMultiplier = 1.0;
        let bonusType = '';
        
        if (orderRewardInfo && orderRewardInfo.spread_multiplier) {
          const backendMultiplier = parseFloat(orderRewardInfo.spread_multiplier);
          if (backendMultiplier > 0) {
            spreadMultiplier = backendMultiplier;
            // Determine bonus type based on multiplier value
            if (spreadMultiplier >= 2.0) {
              bonusType = 'Spread -75%';
            } else if (spreadMultiplier >= 1.5) {
              bonusType = 'Spread -50%';
            } else if (spreadMultiplier >= 1.3) {
              bonusType = 'Spread -25%';
            } else if (spreadMultiplier >= 1.2) {
              bonusType = 'Price +2%';
            } else if (spreadMultiplier > 1.0) {
              bonusType = 'Spread Bonus';
            }
          }
        }
        
        // If no stored multiplier, calculate potential bonus for display
        let potentialMultiplier = 1.0;
        let potentialBonusType = '';
        if (spreadMultiplier === 1.0) {
          // Get best bid and ask from order book
          const buyOrders = orderBookRes.buy_orders || [];
          const sellOrders = orderBookRes.sell_orders || [];
          const bestBid = buyOrders.length > 0 ? parseFloat(buyOrders[0].price.amount) / 1000000 : 0;
          const bestAsk = sellOrders.length > 0 ? parseFloat(sellOrders[0].price.amount) / 1000000 : 0;
          
          if (order.is_buy && bestAsk > 0) {
            // Calculate spread reduction for buy orders
            const currentSpread = bestBid > 0 ? (bestAsk - bestBid) / bestBid : 1;
            const newSpread = (bestAsk - price) / price;
            const spreadReduction = currentSpread > 0 ? (currentSpread - newSpread) / currentSpread : 0;
            
            if (spreadReduction >= 0.75) {
              potentialMultiplier = 2.0;
              potentialBonusType = 'Spread -75%';
            } else if (spreadReduction >= 0.50) {
              potentialMultiplier = 1.5;
              potentialBonusType = 'Spread -50%';
            } else if (spreadReduction >= 0.25) {
              potentialMultiplier = 1.3;
              potentialBonusType = 'Spread -25%';
            } else if (spreadReduction >= 0.05) {
              potentialMultiplier = 1.1;
              potentialBonusType = 'Spread -5%';
            }
          } else if (!order.is_buy && sellOrders.length > 0) {
            // Calculate average ask price
            let totalValue = 0;
            let totalAmount = 0;
            sellOrders.forEach((s: any) => {
              const sellPrice = parseFloat(s.price.amount) / 1000000;
              const sellAmount = parseFloat(s.amount.amount) / 1000000 - parseFloat(s.filled_amount.amount) / 1000000;
              if (sellAmount > 0) {
                totalValue += sellPrice * sellAmount;
                totalAmount += sellAmount;
              }
            });
            const avgAsk = totalAmount > 0 ? totalValue / totalAmount : 0;
            
            if (avgAsk > 0 && price > avgAsk) {
              const priceAboveAvg = (price - avgAsk) / avgAsk;
              if (priceAboveAvg >= 0.10) {
                potentialMultiplier = 1.5;
                potentialBonusType = 'Price +10%';
              } else if (priceAboveAvg >= 0.05) {
                potentialMultiplier = 1.3;
                potentialBonusType = 'Price +5%';
              } else if (priceAboveAvg >= 0.02) {
                potentialMultiplier = 1.2;
                potentialBonusType = 'Price +2%';
              } else {
                potentialMultiplier = 1.1;
                potentialBonusType = 'Above Avg';
              }
            }
          }
        }
        
        // Calculate hourly reward with multiplier
        const baseHourlyReward = isEligible ? (value * currentAPR / 100 / 8760) : 0;
        const hourlyReward = baseHourlyReward * spreadMultiplier;
        
        // Check if order is actually receiving rewards from backend
        // If we expect rewards but orderRewardInfo shows no accumulated rewards after time has passed,
        // it might be due to volume caps
        if (isEligible && hourlyReward > 0 && orderRewardInfo) {
          const orderAge = Date.now() / 1000 - orderRewardInfo.start_time;
          const expectedMinRewards = orderAge > 3600 ? 1 : 0; // After 1 hour, should have some rewards
          
          if (orderAge > 3600 && (!orderRewardInfo.total_rewards || orderRewardInfo.total_rewards === "0")) {
            isEligible = false;
            eligibilityReason = 'Exceeds tier volume cap';
          }
        }
        
        // Calculate total hourly rewards for all user's orders
        let totalUserHourlyRewards = 0;
        let orderDetails: any[] = [];
        userOrders.forEach((o: any) => {
          const oPrice = parseFloat(o.price.amount) / 1000000;
          const oAmount = parseFloat(o.amount.amount) / 1000000;
          const oFilled = parseFloat(o.filled_amount.amount) / 1000000;
          const oRemaining = oAmount - oFilled;
          const oValue = oRemaining * oPrice;
          if (oValue > 0) {
            const oHourly = oValue * currentAPR / 100 / 8760;
            totalUserHourlyRewards += oHourly;
            orderDetails.push({ id: o.id, value: oValue, hourly: oHourly });
          }
        });
        
        if (order.id === '5') {
          console.log('Order calculation details:', {
            orderDetails,
            totalUserHourlyRewards,
            totalUserHourlyRewardsUlc: totalUserHourlyRewards * 1000000,
            currentAPR
          });
        }
        
        // Calculate this order's share of total rewards
        const orderShare = totalUserHourlyRewards > 0 ? hourlyReward / totalUserHourlyRewards : 0;
        
        // Since rewards are distributed as a lump sum, we need to estimate this order's portion
        // based on its hourly reward rate compared to the total
        const totalRewardsEarned = (() => {
          if (rewardTxs.length === 0 || hourlyReward === 0) return 0;
          
          // Sum all reward transactions and multiply by this order's share
          const totalUserRewards = rewardTxs.reduce((sum: number, tx: any) => sum + tx.amount, 0);
          const orderRewards = totalUserRewards * orderShare;
          
          if (order.id === '5') {
            console.log('DEBUG Order 5:', {
              hourlyReward,
              hourlyRewardUlc: hourlyReward * 1000000,
              totalUserHourlyRewards,
              totalUserHourlyRewardsUlc: totalUserHourlyRewards * 1000000,
              orderShare,
              orderSharePct: (orderShare * 100).toFixed(1) + '%',
              totalUserRewards,
              totalUserRewardsUlc: totalUserRewards * 1000000,
              orderRewards,
              orderRewardsUlc: orderRewards * 1000000,
              rewardTxsCount: rewardTxs.length
            });
          }
          
          return orderRewards;
        })();
        
        // Calculate individual reward payments for this order
        const orderRewardPayments = rewardTxs.map((tx: any) => ({
          ...tx,
          amount: tx.amount * orderShare
        }));
        
        const result = {
          orderId: order.id,
          pairId: order.pair_id,
          isBuy: order.is_buy,
          price,
          amount,
          filled,
          value,
          placedAt: formatUnixTimestamp(order.created_at),
          lastRewardAt: rewardTxs.length > 0 ? 
            rewardTxs[0].timestamp : undefined,
          totalRewardsEarned,
          isEligible,
          eligibilityReason,
          tier,
          hourlyReward,
          spreadMultiplier,
          bonusType,
          potentialMultiplier,
          potentialBonusType,
          rewardPayments: orderRewardPayments
        };
        
        if (order.id === '5') {
          console.log('Order 5 final result:', {
            totalRewardsEarnedLC: result.totalRewardsEarned,
            totalRewardsEarnedUlc: result.totalRewardsEarned * 1000000
          });
        }
        
        return result;
      });
      
      setPositions(processedPositions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching liquidity positions:', error);
      setLoading(false);
    }
  };

  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  const totalHourlyRewards = positions.reduce((sum, pos) => sum + pos.hourlyReward, 0);
  const totalEarned = positions.reduce((sum, pos) => sum + pos.totalRewardsEarned, 0);
  const actualTotalEarned = rewardHistory.reduce((sum, tx) => sum + tx.amount, 0);

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">💎 Your Liquidity Positions</h2>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Position Value</p>
          <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-400">Hourly LC Rewards</p>
          <p className="text-2xl font-bold text-green-300">{totalHourlyRewards.toFixed(6)} LC</p>
          <p className="text-xs text-gray-400 mt-1">≈ ${(totalHourlyRewards * 0.0001 * mcPrice).toFixed(6)} TUSD/hr</p>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <p className="text-sm text-purple-400">Total Earned</p>
          <p className="text-2xl font-bold text-purple-300">{actualTotalEarned.toFixed(6)} LC</p>
          <p className="text-xs text-gray-400 mt-1">≈ ${(actualTotalEarned * 0.0001 * mcPrice).toFixed(6)} TUSD</p>
          {actualTotalEarned > 0 && actualTotalEarned < 0.001 && (
            <p className="text-xs text-yellow-400 mt-1">({(actualTotalEarned * 1000000).toFixed(0)} ulc total)</p>
          )}
        </div>
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">Annual Rate</p>
          <p className="text-2xl font-bold text-blue-300">{currentAPR.toFixed(1)}%</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-4 border-b border-gray-700">
        <button
          onClick={() => setSelectedTab('active')}
          className={`pb-2 px-1 font-medium transition-colors ${
            selectedTab === 'active' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Active Positions ({positions.length})
        </button>
        <button
          onClick={() => setSelectedTab('history')}
          className={`pb-2 px-1 font-medium transition-colors ${
            selectedTab === 'history' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Reward History ({rewardHistory.length})
        </button>
      </div>

      {/* Eligibility Summary */}
      {selectedTab === 'active' && positions.length > 0 && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="text-gray-400">Eligible:</span>
            <span className="font-bold text-green-400">
              {positions.filter(p => p.isEligible).length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">✗</span>
            <span className="text-gray-400">Ineligible:</span>
            <span className="font-bold text-red-400">
              {positions.filter(p => !p.isEligible).length}
            </span>
          </div>
          <div className="flex-1 text-right text-gray-400">
            <span>Total Value Earning: </span>
            <span className="font-bold text-white">
              ${positions.filter(p => p.isEligible).reduce((sum, p) => sum + p.value, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Active Positions */}
      {selectedTab === 'active' && (
        <div className="space-y-4">
          {positions.length > 0 ? (
            positions.map((position) => (
              <div 
                key={position.orderId} 
                className={`border rounded-lg p-4 transition-all ${
                  position.isEligible 
                    ? 'bg-gray-700/30 border-gray-600 hover:border-gray-500' 
                    : 'bg-red-900/10 border-red-500/50 opacity-75'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Order Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        position.isBuy ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {position.isBuy ? 'BUY' : 'SELL'}
                      </span>
                      <span className="text-lg font-semibold">
                        Order #{position.orderId}
                      </span>
                      <span className="text-sm text-gray-400">
                        Tier {position.tier}
                      </span>
                      {position.spreadMultiplier > 1 && (
                        <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
                          <span>🎯</span>
                          <span>{position.spreadMultiplier}x</span>
                          <span className="text-gray-400">({position.bonusType})</span>
                        </span>
                      )}
                      {position.spreadMultiplier === 1 && position.potentialMultiplier > 1 && (
                        <span className="text-xs bg-gray-600/30 text-gray-400 px-2 py-1 rounded flex items-center gap-1" title="This order was placed before spread bonuses were implemented">
                          <span>📊</span>
                          <span>Potential {position.potentialMultiplier}x</span>
                          <span className="text-gray-500">({position.potentialBonusType})</span>
                        </span>
                      )}
                      {position.isEligible ? (
                        <span className="text-xs bg-green-600/30 text-green-400 px-2 py-1 rounded flex items-center gap-1">
                          <span>✓</span>
                          <span>EARNING REWARDS</span>
                        </span>
                      ) : (
                        <span className="text-xs bg-red-600/30 text-red-400 px-2 py-1 rounded flex items-center gap-1">
                          <span>✗</span>
                          <span>NOT EARNING</span>
                        </span>
                      )}
                    </div>

                    {/* Eligibility Reason */}
                    {!position.isEligible && position.eligibilityReason && (
                      <div className="text-xs text-red-400 mb-2">
                        <span className="font-medium">Reason: </span>
                        {position.eligibilityReason}
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-400 block">Price</span>
                        <span className="font-medium">${position.price.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Amount</span>
                        <span className="font-medium">{position.amount.toFixed(6)} MC</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Filled</span>
                        <span className="font-medium">
                          {((position.filled / position.amount) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Value</span>
                        <span className="font-medium">${position.value.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Placed</span>
                        <span className="font-medium text-xs">{position.placedAt}</span>
                      </div>
                    </div>

                    {/* Rewards Info */}
                    <div className="bg-gray-800/50 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400 block text-xs">
                          Hourly Reward {position.spreadMultiplier > 1 ? `(${currentAPR}% × ${position.spreadMultiplier}x)` : ''}
                        </span>
                        <span className={`font-bold ${position.isEligible ? 'text-green-400' : 'text-red-400'}`}>
                          {position.hourlyReward.toFixed(6)} LC/hr
                        </span>
                        {position.hourlyReward > 0 && (
                          <span className="text-xs text-yellow-400 block">
                            ({(position.hourlyReward * 1000000).toFixed(1)} ulc/hr)
                          </span>
                        )}
                        <span className="text-xs text-gray-400 block">
                          ≈ ${(position.hourlyReward * 0.0001 * mcPrice).toFixed(10)}/hr
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Daily: {(position.hourlyReward * 24).toFixed(4)} LC
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Yearly: {(position.hourlyReward * 8760).toFixed(2)} LC
                        </span>
                        {position.spreadMultiplier > 1 && (
                          <span className="text-xs text-yellow-400 block mt-1">
                            Effective APR: {(currentAPR * position.spreadMultiplier).toFixed(0)}%
                          </span>
                        )}
                        {position.spreadMultiplier === 1 && position.potentialMultiplier > 1 && (
                          <span className="text-xs text-gray-500 block mt-1">
                            (Could earn {(currentAPR * position.potentialMultiplier).toFixed(0)}% APR with spread bonus)
                          </span>
                        )}
                      </div>
                      <div>
                        <div 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleOrderExpanded(position.orderId)}
                        >
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            Total Earned 
                            <span className="text-xs">
                              {expandedOrders.has(position.orderId) ? '▼' : '▶'}
                            </span>
                          </span>
                          {position.totalRewardsEarned > 0 ? (
                            <>
                              <span className="font-bold text-purple-400">
                                {position.totalRewardsEarned.toFixed(6)} LC
                              </span>
                              <span className="text-xs text-yellow-400 block">
                                ({(position.totalRewardsEarned * 1000000).toFixed(1)} ulc)
                              </span>
                              <span className="text-xs text-gray-400 block">
                                ≈ ${(position.totalRewardsEarned * 0.0001 * mcPrice).toFixed(8)}
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-gray-500">
                              0 LC
                            </span>
                          )}
                        </div>
                        
                        {/* Expanded reward payments */}
                        {expandedOrders.has(position.orderId) && position.rewardPayments && position.rewardPayments.length > 0 && (
                          <div className="mt-2 ml-2 text-xs space-y-1 border-l-2 border-purple-500/30 pl-3">
                            <div className="text-gray-500 mb-1">
                              Share: {((position.hourlyReward * 1000000 / 39) * 100).toFixed(1)}% of total rewards
                              <br />
                              {position.rewardPayments.length} payments = {(position.totalRewardsEarned * 1000000).toFixed(1)} ulc total
                            </div>
                            {position.rewardPayments.slice(0, 10).map((payment, idx) => (
                              <div key={idx} className="text-gray-400">
                                <span className="text-gray-500">{payment.timestamp}</span>
                                <span className="text-purple-400 ml-2">
                                  ~{(payment.amount * 1000000).toFixed(1)} ulc
                                </span>
                                <span className="text-gray-600 ml-1">
                                  (Block #{payment.blockHeight})
                                </span>
                              </div>
                            ))}
                            {position.rewardPayments.length > 10 && (
                              <div className="text-gray-500 italic mt-1">
                                ... and {position.rewardPayments.length - 10} more payments
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2 italic">
                              Note: Individual amounts are estimates based on current order share
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400 block text-xs">Last Reward</span>
                        <span className="text-xs">
                          {position.lastRewardAt || 'Never'}
                        </span>
                        {!position.lastRewardAt && position.isEligible && (
                          <span className="text-xs text-yellow-400 block">
                            (Paid hourly)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Eligibility Warning */}
                    {!position.isEligible && (
                      <div className="mt-2 bg-red-900/30 border border-red-500/30 rounded p-2">
                        <p className="text-red-400 text-sm">
                          ⚠️ {position.eligibilityReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cancel Button */}
                  <button
                    onClick={() => onCancelOrder(position.orderId)}
                    className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <p className="text-gray-400">No active liquidity positions</p>
              <p className="text-sm text-gray-500 mt-2">
                Place orders on the DEX to start earning liquidity rewards
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">📊 Position Information</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Orders earn {currentAPR}% APR paid in LC tokens</li>
              <li>• Rewards distributed every 100 blocks (~8.3 minutes)</li>
              <li>• Minimum order value: ${(0.000001 * 8760 * 100 / currentAPR).toFixed(2)}</li>
              <li>• Orders outside tier volume caps don't earn rewards</li>
              <li>• Cancel anytime - earned rewards are automatically sent</li>
            </ul>
          </div>
        </div>
      )}

      {/* Reward History */}
      {selectedTab === 'history' && (
        <div className="space-y-2">
          {rewardHistory.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600 text-left">
                      <th className="p-2 text-gray-400">Time</th>
                      <th className="p-2 text-gray-400">Block</th>
                      <th className="p-2 text-gray-400">LC Amount</th>
                      <th className="p-2 text-gray-400">Value at Time</th>
                      <th className="p-2 text-gray-400">LC Price</th>
                      <th className="p-2 text-gray-400">Order ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewardHistory.map((payment, index) => (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30">
                        <td className="p-2">{payment.timestamp}</td>
                        <td className="p-2">#{payment.blockHeight}</td>
                        <td className="p-2 text-green-400 font-medium">
                          {payment.amount.toFixed(6)} LC
                        </td>
                        <td className="p-2 text-yellow-400 font-medium">
                          ${payment.valueInTUSD.toFixed(6)} TUSD
                        </td>
                        <td className="p-2 text-gray-400 text-xs">
                          {payment.lcPriceAtTime.toFixed(6)} MC<br/>
                          @ ${payment.mcPriceAtTime.toFixed(6)}
                        </td>
                        <td className="p-2 text-gray-400">{payment.orderId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded">
                <div className="space-y-1">
                  <p className="text-sm text-green-400">
                    Total rewards received: {rewardHistory.reduce((sum, p) => sum + p.amount, 0).toFixed(6)} LC
                  </p>
                  <p className="text-sm text-yellow-400">
                    Total value at time of payment: ${rewardHistory.reduce((sum, p) => sum + p.valueInTUSD, 0).toFixed(6)} TUSD
                  </p>
                  <p className="text-xs text-gray-400">
                    Note: Values shown are at the time each reward was distributed
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <p className="text-gray-400">No reward payments yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Rewards are distributed every 100 blocks to eligible positions
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};