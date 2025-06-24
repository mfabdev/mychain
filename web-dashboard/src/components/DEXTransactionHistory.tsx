import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface Transaction {
  height: string;
  timestamp: string;
  type: string;
  description: string;
  amount: { denom: string; amount: string }[];
  from: string;
  to: string;
  metadata?: string;
}

interface Props {
  userAddress: string;
  mcPrice?: number;
}

export const DEXTransactionHistory: React.FC<Props> = ({ userAddress, mcPrice = 0.0001 }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'orders' | 'rewards' | 'trades'>('all');

  useEffect(() => {
    fetchTransactions();
  }, [userAddress]);

  const fetchTransactions = async () => {
    try {
      const response = await fetchAPI(`/mychain/mychain/v1/transaction-history/${userAddress}`);
      const allTxs = response.transactions || [];
      
      // Filter DEX-related transactions
      const dexTxs = allTxs.filter((tx: Transaction) => 
        tx.type.includes('dex') || 
        tx.type === 'create_order' || 
        tx.type === 'cancel_order' ||
        tx.type === 'trade_execution' ||
        tx.description.toLowerCase().includes('dex') ||
        tx.description.toLowerCase().includes('order') ||
        tx.description.toLowerCase().includes('liquidity')
      );
      
      setTransactions(dexTxs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'orders') return tx.type === 'create_order' || tx.type === 'cancel_order';
    if (filter === 'rewards') return tx.type === 'dex_reward_distribution';
    if (filter === 'trades') return tx.type === 'trade_execution';
    return true;
  });

  const getTransactionIcon = (type: string) => {
    if (type === 'create_order') return '📝';
    if (type === 'cancel_order') return '❌';
    if (type === 'dex_reward_distribution') return '💰';
    if (type === 'trade_execution') return '🔄';
    return '📊';
  };

  const getTransactionColor = (type: string) => {
    if (type === 'create_order') return 'text-blue-400';
    if (type === 'cancel_order') return 'text-red-400';
    if (type === 'dex_reward_distribution') return 'text-green-400';
    if (type === 'trade_execution') return 'text-yellow-400';
    return 'text-gray-400';
  };

  const formatAmount = (amounts: { denom: string; amount: string }[]) => {
    if (!amounts || amounts.length === 0) return 'N/A';
    
    return amounts.map(coin => {
      const amount = (parseInt(coin.amount) / 1000000).toFixed(6);
      const denom = coin.denom === 'ulc' ? 'LC' : 
                    coin.denom === 'umc' ? 'MC' : 
                    coin.denom === 'utusd' ? 'TUSD' : coin.denom;
      return `${amount} ${denom}`;
    }).join(', ');
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">📜 DEX Transaction History</h2>
      
      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4">
        {['all', 'orders', 'rewards', 'trades'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType as any)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              filter === filterType
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            {filter === filterType && (
              <span className="ml-2 text-xs bg-blue-500 px-2 py-0.5 rounded-full">
                {filteredTransactions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.slice(0, 50).map((tx, index) => (
            <div 
              key={index} 
              className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Transaction Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTransactionIcon(tx.type)}</span>
                    <div>
                      <span className={`font-medium ${getTransactionColor(tx.type)}`}>
                        {tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-sm text-gray-400 ml-3">
                        Block #{tx.height}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Amount: </span>
                      <span className="font-medium">{formatAmount(tx.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Time: </span>
                      <span>{new Date(tx.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {tx.description && (
                    <p className="text-sm text-gray-300 mt-2">{tx.description}</p>
                  )}

                  {/* Metadata (Order ID, etc) */}
                  {tx.metadata && (
                    <p className="text-xs text-gray-500 mt-1">
                      Details: {tx.metadata}
                    </p>
                  )}
                </div>

                {/* Transaction Value */}
                {tx.type === 'dex_reward_distribution' && (
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold text-green-400">
                      +{formatAmount(tx.amount)}
                    </p>
                    <p className="text-xs text-yellow-400">
                      ≈ ${(() => {
                        const lcAmount = tx.amount.find(a => a.denom === 'ulc');
                        if (lcAmount) {
                          const lcValue = parseInt(lcAmount.amount) / 1000000;
                          return (lcValue * 0.0001 * mcPrice).toFixed(6);
                        }
                        return '0.00';
                      })()} TUSD
                    </p>
                    <p className="text-xs text-gray-400">Reward</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-700/30 rounded-lg p-6 text-center">
            <p className="text-gray-400">No {filter !== 'all' ? filter : 'DEX'} transactions found</p>
            <p className="text-sm text-gray-500 mt-2">
              Your DEX activity will appear here
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {transactions.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-400">Total Orders</p>
            <p className="text-xl font-bold">
              {transactions.filter(tx => tx.type === 'create_order').length}
            </p>
          </div>
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-center">
            <p className="text-sm text-green-400">Reward Payments</p>
            <p className="text-xl font-bold text-green-300">
              {transactions.filter(tx => tx.type === 'dex_reward_distribution').length}
            </p>
          </div>
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-400">Total LC Earned</p>
            <p className="text-xl font-bold text-blue-300">
              {transactions
                .filter(tx => tx.type === 'dex_reward_distribution')
                .reduce((sum, tx) => {
                  const lcAmount = tx.amount.find(a => a.denom === 'ulc');
                  return sum + (lcAmount ? parseInt(lcAmount.amount) / 1000000 : 0);
                }, 0)
                .toFixed(6)} LC
            </p>
            <p className="text-sm text-yellow-400 mt-1">
              ≈ ${transactions
                .filter(tx => tx.type === 'dex_reward_distribution')
                .reduce((sum, tx) => {
                  const lcAmount = tx.amount.find(a => a.denom === 'ulc');
                  const lcValue = lcAmount ? parseInt(lcAmount.amount) / 1000000 : 0;
                  return sum + (lcValue * 0.0001 * mcPrice);
                }, 0)
                .toFixed(2)} TUSD
            </p>
          </div>
        </div>
      )}
    </div>
  );
};