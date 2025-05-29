import React from 'react';

interface HeaderProps {
  isConnected: boolean;
  address: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isConnected, 
  address, 
  onConnect, 
  onDisconnect 
}) => {
  return (
    <header className="bg-dark text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">MyChain Dashboard</h1>
            <span className="text-sm text-gray-300">Blockchain Explorer</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <span className="text-sm">
                  {address.slice(0, 10)}...{address.slice(-8)}
                </span>
                <button
                  onClick={onDisconnect}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                className="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};