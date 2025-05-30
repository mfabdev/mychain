import axios from 'axios';
import { CHAIN_INFO, API_ENDPOINTS } from './config';
import { Balance } from '../types';

const api = axios.create({
  baseURL: CHAIN_INFO.rest,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export const fetchNodeInfo = async () => {
  const response = await api.get(API_ENDPOINTS.nodeInfo);
  return response.data;
};

export const fetchLatestBlock = async () => {
  const response = await api.get(API_ENDPOINTS.latestBlock);
  return response.data;
};

export const fetchBalance = async (address: string): Promise<Balance[]> => {
  const response = await api.get(API_ENDPOINTS.balance(address));
  return response.data.balances;
};

export const fetchTotalSupply = async (): Promise<Balance[]> => {
  const response = await api.get(API_ENDPOINTS.totalSupply);
  return response.data.supply;
};

// Note: These endpoints don't exist in current implementation
// export const fetchMainCoinPrice = async () => {
//   try {
//     const response = await api.get(API_ENDPOINTS.maincoinPrice);
//     return response.data;
//   } catch (error) {
//     return null;
//   }
// };

// export const fetchMainCoinSegment = async () => {
//   try {
//     const response = await api.get(API_ENDPOINTS.maincoinSegment);
//     return response.data;
//   } catch (error) {
//     return null;
//   }
// };

// Note: Order book endpoint not implemented yet
export const fetchDexOrderBook = async (pairId: string) => {
  try {
    // const response = await api.get(API_ENDPOINTS.dexOrderBook(pairId));
    // return response.data;
    return { buy_orders: [], sell_orders: [] }; // Return empty order book for now
  } catch (error) {
    return { buy_orders: [], sell_orders: [] };
  }
};

export const fetchUserRewards = async (address: string) => {
  try {
    const response = await api.get(API_ENDPOINTS.dexUserRewards(address));
    return response.data;
  } catch (error) {
    return { pending_lc: { amount: '0' }, claimed_lc: { amount: '0' } };
  }
};

export const fetchDexParams = async () => {
  try {
    const response = await api.get('/mychain/dex/v1/params');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const fetchMainCoinParams = async () => {
  try {
    const response = await api.get('/mychain/maincoin/v1/params');
    return response.data;
  } catch (error) {
    return null;
  }
};

// Note: Order book endpoint doesn't exist yet - will be implemented when DEX trading is active
// export const fetchLcMarketPrice = async () => {
//   try {
//     // Try to get recent trading data from DEX
//     // For LC/MC trading pair, check recent trades or order book
//     const orderBook = await fetchDexOrderBook('LC_MC');
//     
//     // Calculate market price from order book mid-point
//     if (orderBook.buy_orders?.length > 0 && orderBook.sell_orders?.length > 0) {
//       const highestBid = parseFloat(orderBook.buy_orders[0].price);
//       const lowestAsk = parseFloat(orderBook.sell_orders[0].price);
//       return (highestBid + lowestAsk) / 2;
//     }
//     
//     // No trading activity yet - will use initial price
//     return null;
//   } catch (error) {
//     return null;
//   }
// };

export const formatAmount = (amount: string, decimals: number = 6): string => {
  const value = parseInt(amount) / Math.pow(10, decimals);
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Generic API fetch function for components
export const fetchAPI = async (endpoint: string) => {
  const response = await api.get(endpoint);
  return response.data;
};