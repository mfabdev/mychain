import { useState, useEffect } from 'react';
import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import { AminoTypes } from '@cosmjs/stargate';
import { CHAIN_INFO } from '../utils/config';

// MainCoin message types
const maincoinTypes = [
  [
    "/mychain.maincoin.v1.MsgBuyMaincoin",
    {
      typeUrl: "/mychain.maincoin.v1.MsgBuyMaincoin",
      encode: (message: any) => ({
        buyer: message.buyer,
        amount: message.amount,
      }),
    },
  ],
  [
    "/mychain.maincoin.v1.MsgSellMaincoin",
    {
      typeUrl: "/mychain.maincoin.v1.MsgSellMaincoin",
      encode: (message: any) => ({
        seller: message.seller,
        amount: message.amount,
      }),
    },
  ],
];

// Amino converters for MainCoin messages
const maincoinAminoConverters = {
  "/mychain.maincoin.v1.MsgBuyMaincoin": {
    aminoType: "mychain/MsgBuyMaincoin",
    toAmino: (message: any) => ({
      buyer: message.buyer,
      amount: message.amount,
    }),
    fromAmino: (message: any) => ({
      buyer: message.buyer,
      amount: message.amount,
    }),
  },
  "/mychain.maincoin.v1.MsgSellMaincoin": {
    aminoType: "mychain/MsgSellMaincoin",
    toAmino: (message: any) => ({
      seller: message.seller,
      amount: message.amount,
    }),
    fromAmino: (message: any) => ({
      seller: message.seller,
      amount: message.amount,
    }),
  },
};

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

      // Add chain to wallet if needed
      try {
        await wallet.enable(CHAIN_INFO.chainId);
      } catch {
        await wallet.experimentalSuggestChain(CHAIN_INFO);
        await wallet.enable(CHAIN_INFO.chainId);
      }

      const offlineSigner = wallet.getOfflineSignerOnlyAmino(CHAIN_INFO.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const accountAddress = accounts[0].address;
      setAddress(accountAddress);
      setIsConnected(true);
      setError('');
      
      // Save to localStorage
      localStorage.setItem('mychain_wallet_address', accountAddress);
      localStorage.setItem('mychain_wallet_type', walletType);

      // Only create signing client if we don't have one
      if (!client) {
        // Create custom amino types with MainCoin messages
        const aminoTypes = new AminoTypes({
          ...AminoTypes.defaultAminoTypes,
          ...maincoinAminoConverters,
        });

        // Create custom registry with MainCoin types
        const registry = new Registry(defaultRegistryTypes);
        maincoinTypes.forEach(([typeUrl, type]) => {
          registry.register(typeUrl, type);
        });

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
    setError('');
    localStorage.removeItem('mychain_wallet_address');
    localStorage.removeItem('mychain_wallet_type');
  };

  // Helper function to buy MainCoin
  const buyMainCoin = async (amountTUSD: string) => {
    if (!client || !address) {
      throw new Error('Wallet not connected');
    }

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

    return await client.signAndBroadcast(address, [msg], fee, 'Buying MainCoin');
  };

  // Helper function to sell MainCoin
  const sellMainCoin = async (amountMC: string) => {
    if (!client || !address) {
      throw new Error('Wallet not connected');
    }

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

    return await client.signAndBroadcast(address, [msg], fee, 'Selling MainCoin');
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