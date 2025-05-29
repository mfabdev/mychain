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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [balanceData, rewardsData] = await Promise.all([
          fetchBalance(address),
          fetchUserRewards(address)
        ]);
        setBalances(balanceData);
        setRewards(rewardsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
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
        <div>
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
    </div>
  );
};