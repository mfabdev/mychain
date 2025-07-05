import { useState, useEffect } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import { CHAIN_INFO } from '../utils/config';
import { MsgBuyMaincoinProtoType, MsgSellMaincoinProtoType } from '../codegen/mychain/maincoin/v1/tx';
import { MsgCreateOrderProtoType, MsgCancelOrderProtoType } from '../codegen/mychain/dex/v1/tx';
import Long from 'long';

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
        // Create custom registry with MainCoin and DEX types
        const registry = new Registry();
        registry.register('/mychain.maincoin.v1.MsgBuyMaincoin', MsgBuyMaincoinProtoType);
        registry.register('/mychain.maincoin.v1.MsgSellMaincoin', MsgSellMaincoinProtoType);
        registry.register('/mychain.dex.v1.MsgCreateOrder', MsgCreateOrderProtoType);
        registry.register('/mychain.dex.v1.MsgCancelOrder', MsgCancelOrderProtoType);

        const signingClient = await SigningStargateClient.connectWithSigner(
          CHAIN_INFO.rpc,
          offlineSigner,
          { registry }
        );
        setClient(signingClient);
      }
      
      // Clear any previous errors on successful connection
      setError('');
    } catch (err: any) {
      // Only set error if it's not a minor connection issue
      if (!address || !err.message.includes('fetch')) {
        setError(err.message || 'Failed to connect wallet');
      }
      console.error('Wallet connection error:', err);
      
      // Even if RPC connection fails, we have the wallet connected
      if (address) {
        setIsConnected(true);
        setError(''); // Clear error if wallet is connected
      }
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

  // Helper function to estimate gas based on order complexity
  const estimateDexOrderGas = (
    isBuy: boolean,
    orderPrice: number,
    orderAmount: number,
    orderBook?: { buy_orders?: any[], sell_orders?: any[] }
  ): number => {
    let baseGas = 300000; // Base gas for simple order placement
    
    if (!orderBook) {
      // If no order book data, use conservative estimate
      return 800000; // Enough for ~3-4 matches
    }
    
    let remainingAmount = orderAmount;
    let matchCount = 0;
    
    // Check how many orders this will match
    const ordersToMatch = isBuy ? orderBook.sell_orders : orderBook.buy_orders;
    
    if (ordersToMatch && ordersToMatch.length > 0) {
      for (const existingOrder of ordersToMatch) {
        const existingPrice = parseFloat(existingOrder.price) / 1000000;
        const existingAmount = parseFloat(existingOrder.amount) / 1000000;
        
        // Check if orders can match
        if ((isBuy && orderPrice >= existingPrice) || (!isBuy && orderPrice <= existingPrice)) {
          matchCount++;
          remainingAmount -= existingAmount;
          
          if (remainingAmount <= 0) break;
        }
      }
    }
    
    // Add gas for each match (150k per match for order execution + state updates)
    const matchGas = matchCount * 150000;
    
    // Add extra buffer for complex operations
    const bufferGas = matchCount > 2 ? 100000 : 0;
    
    const totalGas = baseGas + matchGas + bufferGas;
    
    console.log(`Order analysis:
      - Will match ${matchCount} existing orders
      - Base gas: ${baseGas}
      - Match gas: ${matchGas} (${matchCount} × 150k)
      - Buffer gas: ${bufferGas}
      - Total estimated gas: ${totalGas}`);
    
    return totalGas;
  };

  const createDexOrder = async (
    pairId: string,
    isBuy: boolean,
    price: string,
    amount: string,
    priceDenom: string,
    amountDenom: string,
    orderBook?: { buy_orders?: any[], sell_orders?: any[] }
  ) => {
    // If no client but we have an address, try to reconnect
    let signingClient = client;
    
    if (!signingClient && address && window.keplr) {
      try {
        const offlineSigner = window.keplr.getOfflineSigner(CHAIN_INFO.chainId);
        const registry = new Registry();
        registry.register('/mychain.maincoin.v1.MsgBuyMaincoin', MsgBuyMaincoinProtoType);
        registry.register('/mychain.maincoin.v1.MsgSellMaincoin', MsgSellMaincoinProtoType);
        registry.register('/mychain.dex.v1.MsgCreateOrder', MsgCreateOrderProtoType);
        registry.register('/mychain.dex.v1.MsgCancelOrder', MsgCancelOrderProtoType);
        
        signingClient = await SigningStargateClient.connectWithSigner(
          CHAIN_INFO.rpc,
          offlineSigner,
          { registry }
        );
        setClient(signingClient);
      } catch (err) {
        console.error('Failed to reconnect client:', err);
        throw new Error('Failed to connect to blockchain. Please try reconnecting your wallet.');
      }
    }
    
    if (!signingClient || !address) {
      throw new Error('Wallet not connected');
    }

    const msg = {
      typeUrl: '/mychain.dex.v1.MsgCreateOrder',
      value: {
        maker: address,
        pairId: Long.fromString(pairId),
        price: {
          denom: priceDenom,
          amount: String(Math.floor(parseFloat(price) * 1000000)),
        },
        amount: {
          denom: amountDenom,
          amount: String(Math.floor(parseFloat(amount) * 1000000)),
        },
        isBuy: isBuy,
      },
    };

    // Estimate gas based on order complexity
    const estimatedGas = estimateDexOrderGas(
      isBuy,
      parseFloat(price),
      parseFloat(amount),
      orderBook
    );
    
    const fee = {
      amount: [{ denom: 'ulc', amount: '0' }], // 0 fee since minimum-gas-prices = "0ulc"
      gas: String(estimatedGas),
    };

    try {
      const result = await signingClient.signAndBroadcast(
        address,
        [msg],
        fee,
        isBuy ? 'Creating buy order' : 'Creating sell order'
      );
      return result;
    } catch (error: any) {
      console.error('DEX order failed:', error);
      throw error;
    }
  };

  const cancelDexOrder = async (orderId: string) => {
    if (!client || !address) {
      throw new Error('Wallet not connected');
    }

    const msg = {
      typeUrl: '/mychain.dex.v1.MsgCancelOrder',
      value: {
        maker: address,
        orderId: Long.fromString(orderId),
      },
    };

    const fee = {
      amount: [{ denom: 'ulc', amount: '50000' }],
      gas: '300000',
    };

    try {
      const result = await client.signAndBroadcast(
        address,
        [msg],
        fee,
        'Canceling order'
      );
      return result;
    } catch (error: any) {
      console.error('Cancel order failed:', error);
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
    createDexOrder,
    cancelDexOrder,
  };
};