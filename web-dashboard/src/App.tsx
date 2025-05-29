import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CoinCard } from './components/CoinCard';
import { BlockInfo } from './components/BlockInfo';
import { UserDashboard } from './components/UserDashboard';
import { useKeplr } from './hooks/useKeplr';
import { fetchTotalSupply } from './utils/api';
import { Balance } from './types';
import './App.css';

function App() {
  const { address, isConnected, connectWallet, disconnect, error } = useKeplr();
  const [totalSupply, setTotalSupply] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supply = await fetchTotalSupply();
        setTotalSupply(supply);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getSupplyForDenom = (denom: string): string => {
    const coin = totalSupply.find(s => s.denom === denom);
    return coin ? coin.amount : '0';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        isConnected={isConnected}
        address={address}
        onConnect={() => connectWallet('keplr')}
        onDisconnect={disconnect}
      />

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Public Information Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Blockchain Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <BlockInfo />
            
            <CoinCard
              name="LiquidityCoin"
              symbol="ALC"
              totalSupply={getSupplyForDenom('alc')}
              price={0.10}
              color="text-blue-600"
            />
            
            <CoinCard
              name="MainCoin"
              symbol="MAINCOIN"
              totalSupply={getSupplyForDenom('maincoin')}
              price={1.00}
              color="text-purple-600"
            />
            
            <CoinCard
              name="Test USD"
              symbol="TESTUSD"
              totalSupply={getSupplyForDenom('testusd')}
              price={1.00}
              color="text-green-600"
            />
          </div>

          {/* DEX Information */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">DEX Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">24h Volume</p>
                <p className="text-2xl font-bold text-gray-800">$0</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Active Orders</p>
                <p className="text-2xl font-bold text-gray-800">0</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Liquidity Rewards APY</p>
                <p className="text-2xl font-bold text-green-600">0%</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Dashboard - Only shown when connected */}
        {isConnected && address && (
          <UserDashboard address={address} />
        )}
      </main>
    </div>
  );
}

export default App;