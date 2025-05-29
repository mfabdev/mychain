import React, { useState, useEffect } from 'react';
import { fetchBalance, fetchUserRewards, formatAmount } from '../utils/api';
import { Balance, UserRewards } from '../types';

interface UserDashboardProps {
  address: string;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ address }) => {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [lcBalanceHistory, setLcBalanceHistory] = useState<{timestamp: number, balance: string}[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Validate address format before making API calls
        if (!address || address.length < 20) {
          throw new Error('Invalid address format');
        }

        const [balanceData, rewardsData] = await Promise.all([
          fetchBalance(address).catch(err => {
            console.error('Balance fetch failed:', err);
            return [];
          }),
          fetchUserRewards(address).catch(err => {
            console.error('Rewards fetch failed:', err);
            return { pending_lc: { amount: '0' }, claimed_lc: { amount: '0' } };
          })
        ]);
        
        setBalances(balanceData);
        setRewards({
          pendingLc: rewardsData.pending_lc?.amount || '0',
          claimedLc: rewardsData.claimed_lc?.amount || '0'
        });

        // Track LC balance history for staking rewards
        const currentLcBalance = balanceData.find(b => b.denom === 'alc')?.amount || '0';
        setLcBalanceHistory(prev => {
          const newEntry = { timestamp: Date.now(), balance: currentLcBalance };
          const updated = [...prev, newEntry];
          // Keep only last 20 entries
          return updated.slice(-20);
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setBalances([]);
        setRewards(null);
        setLoading(false);
      }
    };

    if (address) {
      fetchUserData();
    }
  }, [address]);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Your Account</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Balances</h3>
        <div className="space-y-2">
          {balances.map((balance) => (
            <div key={balance.denom} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">
                {balance.denom.toUpperCase()}
              </span>
              <span className="font-semibold text-gray-900">
                {formatAmount(balance.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {rewards && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">DEX Rewards</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 mb-1">Pending Rewards</p>
              <p className="text-xl font-bold text-green-700">
                {formatAmount(rewards.pendingLc)} LC
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Claimed Rewards</p>
              <p className="text-xl font-bold text-blue-700">
                {formatAmount(rewards.claimedLc)} LC
              </p>
            </div>
          </div>
        </div>
      )}

      {lcBalanceHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">LC Balance History (Staking Rewards)</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            {lcBalanceHistory.slice().reverse().map((entry, index) => {
              const prevBalance = index < lcBalanceHistory.length - 1 
                ? lcBalanceHistory[lcBalanceHistory.length - 2 - index]?.balance || '0'
                : '0';
              const balanceChange = parseInt(entry.balance) - parseInt(prevBalance);
              const isIncrease = balanceChange > 0;
              
              return (
                <div key={entry.timestamp} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">
                      {formatAmount(entry.balance)} ALC
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {isIncrease && balanceChange > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        +{formatAmount(balanceChange.toString())} ALC
                      </p>
                      <p className="text-xs text-green-500">Staking Reward</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};