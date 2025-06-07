import React, { useState, useEffect } from 'react';
import { fetchBalance, fetchUserRewards, formatAmount } from '../utils/api';
import { Balance, UserRewards } from '../types';
import { TransactionHistory } from './TransactionHistory';

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
        setLoading(false);
      }
    };

    if (address) {
      fetchUserData();
      const interval = setInterval(fetchUserData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [address]);

  const getCoinBalance = (denom: string): string => {
    const balance = balances.find(b => b.denom === denom);
    return balance?.amount || '0';
  };

  const hasStakedBalance = parseInt(getCoinBalance('alc')) > 0;

  const calculateDailyRewards = (): string => {
    const stakedAmount = parseInt(getCoinBalance('alc'));
    if (stakedAmount === 0) return '0';
    
    // 10% APR = 0.1 per year / 365 days
    const dailyRate = 0.1 / 365;
    const dailyRewards = (stakedAmount * dailyRate) / 1000000; // Convert from micro units
    return dailyRewards.toFixed(2);
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Your Dashboard</h2>
      
      {/* User Balances */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Your Balances</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getCoinBalance('alc') !== '0' && (
            <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-lg">
              <p className="text-sm text-blue-400 mb-1">LiquidityCoin (ALC)</p>
              <p className="text-2xl font-bold text-blue-300">
                {formatAmount(getCoinBalance('alc'), 6)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Chain: ulc</p>
            </div>
          )}
          {getCoinBalance('maincoin') !== '0' && (
            <div className="bg-purple-900/30 border border-purple-500/30 p-4 rounded-lg">
              <p className="text-sm text-purple-400 mb-1">MainCoin (MC)</p>
              <p className="text-2xl font-bold text-purple-300">
                {formatAmount(getCoinBalance('maincoin'), 6)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Chain: umc</p>
            </div>
          )}
          {getCoinBalance('testusd') !== '0' && (
            <div className="bg-green-900/30 border border-green-500/30 p-4 rounded-lg">
              <p className="text-sm text-green-400 mb-1">Test USD (TUSD)</p>
              <p className="text-2xl font-bold text-green-300">
                {formatAmount(getCoinBalance('testusd'), 6)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Chain: utestusd</p>
            </div>
          )}
          {balances.length === 0 && (
            <div className="col-span-3 text-center text-gray-400 py-8">
              No balances found. Fund your account to get started.
            </div>
          )}
        </div>
      </div>

      {/* Staking Rewards */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Staking Rewards (10% APR)</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Pending Rewards</p>
              <p className="text-xl font-bold text-gray-200">
                {rewards ? formatAmount(rewards.pendingLc, 6) : '0'} ALC
              </p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg">
              Claim Rewards
            </button>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Total Claimed</p>
              <p className="text-xl font-bold text-gray-200">
                {rewards ? formatAmount(rewards.claimedLc, 6) : '0'} ALC
              </p>
            </div>
            <div className="text-sm text-gray-400">
              <p>Rewards distributed hourly</p>
              <p>Based on staked balance</p>
            </div>
          </div>
          
          {/* Reward Calculation */}
          {hasStakedBalance && (
            <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-400 mb-2">Estimated Daily Rewards</p>
              <p className="text-lg font-bold text-blue-300">
                ~{calculateDailyRewards()} ALC
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Based on {formatAmount(getCoinBalance('alc'), 6)} ALC staked at 10% APR
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Balance History */}
      {lcBalanceHistory.length > 1 && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">ALC Balance History</h3>
          <div className="bg-gray-700/30 rounded-lg p-4 max-h-64 overflow-y-auto">
            {lcBalanceHistory.slice().reverse().map((entry, index) => {
              const prevBalance = index < lcBalanceHistory.length - 1 
                ? lcBalanceHistory[lcBalanceHistory.length - 2 - index]?.balance || '0'
                : '0';
              const balanceChange = parseInt(entry.balance) - parseInt(prevBalance);
              const isIncrease = balanceChange > 0;
              
              return (
                <div key={entry.timestamp} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">
                      {formatAmount(entry.balance, 6)} ALC
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {isIncrease && balanceChange > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-400">
                        +{formatAmount(balanceChange.toString(), 6)} ALC
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

      {/* Transaction History */}
      <div className="mt-6">
        <TransactionHistory address={address} />
      </div>
    </div>
  );
};