import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BlockInfo } from '../components/BlockInfo';
import { fetchAPI } from '../utils/api';

export const OverviewPage: React.FC = () => {
  const [maincoinSupply, setMaincoinSupply] = useState<string>('0');
  const [maincoinPrice, setMaincoinPrice] = useState<string>('0.0001');
  const [lcSupply, setLcSupply] = useState<string>('0');
  const [testusdSupply, setTestusdSupply] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        // Fetch MainCoin data
        const segmentInfo = await fetchAPI('/mychain/maincoin/v1/segment_info');
        if (segmentInfo) {
          setMaincoinSupply(segmentInfo.total_supply || '0');
          setMaincoinPrice(segmentInfo.current_price || '0.0001');
        }

        // Fetch total supply data
        const totalSupply = await fetchAPI('/cosmos/bank/v1beta1/total');
        if (totalSupply && totalSupply.supply) {
          totalSupply.supply.forEach((token: any) => {
            if (token.denom === 'ulc') {
              // Convert from ulc (micro) to LC
              const lcAmount = parseInt(token.amount || '0') / 1_000_000;
              setLcSupply(lcAmount.toLocaleString());
            } else if (token.denom === 'utestusd') {
              // Convert from utestusd (micro) to TestUSD
              const testusdAmount = parseInt(token.amount || '0') / 1_000_000;
              setTestusdSupply(testusdAmount.toLocaleString());
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch token data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
    // Refresh data every 10 seconds
    const interval = setInterval(fetchTokenData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Overview</h1>
        <span className="text-sm text-gray-400">MyChain Dashboard</span>
      </div>
      
      <div className="grid gap-6">
        {/* Block Information */}
        <BlockInfo />

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Staking Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🔒</span>
              <h2 className="text-xl font-bold">Staking</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Stake your ALC tokens to earn rewards and help secure the network.
            </p>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-400">Network Status</p>
                <p className="text-lg font-bold text-green-400">Active</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Validators</p>
                <p className="text-lg font-bold text-yellow-400">1</p>
              </div>
            </div>
            <Link 
              to="/staking" 
              className="block w-full bg-blue-600 hover:bg-blue-700 rounded py-2 text-center font-semibold"
            >
              Start Staking
            </Link>
          </div>

          {/* DEX Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">📈</span>
              <h2 className="text-xl font-bold">DEX Trading</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Trade tokens directly on the decentralized exchange with low fees.
            </p>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-400">Available Pairs</p>
                <p className="text-lg font-bold text-green-400">MC/TestUSD</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-lg font-bold text-yellow-400">Ready</p>
              </div>
            </div>
            <Link 
              to="/dex" 
              className="block w-full bg-green-600 hover:bg-green-700 rounded py-2 text-center font-semibold"
            >
              Start Trading
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link 
              to="/maincoin" 
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
            >
              <span className="text-2xl block mb-2">🪙</span>
              <span className="text-sm font-medium">Buy MainCoin</span>
            </Link>
            
            <Link 
              to="/staking" 
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
            >
              <span className="text-2xl block mb-2">🔒</span>
              <span className="text-sm font-medium">Stake ALC</span>
            </Link>
            
            <Link 
              to="/testusd" 
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
            >
              <span className="text-2xl block mb-2">💵</span>
              <span className="text-sm font-medium">Bridge USD</span>
            </Link>
            
            <Link 
              to="/transactions" 
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
            >
              <span className="text-2xl block mb-2">📋</span>
              <span className="text-sm font-medium">View History</span>
            </Link>
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Network Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🟢</div>
              <div className="text-sm text-gray-400">Status</div>
              <div className="font-semibold">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <div className="text-sm text-gray-400">Block Time</div>
              <div className="font-semibold">~5s</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-sm text-gray-400">Validators</div>
              <div className="font-semibold">1</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🔗</div>
              <div className="text-sm text-gray-400">Chain ID</div>
              <div className="font-semibold text-xs">mychain</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};