import React, { useEffect, useState } from 'react';
import { useKeplr } from '../hooks/useKeplr';
import { fetchAPI } from '../utils/api';
import { formatCoin, shortenAddress, formatTimestamp } from '../utils/formatters';

interface TransactionRecord {
  tx_hash: string;
  type: string;
  description: string;
  amount: Array<{ denom: string; amount: string }>;
  from: string;
  to: string;
  height: number | string;
  timestamp: string;
}

interface TransactionHistoryProps {
  address?: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ address: addressProp }) => {
  const { address: walletAddress } = useKeplr();
  const address = addressProp || walletAddress;
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    if (address) {
      loadTransactions();
    }
  }, [address]);

  const loadTransactions = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching transactions for address:', address);
      
      // Get current block height to filter out old transactions
      const latestBlock = await fetchAPI('/cosmos/base/tendermint/v1beta1/blocks/latest');
      const currentHeight = parseInt(latestBlock.block.header.height);
      
      const response = await fetchAPI(`/mychain/mychain/v1/transaction-history/${address}?limit=1000`);
      console.log('Transaction response:', response);
      if (response && response.transactions) {
        // Simply validate timestamps and heights
        const recentTransactions = response.transactions.filter((tx: TransactionRecord) => {
          // Filter out transactions with invalid timestamps (future dates)
          const txDate = new Date(tx.timestamp);
          const now = new Date();
          if (txDate > now) return false;
          
          // Convert height to number for comparison
          const txHeight = Number(tx.height);
          
          // Only show transactions from valid blocks
          return txHeight <= currentHeight && txHeight > 0;
        });
        
        // Sort transactions by height in descending order (newest first)
        // If heights are equal, sort by timestamp
        const sortedTransactions = recentTransactions.sort((a: TransactionRecord, b: TransactionRecord) => {
          // Convert heights to numbers, handling both string and number types
          const heightA = Number(a.height);
          const heightB = Number(b.height);
          
          // First sort by height (descending)
          if (heightA !== heightB) {
            return heightB - heightA;
          }
          
          // If heights are equal, sort by timestamp (descending)
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });
        
        // Find continuous block ranges to filter out old disconnected transactions
        let filteredTransactions = sortedTransactions;
        if (sortedTransactions.length > 0) {
          // Find the highest block height
          const maxHeight = Math.max(...sortedTransactions.map((tx: TransactionRecord) => Number(tx.height)));
          
          // Filter to only include transactions that are part of a continuous range from the top
          const continuousTransactions: TransactionRecord[] = [];
          let lastHeight = maxHeight + 1;
          
          for (const tx of sortedTransactions) {
            const txHeight = Number(tx.height);
            // Only show recent transactions - within 500 blocks of current height
            // This filters out old transactions from blockchain restarts
            if (txHeight > currentHeight - 500) {
              continuousTransactions.push(tx);
            }
          }
          
          filteredTransactions = continuousTransactions;
        }
        
        // Store all transactions for "Show All" functionality
        setAllTransactions(sortedTransactions);
        // Set filtered transactions as default view
        setTransactions(showAll ? sortedTransactions : filteredTransactions);
        console.log('Set transactions:', filteredTransactions.length, 'out of', response.transactions.length);
      }
    } catch (err: any) {
      console.error('Failed to fetch transaction history:', err);
      setError('Failed to load transaction history: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receive':
        return '↓';
      case 'send':
        return '↑';
      case 'buy_maincoin':
        return '🛒';
      case 'sell_maincoin':
        return '💰';
      case 'staking_reward':
        return '🎁';
      case 'delegate':
        return '🔒';
      case 'undelegate':
        return '🔓';
      case 'dex_swap':
        return '🔄';
      case 'dex_reward_distribution':
        return '💎';
      default:
        return '•';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'receive':
      case 'staking_reward':
      case 'dex_reward_distribution':
        return 'text-green-600';
      case 'send':
      case 'fee':
        return 'text-red-600';
      case 'buy_maincoin':
      case 'delegate':
        return 'text-blue-600';
      case 'sell_maincoin':
      case 'undelegate':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  // Apply type filter
  const typeFilteredTransactions = (showAll ? allTransactions : transactions).filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  // Show only recent transactions unless "show all" is selected
  const displayedTransactions = showAll ? typeFilteredTransactions : typeFilteredTransactions.slice(0, 50);

  const transactionTypes = [
    { value: 'all', label: 'All Transactions' },
    { value: 'send', label: 'Sent' },
    { value: 'receive', label: 'Received' },
    { value: 'buy_maincoin', label: 'MainCoin Purchases' },
    { value: 'sell_maincoin', label: 'MainCoin Sales' },
    { value: 'staking_reward', label: 'Staking Rewards' },
    { value: 'dex_reward_distribution', label: 'DEX Rewards' },
    { value: 'delegate', label: 'Delegations' },
    { value: 'undelegate', label: 'Undelegations' },
  ];

  if (!address) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
        <p className="text-gray-400">Enter an address to view transaction history</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Transaction History</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowAll(!showAll);
              if (!showAll) {
                // When showing all, use allTransactions
                setTransactions(allTransactions);
              } else {
                // When showing recent, reapply the gap filter
                loadTransactions();
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {showAll ? 'Show Recent' : 'Show All'}
          </button>
          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
        >
          {transactionTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 text-red-400 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                From/To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Height
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  Loading transactions...
                </td>
              </tr>
            ) : displayedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  <div>No transactions found for this address</div>
                  {transactions.length === 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400 mb-2">This blockchain is new. You can:</p>
                      <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
                        <li>Send tokens between accounts</li>
                        <li>Buy or sell MAINCOIN using the bonding curve</li>
                        <li>Create DEX orders to trade tokens</li>
                        <li>Bridge TESTUSD in/out of the chain</li>
                      </ul>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              displayedTransactions.map((tx) => (
                <tr key={`${tx.height}-${tx.tx_hash}`} className="hover:bg-gray-700/30">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`text-lg ${getTypeColor(tx.type)}`}>
                      {getTypeIcon(tx.type)}
                    </span>
                    <span className="ml-2 text-sm text-gray-300">
                      {tx.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-300">
                    {tx.description}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {tx.amount.map((coin, i) => (
                      <div key={i} className={getTypeColor(tx.type)}>
                        {formatCoin(coin)}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-400">
                    {tx.type === 'send' ? (
                      <div>To: {shortenAddress(tx.to)}</div>
                    ) : tx.type === 'receive' ? (
                      <div>From: {shortenAddress(tx.from)}</div>
                    ) : (
                      <div>
                        {tx.from && <div>From: {shortenAddress(tx.from)}</div>}
                        {tx.to && <div>To: {shortenAddress(tx.to)}</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-400">
                    {formatTimestamp(tx.timestamp)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-400">
                    {tx.height}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(transactions.length > 0 || allTransactions.length > 0) && (
        <div className="mt-4 text-sm text-gray-500">
          <div>Showing {displayedTransactions.length} of {typeFilteredTransactions.length} filtered transactions</div>
          {!showAll && typeFilteredTransactions.length > 50 && (
            <div className="mt-2 text-xs text-gray-400">
              Click "Show All" to see all {typeFilteredTransactions.length} transactions
            </div>
          )}
          {showAll && allTransactions.length > transactions.length && (
            <div className="mt-2 text-xs text-gray-400">
              Showing all transactions including those with gaps in block sequence
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;