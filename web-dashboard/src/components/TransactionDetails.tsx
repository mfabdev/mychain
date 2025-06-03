import React, { useState, useEffect } from 'react';

interface TransactionDetailsProps {
  txHash: string;
}

interface TxDetails {
  height: string;
  timestamp: string;
  code: number;
  gasUsed: string;
  gasWanted: string;
  events: any[];
  memo?: string;
  messages: any[];
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({ txHash }) => {
  const [details, setDetails] = useState<TxDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTxDetails = async () => {
      try {
        const response = await fetch(`http://localhost:1317/cosmos/tx/v1beta1/txs/${txHash}`);
        if (!response.ok) throw new Error('Failed to fetch transaction');
        
        const data = await response.json();
        setDetails(data.tx_response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transaction');
      } finally {
        setLoading(false);
      }
    };

    if (txHash) {
      fetchTxDetails();
    }
  }, [txHash]);

  if (loading) return <div className="animate-pulse">Loading transaction details...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!details) return null;

  // Extract MainCoin transaction details from events
  const buyMaincoinEvent = details.events?.find((e: any) => e.type === 'buy_maincoin');
  const transferEvents = details.events?.filter((e: any) => e.type === 'transfer') || [];
  const refundTransfer = transferEvents.find((t: any) => 
    t.attributes?.some((a: any) => a.key === 'sender' && a.value.includes('maincoin')) &&
    t.attributes?.some((a: any) => a.key === 'amount' && a.value.includes('utestusd'))
  );

  const getEventAttribute = (event: any, key: string) => {
    return event?.attributes?.find((a: any) => a.key === key)?.value || '';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-4">
      <h3 className="text-xl font-bold mb-4">Transaction Details</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className={details.code === 0 ? 'text-green-500' : 'text-red-500'}>
            {details.code === 0 ? '✅ Success' : '❌ Failed'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Block Height:</span>
          <span>{details.height}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Timestamp:</span>
          <span>{new Date(details.timestamp).toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Gas Used / Wanted:</span>
          <span>{details.gasUsed} / {details.gasWanted}</span>
        </div>

        {buyMaincoinEvent && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-lg font-semibold mb-3">MainCoin Purchase Details</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount Spent:</span>
                <span>{parseInt(getEventAttribute(buyMaincoinEvent, 'amount_spent')) / 1000000} TESTUSD</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">MainCoin Received:</span>
                <span>{parseInt(getEventAttribute(buyMaincoinEvent, 'maincoin_received')) / 1000000} MAINCOIN</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Segments Processed:</span>
                <span>{getEventAttribute(buyMaincoinEvent, 'segments_processed')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Average Price:</span>
                <span>{parseFloat(getEventAttribute(buyMaincoinEvent, 'average_price')).toFixed(8)}</span>
              </div>
            </div>
          </div>
        )}

        {refundTransfer && (
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded">
            <p className="text-yellow-400 font-semibold">⚠️ Partial Purchase - Funds Returned</p>
            <p className="text-sm text-gray-300 mt-2">
              Amount returned: {getEventAttribute(refundTransfer, 'amount')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Purchase hit 25-segment limit. Make additional purchases to buy more MainCoin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};