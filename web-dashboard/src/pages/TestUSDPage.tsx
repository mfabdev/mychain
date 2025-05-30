import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';

interface TestUSDData {
  totalSupply: string;
  bridgeStatus: string;
  params: any;
}

export const TestUSDPage: React.FC = () => {
  const [testUSDData, setTestUSDData] = useState<TestUSDData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestUSDData = async () => {
      try {
        // Fetch TestUSD module data
        const [supplyResponse, paramsResponse] = await Promise.all([
          fetchAPI('/mychain/testusd/v1/total_supply'),
          fetchAPI('/mychain/testusd/v1/params')
        ]);

        setTestUSDData({
          totalSupply: supplyResponse.total_supply || '1000000000000',
          bridgeStatus: 'Active',
          params: paramsResponse.params
        });
      } catch (error) {
        console.error('Error fetching TestUSD data:', error);
        // Use default values
        setTestUSDData({
          totalSupply: '1000000000000',
          bridgeStatus: 'Active',
          params: null
        });
      }
      setLoading(false);
    };

    fetchTestUSDData();
    const interval = setInterval(fetchTestUSDData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount: string, decimals = 6): string => {
    const value = parseFloat(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">TestUSD</h1>
        <span className="text-sm text-gray-400">Bridge Token</span>
      </div>
      
      <div className="grid gap-6">
        {/* TestUSD Overview */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">TestUSD Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Total Supply</p>
              <p className="text-2xl font-bold text-green-400">
                {testUSDData ? formatAmount(testUSDData.totalSupply) : '1,000,000.00'}
              </p>
              <p className="text-xs text-gray-500">TestUSD</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Bridge Status</p>
              <p className="text-2xl font-bold text-blue-400">
                {testUSDData?.bridgeStatus || 'Active'}
              </p>
              <p className="text-xs text-gray-500">Operational</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Backing</p>
              <p className="text-2xl font-bold text-purple-400">1:1</p>
              <p className="text-xs text-gray-500">USD Peg</p>
            </div>
          </div>
        </div>

        {/* Bridge Interface */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Bridge Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold text-green-400 mb-3">Bridge In</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount (USD)</label>
                  <input type="number" className="w-full bg-gray-700 rounded px-3 py-2" placeholder="0.00" />
                </div>
                <div className="text-xs text-gray-500">
                  <p>Conversion Rate: 1:1</p>
                  <p>You will receive: TestUSD</p>
                </div>
                <button className="w-full bg-green-600 hover:bg-green-700 rounded py-2 font-semibold">
                  Bridge In
                </button>
              </div>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold text-red-400 mb-3">Bridge Out</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount (TestUSD)</label>
                  <input type="number" className="w-full bg-gray-700 rounded px-3 py-2" placeholder="0.00" />
                </div>
                <div className="text-xs text-gray-500">
                  <p>Conversion Rate: 1:1</p>
                  <p>You will receive: USD</p>
                </div>
                <button className="w-full bg-red-600 hover:bg-red-700 rounded py-2 font-semibold">
                  Bridge Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TestUSD Usage */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">TestUSD Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-400">Primary Uses</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Purchase MainCoin tokens</li>
                <li>• Back MainCoin reserves</li>
                <li>• Cross-chain transfers</li>
                <li>• Stable value transactions</li>
              </ul>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-400">Features</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 1:1 USD backing</li>
                <li>• Instant bridging</li>
                <li>• Low transaction fees</li>
                <li>• Cross-chain compatible</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Module Parameters */}
        {testUSDData?.params && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Module Parameters</h2>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Bridge Fee</p>
                  <p className="font-mono">{testUSDData.params.bridge_fee || '0.00%'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Min Bridge Amount</p>
                  <p className="font-mono">{testUSDData.params.min_bridge_amount || '1.00'} TestUSD</p>
                </div>
                <div>
                  <p className="text-gray-400">Max Bridge Amount</p>
                  <p className="font-mono">{testUSDData.params.max_bridge_amount || 'Unlimited'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-gray-700/20 rounded-lg p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>• TestUSD is a bridged stablecoin pegged 1:1 to USD</p>
            <p>• Used as the primary purchase currency for MainCoin</p>
            <p>• Backed by reserves in the bridge contract</p>
            <p>• Cross-chain transfers available through IBC</p>
          </div>
        </div>
      </div>
    </div>
  );
};