import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';

interface Transaction {
  txhash: string;
  height: string;
  timestamp: string;
  logs: any[];
  code?: number;
  gas_wanted: string;
  gas_used: string;
  events: any[];
  tx: {
    body: {
      messages: any[];
    };
  };
}

interface TransactionHistoryProps {
  address?: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ address }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!address) {
        setTransactions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try the standard Cosmos SDK endpoint first
        let txData;
        try {
          const response = await fetch(
            `http://localhost:1328/cosmos/tx/v1beta1/txs?query=message.sender='${address}'`
          );
          if (response.ok) {
            txData = await response.json();
          }
        } catch (e) {
          console.error('Failed to fetch from Cosmos SDK endpoint:', e);
        }

        // If that fails, try a simpler approach - get recent blocks and filter
        if (!txData || !txData.txs) {
          // For now, return empty array with a message
          console.log('Transaction query not working, would need to implement alternative method');
          setTransactions([]);
          setError('Transaction indexing is not available. Please check the Transactions page from the navigation menu.');
          return;
        }

        // Use the fetched transaction data
        const uniqueTxs = txData.txs || [];
        
        // Sort by height (newest first)
        uniqueTxs.sort((a: any, b: any) => parseInt(b.height) - parseInt(a.height));
        
        setTransactions(uniqueTxs.slice(0, 10)); // Show last 10 transactions
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to fetch transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [address]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTransactionType = (tx: Transaction) => {
    if (!tx.tx?.body?.messages?.[0]) return 'Unknown';
    const msgType = tx.tx.body.messages[0]['@type'];
    if (msgType?.includes('MsgSend')) return 'Transfer';
    if (msgType?.includes('MsgDelegate')) return 'Delegate';
    if (msgType?.includes('MsgCreateOrder')) return 'DEX Order';
    if (msgType?.includes('MsgBuyMaincoin')) return 'Buy MAINCOIN';
    if (msgType?.includes('MsgSellMaincoin')) return 'Sell MAINCOIN';
    return msgType?.split('.').pop() || 'Unknown';
  };

  const getTransactionStatus = (tx: Transaction) => {
    return tx.code === 0 || !tx.code ? 'Success' : 'Failed';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Transaction History</h2>
      
      {!address ? (
        <p className="text-gray-400">Connect wallet to view transaction history</p>
      ) : loading && transactions.length === 0 ? (
        <p className="text-gray-400">Loading transactions...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No transactions found for this address</p>
          <div className="bg-gray-700/30 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-500 mb-2">This blockchain is new. You can:</p>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Send tokens between accounts</li>
              <li>Buy or sell MAINCOIN using the bonding curve</li>
              <li>Create DEX orders to trade tokens</li>
              <li>Bridge TESTUSD in/out of the chain</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-2">Height</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-left py-2 px-2">Time</th>
                <th className="text-left py-2 px-2">Gas</th>
                <th className="text-left py-2 px-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.txhash} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-2 px-2">{tx.height}</td>
                  <td className="py-2 px-2">
                    <span className="text-blue-400">{getTransactionType(tx)}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      getTransactionStatus(tx) === 'Success' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {getTransactionStatus(tx)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-400 text-xs">
                    {formatTimestamp(tx.timestamp)}
                  </td>
                  <td className="py-2 px-2 text-gray-400">
                    {tx.gas_used}/{tx.gas_wanted}
                  </td>
                  <td className="py-2 px-2">
                    <span className="font-mono text-xs text-gray-400" title={tx.txhash}>
                      {tx.txhash.slice(0, 8)}...{tx.txhash.slice(-8)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};