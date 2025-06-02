import React from 'react';
import { Link } from 'react-router-dom';
import { BlockInfo } from '../components/BlockInfo';

export const OverviewPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Overview</h1>
        <span className="text-sm text-gray-400">MyChain Dashboard</span>
      </div>
      
      <div className="grid gap-6">
        {/* Block Information */}
        <BlockInfo />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">💧 LiquidityCoin</h3>
            <p className="text-2xl font-bold text-blue-400">100,000</p>
            <p className="text-sm text-gray-400">Total Supply (90% staked)</p>
            <Link to="/liquiditycoin" className="text-blue-400 hover:text-blue-300 text-sm">
              View Details →
            </Link>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">🪙 MainCoin</h3>
            <p className="text-2xl font-bold text-green-400">100,000</p>
            <p className="text-sm text-gray-400">At $0.0001 each</p>
            <Link to="/maincoin" className="text-green-400 hover:text-green-300 text-sm">
              Trade Now →
            </Link>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">💵 TestUSD</h3>
            <p className="text-2xl font-bold text-purple-400">1,001</p>
            <p className="text-sm text-gray-400">Bridge Token</p>
            <Link to="/testusd" className="text-purple-400 hover:text-purple-300 text-sm">
              Bridge →
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Staking Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🔒</span>
              <h2 className="text-xl font-bold">Staking</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Stake your ALC tokens to earn 10% annual rewards and help secure the network.
            </p>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-400">Currently Staked</p>
                <p className="text-lg font-bold text-green-400">90,000 ALC</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">APR</p>
                <p className="text-lg font-bold text-yellow-400">10%</p>
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
                <p className="text-sm text-gray-400">Trading Pairs</p>
                <p className="text-lg font-bold text-green-400">3</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">24h Volume</p>
                <p className="text-lg font-bold text-yellow-400">$0.00</p>
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