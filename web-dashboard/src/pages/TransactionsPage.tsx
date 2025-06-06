import React from 'react';
import { TransactionHistory } from '../components/TransactionHistory';
import { useKeplr } from '../hooks/useKeplr';

export const TransactionsPage: React.FC = () => {
  const { address, isConnected } = useKeplr();
  const defaultAddress = isConnected && address ? address : "cosmos1sn9wjkv38jglqsvtwfk3ae9kzcpkp6vd0j5ptl";
  const [searchAddress, setSearchAddress] = React.useState(defaultAddress);
  const [addressInput, setAddressInput] = React.useState(defaultAddress);
  const [txHashInput, setTxHashInput] = React.useState("");

  const handleSearch = () => {
    if (addressInput.trim()) {
      setSearchAddress(addressInput.trim());
    }
  };

  const handleClear = () => {
    setAddressInput("");
    setTxHashInput("");
    setSearchAddress("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <span className="text-sm text-gray-400">Blockchain History</span>
      </div>
      
      <div className="grid gap-6">
        {/* Transaction Search */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Search Transactions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Address</label>
              <input 
                type="text" 
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm font-mono" 
                placeholder="cosmos1..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Transaction Hash</label>
              <input 
                type="text" 
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm font-mono" 
                placeholder="Enter tx hash..."
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button 
              className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold"
              onClick={handleSearch}
            >
              Search
            </button>
            <button 
              className="bg-gray-600 hover:bg-gray-700 rounded px-4 py-2"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Transaction Types Filter */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Filter by Type</h2>
          <div className="flex flex-wrap gap-2">
            <button className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-sm">
              All
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              Send
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              Receive
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              Stake
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              Unstake
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              Buy MainCoin
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              Sell MainCoin
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              DEX Trade
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm">
              Bridge
            </button>
          </div>
        </div>

        {/* Transaction History Component */}
        <TransactionHistory address={searchAddress} />

        {/* Transaction Statistics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Transaction Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-400">0</p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Volume (24h)</p>
              <p className="text-2xl font-bold text-green-400">$0.00</p>
              <p className="text-xs text-gray-500">TestUSD value</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Gas Used</p>
              <p className="text-2xl font-bold text-yellow-400">0</p>
              <p className="text-xs text-gray-500">ALC fees paid</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-purple-400">100%</p>
              <p className="text-xs text-gray-500">Successful txs</p>
            </div>
          </div>
        </div>

        {/* Recent Blocks */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Blocks</h2>
          <div className="space-y-2">
            <div className="grid grid-cols-4 text-sm text-gray-400 border-b border-gray-600 pb-1">
              <div>Height</div>
              <div>Transactions</div>
              <div>Validator</div>
              <div>Time</div>
            </div>
            
            {/* Mock block data */}
            <div className="grid grid-cols-4 text-sm hover:bg-gray-700/50 rounded p-1">
              <div className="text-blue-400">#4</div>
              <div>0</div>
              <div className="font-mono text-xs">test</div>
              <div className="text-gray-400">2 min ago</div>
            </div>
            <div className="grid grid-cols-4 text-sm hover:bg-gray-700/50 rounded p-1">
              <div className="text-blue-400">#3</div>
              <div>0</div>
              <div className="font-mono text-xs">test</div>
              <div className="text-gray-400">7 min ago</div>
            </div>
            <div className="grid grid-cols-4 text-sm hover:bg-gray-700/50 rounded p-1">
              <div className="text-blue-400">#2</div>
              <div>0</div>
              <div className="font-mono text-xs">test</div>
              <div className="text-gray-400">12 min ago</div>
            </div>
            <div className="grid grid-cols-4 text-sm hover:bg-gray-700/50 rounded p-1">
              <div className="text-blue-400">#1</div>
              <div>0</div>
              <div className="font-mono text-xs">test</div>
              <div className="text-gray-400">17 min ago</div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Export Data</h2>
          <div className="flex gap-2">
            <button className="bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold">
              Export CSV
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold">
              Export JSON
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-semibold">
              Generate Report
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Export your transaction history for accounting or analysis purposes
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-gray-700/20 rounded-lg p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>• All transactions are recorded on the blockchain and publicly verifiable</p>
            <p>• Transaction fees are paid in ALC tokens</p>
            <p>• Block time is approximately 5 seconds</p>
            <p>• Connect your wallet to see your personal transaction history</p>
          </div>
        </div>
      </div>
    </div>
  );
};