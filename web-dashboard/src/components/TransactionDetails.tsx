import React, { useState, useEffect } from 'react';
import { getRestEndpoint } from '../utils/endpoints';

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
  const [retryingCount, setRetryingCount] = useState(0);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    let timeoutId: NodeJS.Timeout;

    const fetchTxDetails = async () => {
      try {
        const restEndpoint = getRestEndpoint();
        const response = await fetch(`${restEndpoint}/cosmos/tx/v1beta1/txs/${txHash}`);
        
        if (response.status === 404 && retryCount < maxRetries) {
          // Transaction not indexed yet, retry
          retryCount++;
          setRetryingCount(retryCount);
          console.log(`Transaction not found yet, retrying... (${retryCount}/${maxRetries})`);
          timeoutId = setTimeout(fetchTxDetails, retryDelay);
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch transaction: ${response.status}`);
        }

        const data = await response.json();
        const tx = data.tx_response || data;
        
        setDetails({
          height: tx.height,
          timestamp: tx.timestamp,
          code: tx.code || 0,
          gasUsed: tx.gas_used || '0',
          gasWanted: tx.gas_wanted || '0',
          events: tx.events || [],
          memo: tx.tx?.body?.memo,
          messages: tx.tx?.body?.messages || []
        });
        setRetryingCount(0);
      } catch (err: any) {
        console.error('Error fetching transaction details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTxDetails();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [txHash]);

  if (loading && retryingCount === 0) {
    return <div className="text-gray-500">Loading transaction details...</div>;
  }

  if (retryingCount > 0) {
    return (
      <div className="text-yellow-600">
        Waiting for transaction to be indexed... (Attempt {retryingCount}/5)
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!details) {
    return <div className="text-gray-500">No transaction details available</div>;
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Block Height:</span>
        <span className="font-mono">{details.height}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Status:</span>
        <span className={details.code === 0 ? 'text-green-600' : 'text-red-600'}>
          {details.code === 0 ? 'Success' : `Failed (${details.code})`}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Gas Used:</span>
        <span className="font-mono">{details.gasUsed} / {details.gasWanted}</span>
      </div>
      {details.timestamp && (
        <div className="flex justify-between">
          <span className="text-gray-600">Time:</span>
          <span>{new Date(details.timestamp).toLocaleString()}</span>
        </div>
      )}
      {details.memo && (
        <div className="flex justify-between">
          <span className="text-gray-600">Memo:</span>
          <span className="text-xs">{details.memo}</span>
        </div>
      )}
    </div>
  );
};