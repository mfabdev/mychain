import { useState, useEffect } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import { CHAIN_INFO } from '../utils/config';
import { MsgBuyMaincoinProtoType, MsgSellMaincoinProtoType } from '../codegen/mychain/maincoin/v1/tx';

export const useKeplr = () => {
  const [address, setAddress] = useState<string>(() => {
    return localStorage.getItem('mychain_wallet_address') || '';
  });
  const [isConnected, setIsConnected] = useState(() => {
    return !!localStorage.getItem('mychain_wallet_address');
  });
  const [client, setClient] = useState<SigningStargateClient | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const reconnect = async () => {
      const savedAddress = localStorage.getItem('mychain_wallet_address');
      const savedWalletType = localStorage.getItem('mychain_wallet_type') as 'keplr' | 'leap';
      
      if (savedAddress && savedWalletType) {
        try {
          await connectWallet(savedWalletType);
        } catch (err) {
          console.error('Failed to reconnect:', err);
          localStorage.removeItem('mychain_wallet_address');
          localStorage.removeItem('mychain_wallet_type');
        }
      }
    };

    reconnect();
  }, []);

  const connectWallet = async (walletType: 'keplr' | 'leap' = 'keplr') => {
    if ((walletType === 'keplr' && !window.keplr) || (walletType === 'leap' && !window.leap)) {
      const walletName = walletType === 'keplr' ? 'Keplr' : 'Leap';
      throw new Error(`Please install ${walletName} wallet extension`);
    }

    try {
      const wallet = walletType === 'keplr' ? window.keplr : window.leap;

      try {
        await wallet.enable(CHAIN_INFO.chainId);
      } catch {
        await wallet.experimentalSuggestChain(CHAIN_INFO);
        await wallet.enable(CHAIN_INFO.chainId);
      }

      const offlineSigner = wallet.getOfflineSigner(CHAIN_INFO.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const accountAddress = accounts[0].address;
      setAddress(accountAddress);
      setIsConnected(true);
      setError('');
      
      localStorage.setItem('mychain_wallet_address', accountAddress);
      localStorage.setItem('mychain_wallet_type', walletType);

      if (!client) {
        // Create custom registry with MainCoin types
        const registry = new Registry();
        registry.register('/mychain.maincoin.v1.MsgBuyMaincoin', MsgBuyMaincoinProtoType);
        registry.register('/mychain.maincoin.v1.MsgSellMaincoin', MsgSellMaincoinProtoType);

        const signingClient = await SigningStargateClient.connectWithSigner(
          CHAIN_INFO.rpc,
          offlineSigner,
          { registry }
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
    setError('');
    localStorage.removeItem('mychain_wallet_address');
    localStorage.removeItem('mychain_wallet_type');
  };

  const buyMainCoin = async (amountTUSD: string) => {
    console.log('buyMainCoin called with:', { address, hasClient: !!client, amountTUSD });
    if (!client || !address) {
      throw new Error('Wallet not connected');
    }

    console.log('buyMainCoin address:', address);
    const msg = {
      typeUrl: '/mychain.maincoin.v1.MsgBuyMaincoin',
      value: {
        buyer: address,
        amount: {
          denom: 'utusd',
          amount: String(Math.floor(parseFloat(amountTUSD) * 1000000)),
        },
      },
    };

    const fee = {
      amount: [{ denom: 'ulc', amount: '50000' }],
      gas: '500000',
    };

    try {
      const result = await client.signAndBroadcast(address, [msg], fee, 'Buying MainCoin');
      return result;
    } catch (error: any) {
      console.error('Transaction failed with msg:', msg);
      console.error('Address at time of error:', address);
      throw error;
    }
  };

  const sellMainCoin = async (amountMC: string) => {
    console.log('sellMainCoin called with:', { address, hasClient: !!client, amountMC });
    if (!client || !address) {
      throw new Error('Wallet not connected');
    }

    console.log('sellMainCoin address:', address);
    const msg = {
      typeUrl: '/mychain.maincoin.v1.MsgSellMaincoin',
      value: {
        seller: address,
        amount: {
          denom: 'umc',
          amount: String(Math.floor(parseFloat(amountMC) * 1000000)),
        },
      },
    };

    const fee = {
      amount: [{ denom: 'ulc', amount: '50000' }],
      gas: '500000',
    };

    try {
      const result = await client.signAndBroadcast(address, [msg], fee, 'Selling MainCoin');
      return result;
    } catch (error: any) {
      console.error('Transaction failed with msg:', msg);
      console.error('Address at time of error:', address);
      throw error;
    }
  };

  return {
    address,
    isConnected,
    client,
    error,
    connectWallet,
    disconnect,
    buyMainCoin,
    sellMainCoin,
  };
};