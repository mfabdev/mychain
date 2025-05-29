import { useState, useEffect } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { CHAIN_INFO } from '../utils/config';

declare global {
  interface Window {
    keplr: any;
    leap: any;
  }
}

export const useKeplr = () => {
  const [address, setAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [client, setClient] = useState<SigningStargateClient | null>(null);
  const [error, setError] = useState<string>('');

  const connectWallet = async (walletType: 'keplr' | 'leap' = 'keplr') => {
    try {
      setError('');
      const wallet = walletType === 'keplr' ? window.keplr : window.leap;
      
      if (!wallet) {
        throw new Error(`Please install ${walletType === 'keplr' ? 'Keplr' : 'Leap'} wallet extension`);
      }

      // Add chain to wallet
      await wallet.experimentalSuggestChain({
        ...CHAIN_INFO,
        features: ['ibc-transfer'],
      });

      // Enable wallet
      await wallet.enable(CHAIN_INFO.chainId);

      // Get signer
      const offlineSigner = wallet.getOfflineSigner(CHAIN_INFO.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length > 0) {
        setAddress(accounts[0].address);
        setIsConnected(true);

        // Create signing client
        const signingClient = await SigningStargateClient.connectWithSigner(
          CHAIN_INFO.rpc,
          offlineSigner
        );
        setClient(signingClient);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    }
  };

  const disconnect = () => {
    setAddress('');
    setIsConnected(false);
    setClient(null);
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