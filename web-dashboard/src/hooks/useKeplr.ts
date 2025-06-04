import { useState, useEffect } from 'react';
import { SigningStargateClient, AminoTypes, defaultRegistryTypes } from '@cosmjs/stargate';
import { CHAIN_INFO } from '../utils/config';
import { Registry } from '@cosmjs/proto-signing';

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

      // Get signer - use getOfflineSignerOnlyAmino to force Amino signing
      // This avoids the need for protobuf type registration
      const offlineSigner = wallet.getOfflineSignerOnlyAmino(CHAIN_INFO.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length > 0) {
        setAddress(accounts[0].address);
        setIsConnected(true);

        // Create signing client with custom amino types for our messages
        const aminoTypes = new AminoTypes({
          '/mychain.maincoin.v1.MsgBuyMaincoin': {
            aminoType: 'mychain/MsgBuyMaincoin',
            toAmino: (msg: any) => ({
              buyer: msg.buyer,
              amount: msg.amount,
            }),
            fromAmino: (msg: any) => ({
              buyer: msg.buyer,
              amount: msg.amount,
            }),
          },
          '/mychain.maincoin.v1.MsgSellMaincoin': {
            aminoType: 'mychain/MsgSellMaincoin',
            toAmino: (msg: any) => ({
              seller: msg.seller,
              amount: msg.amount,
            }),
            fromAmino: (msg: any) => ({
              seller: msg.seller,
              amount: msg.amount,
            }),
          },
        });
        
        // Create a custom registry - even though we're using Amino signing,
        // we still need to register the types
        const registry = new Registry(defaultRegistryTypes);
        
        const signingClient = await SigningStargateClient.connectWithSigner(
          CHAIN_INFO.rpc,
          offlineSigner,
          {
            aminoTypes,
            registry,
          }
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