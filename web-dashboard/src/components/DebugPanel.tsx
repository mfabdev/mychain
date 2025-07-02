import { getRestEndpoint, getRpcEndpoint } from '../utils/endpoints';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const DebugPanel: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<any>({});
  
  useEffect(() => {
    const checkEndpoints = async () => {
      const endpoints = [
        { name: 'Node Info', url: '' + getRestEndpoint() + '/cosmos/base/tendermint/v1beta1/node_info' },
        { name: 'Latest Block', url: '' + getRestEndpoint() + '/cosmos/base/tendermint/v1beta1/blocks/latest' },
        { name: 'Total Supply', url: '' + getRestEndpoint() + '/cosmos/bank/v1beta1/supply' },
      ];
      
      const results: any = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint.url);
          results[endpoint.name] = { success: true, status: response.status };
        } catch (error: any) {
          results[endpoint.name] = { 
            success: false, 
            error: error.message,
            details: error.response?.data || error.code
          };
        }
      }
      
      setApiStatus(results);
    };
    
    checkEndpoints();
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg max-w-md">
      <h3 className="font-bold mb-2">API Debug Panel</h3>
      {Object.entries(apiStatus).map(([name, status]: [string, any]) => (
        <div key={name} className="mb-2">
          <p className="font-semibold">{name}:</p>
          {status.success ? (
            <p className="text-green-400">✓ Success (Status: {status.status})</p>
          ) : (
            <div>
              <p className="text-red-400">✗ Failed</p>
              <p className="text-xs">{status.error}</p>
              <p className="text-xs">{JSON.stringify(status.details)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};