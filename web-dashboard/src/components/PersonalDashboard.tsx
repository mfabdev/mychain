import React, { useState, useEffect } from 'react';
import { useKeplr } from '../hooks/useKeplr';
import { fetchAPI } from '../utils/api';
import { formatCoin } from '../utils/formatters';
import { getTerminalServerEndpoint } from '../utils/endpoints';

interface Balance {
  denom: string;
  amount: string;
}

interface DexOrder {
  id: string;
  pair_id: string;
  is_buy: boolean;
  price: { amount: string; denom: string };
  amount: { amount: string; denom: string };
  filled_amount: { amount: string; denom: string };
  maker: string;
}

interface UserRewards {
  total_rewards: string;
  claimed_rewards: string;
  unclaimed_rewards: string;
}

export const PersonalDashboard: React.FC = () => {
  const { address } = useKeplr();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [delegatedLC, setDelegatedLC] = useState<string>('0');
  const [pendingRewards, setPendingRewards] = useState<string>('0');
  const [dexOrders, setDexOrders] = useState<DexOrder[]>([]);
  const [dexRewards, setDexRewards] = useState<UserRewards | null>(null);
  const [loading, setLoading] = useState(false);
  const [inflationAPR, setInflationAPR] = useState<string>('0');
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch balances
        const balanceResponse = await fetchAPI(`/cosmos/bank/v1beta1/balances/${address}`);
        if (balanceResponse?.balances) {
          setBalances(balanceResponse.balances);
        }

        // Fetch delegations
        const delegationResponse = await fetchAPI(`/cosmos/staking/v1beta1/delegations/${address}`);
        if (delegationResponse?.delegation_responses) {
          const totalDelegated = delegationResponse.delegation_responses.reduce((sum: number, del: any) => {
            return sum + parseInt(del.balance.amount || '0');
          }, 0);
          setDelegatedLC((totalDelegated / 1_000_000).toFixed(6));
        }

        // Fetch pending staking rewards
        const rewardsResponse = await fetchAPI(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`);
        if (rewardsResponse?.total) {
          const lcReward = rewardsResponse.total.find((r: any) => r.denom === 'ulc');
          if (lcReward) {
            setPendingRewards((parseFloat(lcReward.amount) / 1_000_000).toFixed(6));
          }
        }

        // Fetch DEX orders
        const orderBookResponse = await fetchAPI('/mychain/dex/v1/order-book/1');
        if (orderBookResponse) {
          const userBuyOrders = (orderBookResponse.buy_orders || []).filter((o: DexOrder) => o.maker === address);
          const userSellOrders = (orderBookResponse.sell_orders || []).filter((o: DexOrder) => o.maker === address);
          setDexOrders([...userBuyOrders, ...userSellOrders]);
        }

        // Fetch DEX rewards
        const dexRewardsResponse = await fetchAPI(`/mychain/dex/v1/user-rewards/${address}`);
        if (dexRewardsResponse?.reward) {
          setDexRewards(dexRewardsResponse.reward);
        }

        // Fetch current inflation rate
        const inflationResponse = await fetchAPI('/cosmos/mint/v1beta1/inflation');
        if (inflationResponse?.inflation) {
          setInflationAPR((parseFloat(inflationResponse.inflation) * 100).toFixed(2));
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    const interval = setInterval(fetchUserData, 10000);
    return () => clearInterval(interval);
  }, [address]);

  if (!address) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">My Portfolio</h2>
        <p className="text-gray-400">Connect your wallet to view your holdings</p>
      </div>
    );
  }

  const getBalanceAmount = (denom: string): string => {
    const balance = balances.find(b => b.denom === denom);
    if (!balance) return '0';
    return formatCoin({ denom, amount: balance.amount });
  };

  const calculateDexLiquidity = (): string => {
    let totalValue = 0;
    dexOrders.forEach(order => {
      const remaining = parseInt(order.amount.amount) - parseInt(order.filled_amount.amount);
      const price = parseInt(order.price.amount) / 1_000_000;
      const amount = remaining / 1_000_000;
      totalValue += price * amount;
    });
    return totalValue.toFixed(2);
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrder(orderId);
    try {
      const response = await fetch(`${getTerminalServerEndpoint()}/execute-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cancel-order',
          orderId: orderId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the order from the list
        setDexOrders(dexOrders.filter(order => order.id !== orderId));
      } else {
        alert(`Failed to cancel order: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrder(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Holdings Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">My Holdings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">LiquidityCoin (LC)</span>
              <span className="text-xl">💧</span>
            </div>
            <div className="text-2xl font-bold">{getBalanceAmount('ulc')}</div>
            <div className="text-sm text-gray-400 mt-1">
              Staked: {delegatedLC} LC
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">MainCoin (MC)</span>
              <span className="text-xl">🪙</span>
            </div>
            <div className="text-2xl font-bold">{getBalanceAmount('umc')}</div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">TestUSD (TUSD)</span>
              <span className="text-xl">💵</span>
            </div>
            <div className="text-2xl font-bold">{getBalanceAmount('utusd')}</div>
          </div>
        </div>
      </div>

      {/* Rewards Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">My Rewards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Staking Rewards</span>
              <span className="text-sm text-green-400">{inflationAPR}% APR</span>
            </div>
            <div className="text-xl font-bold">{pendingRewards} LC</div>
            <div className="text-sm text-gray-400 mt-1">Pending rewards</div>
            {parseFloat(delegatedLC) > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                Earning ~{(parseFloat(delegatedLC) * parseFloat(inflationAPR) / 100 / 365).toFixed(6)} LC/day
              </div>
            )}
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">DEX Liquidity Rewards</span>
              <span className="text-sm text-green-400">100% APR</span>
            </div>
            <div className="text-xl font-bold">
              {dexRewards ? formatCoin({ denom: 'ulc', amount: dexRewards.total_rewards }) : '0 LC'}
            </div>
            <div className="text-sm text-gray-400 mt-1">Total earned</div>
            {dexOrders.length > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                Active orders: {dexOrders.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DEX Positions */}
      {dexOrders.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">DEX Positions</h2>
          <div className="space-y-3">
            {dexOrders.map((order) => {
              const remaining = parseInt(order.amount.amount) - parseInt(order.filled_amount.amount);
              const percentFilled = (parseInt(order.filled_amount.amount) / parseInt(order.amount.amount)) * 100;
              
              return (
                <div key={order.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.is_buy ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {order.is_buy ? 'BUY' : 'SELL'}
                        </span>
                        <span className="text-gray-300">MC/TUSD</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Price: {formatCoin(order.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {formatCoin({ denom: order.amount.denom, amount: remaining.toString() })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {percentFilled.toFixed(1)}% filled
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Order ID: {order.id}
                    </div>
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrder === order.id}
                      className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                        cancellingOrder === order.id
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {cancellingOrder === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total liquidity value:</span>
              <span className="font-medium">${calculateDexLiquidity()} TUSD</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3">Portfolio Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Total LC</div>
            <div className="font-medium">
              {(parseFloat(getBalanceAmount('ulc').split(' ')[0]) + parseFloat(delegatedLC)).toFixed(6)} LC
            </div>
          </div>
          <div>
            <div className="text-gray-400">Rewards Rate</div>
            <div className="font-medium text-green-400">
              {parseFloat(delegatedLC) > 0 ? inflationAPR : '0'}% + {dexOrders.length > 0 ? '100' : '0'}%
            </div>
          </div>
          <div>
            <div className="text-gray-400">DEX Liquidity</div>
            <div className="font-medium">${calculateDexLiquidity()}</div>
          </div>
          <div>
            <div className="text-gray-400">Total Rewards</div>
            <div className="font-medium">
              {(parseFloat(pendingRewards) + 
                (dexRewards ? parseInt(dexRewards.total_rewards) / 1_000_000 : 0)).toFixed(6)} LC
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};