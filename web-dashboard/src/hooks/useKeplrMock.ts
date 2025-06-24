import { useState, useEffect } from 'react';

// Mock wallet hook for testing without blockchain connection
export const useKeplr = () => {
  // Use the same default address as our mock API
  const [address] = useState<string>('cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz');
  const [isConnected] = useState(true);
  const [client] = useState(null);
  const [error] = useState<string>('');

  const connectWallet = async () => {
    // No-op for mock
  };

  const disconnect = () => {
    // No-op for mock
  };

  return {
    address,
    isConnected,
    client,
    error,
    connectWallet,
    disconnect,
  };
};