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
    <header className="bg-gray-800 text-white shadow-lg border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              MyChain Dashboard
            </h1>
            <span className="text-sm text-gray-400">Blockchain Explorer</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <span className="text-sm font-mono bg-gray-700 px-3 py-1 rounded">
                  {address.slice(0, 10)}...{address.slice(-8)}
                </span>
                <button
                  onClick={onDisconnect}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg"
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