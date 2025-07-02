import { getRestEndpoint, getRpcEndpoint } from '../utils/endpoints';
import React, { useEffect, useState } from 'react';

export const RewardsTest: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const testRewards = async () => {
      try {
        // Direct fetch to rewards endpoint
        const response = await fetch('' + getRestEndpoint() + '/cosmos/distribution/v1beta1/delegators/cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0/rewards');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setData(data);
        
        // Calculate unclaimed LC
        let unclaimedLC = 0;
        if (data.total && Array.isArray(data.total)) {
          const ulc = data.total.find((t: any) => t.denom === 'ulc');
          if (ulc) {
            unclaimedLC = parseFloat(ulc.amount) / 1000000;
          }
        }
        
        setData({
          ...data,
          unclaimedLC,
          rawAmount: data.total?.find((t: any) => t.denom === 'ulc')?.amount
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    testRewards();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-4">
      <h3 className="text-lg font-bold mb-2">Direct Rewards Test</h3>
      {error && <div className="text-red-400 mb-2">Error: {error}</div>}
      {data && (
        <div className="space-y-2">
          <div className="bg-gray-700 p-2 rounded">
            <p className="text-sm text-gray-400">Unclaimed LC:</p>
            <p className="text-xl font-bold">{data.unclaimedLC?.toFixed(6) || '0.000000'} LC</p>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <p className="text-sm text-gray-400">Raw Amount:</p>
            <p className="text-xs font-mono">{data.rawAmount}</p>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-gray-400">Full Response</summary>
            <pre className="bg-gray-900 p-2 rounded mt-2 text-xs overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};