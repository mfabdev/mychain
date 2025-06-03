import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { useKeplr } from '../hooks/useKeplr';
import { UserIcon, ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface PurchaseRecord {
  segmentNumber: number;
  tokensBought: string;
  userTokens: string;
  devAllocation: string;
  pricePerToken: string;
  cost: string;
  isComplete: boolean;
  txHash: string;
  blockHeight: number;
  timestamp: string;
}

interface UserHistory {
  address: string;
  purchases: PurchaseRecord[];
  totalTokensBought: string;
  totalSpent: string;
}

export const UserPurchaseHistory: React.FC = () => {
  const { address, isConnected } = useKeplr();
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserHistory();
    }
  }, [isConnected, address]);

  const fetchUserHistory = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchAPI(`/mychain/maincoin/v1/user_history/${address}`);
      if (response && response.user_history) {
        setUserHistory(response.user_history);
      } else {
        setUserHistory(null);
      }
    } catch (err) {
      console.error('Failed to fetch user history:', err);
      setError('Failed to load purchase history');
      // Create mock data for demonstration
      setUserHistory({
        address,
        purchases: [],
        totalTokensBought: '0',
        totalSpent: '0',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: string): string => {
    const num = parseFloat(value) / 1_000_000;
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 6 
    });
  };

  const formatPrice = (value: string): string => {
    const num = parseFloat(value);
    return `$${num.toFixed(7)}`;
  };

  const formatDate = (timestamp: string): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <UserIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Connect your wallet to view purchase history</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-blue-400" />
          Your Purchase History
        </h3>
        {userHistory && userHistory.purchases.length > 0 && (
          <button
            onClick={fetchUserHistory}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Refresh
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading your purchase history...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!loading && userHistory && (
        <>
          {/* User Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-4 w-4 text-blue-400" />
                <p className="text-sm text-gray-400">Total Purchases</p>
              </div>
              <p className="text-xl font-bold text-white">
                {userHistory.purchases.length}
              </p>
            </div>

            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Tokens Acquired</p>
              <p className="text-xl font-bold text-green-400">
                {formatNumber(userHistory.totalTokensBought)} MC
              </p>
              <p className="text-xs text-gray-500">
                (after dev allocation)
              </p>
            </div>

            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CurrencyDollarIcon className="h-4 w-4 text-purple-400" />
                <p className="text-sm text-gray-400">Total Spent</p>
              </div>
              <p className="text-xl font-bold text-purple-400">
                ${formatNumber(userHistory.totalSpent)}
              </p>
            </div>
          </div>

          {/* Average Price */}
          {userHistory.purchases.length > 0 && (
            <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-400">
                Average Price Paid: 
                <span className="ml-2 text-white font-medium">
                  ${(parseFloat(userHistory.totalSpent) / parseFloat(userHistory.totalTokensBought)).toFixed(7)}/MC
                </span>
              </p>
            </div>
          )}

          {/* Purchase List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Purchase History</h4>
            
            {userHistory.purchases.length === 0 ? (
              <div className="text-center py-8 bg-gray-700/20 rounded-lg">
                <p className="text-gray-500">No purchases recorded yet</p>
                <p className="text-xs text-gray-600 mt-2">
                  Buy MainCoin to see your purchase history here
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {userHistory.purchases.map((purchase, index) => (
                  <div
                    key={`${purchase.txHash}-${index}`}
                    className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Segment {purchase.segmentNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(purchase.timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-400">
                          +{formatNumber(purchase.userTokens)} MC
                        </p>
                        <p className="text-xs text-gray-500">
                          ${formatNumber(purchase.cost)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-1 text-white">{formatPrice(purchase.pricePerToken)}/MC</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Dev Fee:</span>
                        <span className="ml-1 text-purple-400">
                          {purchase.devAllocation === '0' ? '0' : formatNumber(purchase.devAllocation)} MC
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded ${
                        purchase.isComplete 
                          ? 'bg-green-600/30 text-green-400' 
                          : 'bg-yellow-600/30 text-yellow-400'
                      }`}>
                        {purchase.isComplete ? 'Completed Segment' : 'Partial Purchase'}
                      </span>
                      {purchase.txHash && (
                        <a
                          href={`#/tx/${purchase.txHash}`}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          View TX →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export Option */}
          {userHistory.purchases.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                className="text-sm text-blue-400 hover:text-blue-300"
                onClick={() => {
                  const data = JSON.stringify(userHistory, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `maincoin-purchases-${address}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export Purchase History (JSON)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};