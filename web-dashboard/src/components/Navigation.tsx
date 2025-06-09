import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_ENDPOINTS, BLOCKCHAIN_CONFIG } from '../utils/config';

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive }) => (
  <Link
    to={to}
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-600 text-white' 
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span className="font-medium">{label}</span>
  </Link>
);

export const Navigation: React.FC = () => {
  const location = useLocation();
  const [blockHeight, setBlockHeight] = useState<string>('Loading...');
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Fetch block height immediately
    fetchBlockHeight();
    
    // Set up interval to fetch every 2 seconds
    const interval = setInterval(fetchBlockHeight, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchBlockHeight = async () => {
    try {
      const response = await fetch(`${BLOCKCHAIN_CONFIG.restEndpoint}${API_ENDPOINTS.latestBlock}`);
      if (response.ok) {
        const data = await response.json();
        const height = data.block?.header?.height || 'N/A';
        setBlockHeight(`#${height}`);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const navItems = [
    { to: '/', icon: '🏠', label: 'Overview' },
    { to: '/maincoin', icon: '🪙', label: 'MainCoin' },
    { to: '/liquiditycoin', icon: '💧', label: 'LiquidityCoin' },
    { to: '/testusd', icon: '💵', label: 'TestUSD' },
    { to: '/staking', icon: '🔒', label: 'Staking' },
    { to: '/dex', icon: '📈', label: 'DEX' },
    { to: '/transactions', icon: '📋', label: 'Transactions' }
  ];

  return (
    <nav className="bg-gray-800 h-screen w-64 fixed left-0 top-0 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">MyChain Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Blockchain Explorer</p>
      </div>

      {/* Navigation Items */}
      <div className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <p>MyChain Testnet</p>
          <p>Block Height: {blockHeight}</p>
          <p>Status: {isConnected ? '🟢 Active' : '🔴 Disconnected'}</p>
        </div>
      </div>
    </nav>
  );
};