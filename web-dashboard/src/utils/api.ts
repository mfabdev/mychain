import axios from 'axios';
import { CHAIN_INFO, API_ENDPOINTS } from './config';
import { Balance } from '../types';

// Check localStorage for custom endpoint
const getApiEndpoint = () => {
  // Check window config first
  if ((window as any).__MYCHAIN_CONFIG__?.REST_ENDPOINT) {
    return (window as any).__MYCHAIN_CONFIG__.REST_ENDPOINT;
  }
  const customEndpoint = localStorage.getItem('MYCHAIN_API_ENDPOINT');
  return customEndpoint || CHAIN_INFO.rest;
};

// Create multiple API instances for fallback
const api = axios.create({
  baseURL: getApiEndpoint(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Direct API instance for AWS deployment
const directApi = axios.create({
  baseURL: 'http://18.226.214.89:1317',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add request interceptor to check for updated endpoint
api.interceptors.request.use(
  (config) => {
    const customEndpoint = localStorage.getItem('MYCHAIN_API_ENDPOINT');
    if (customEndpoint && config.baseURL !== customEndpoint) {
      config.baseURL = customEndpoint;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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

// Helper function to make requests with fallback
const fetchWithFallback = async (endpoint: string) => {
  try {
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    if (window.location.hostname === '18.226.214.89') {
      const response = await directApi.get(endpoint);
      return response.data;
    }
    throw error;
  }
};

export const fetchNodeInfo = async () => {
  return fetchWithFallback(API_ENDPOINTS.nodeInfo);
};

export const fetchLatestBlock = async () => {
  return fetchWithFallback(API_ENDPOINTS.latestBlock);
};

export const fetchBalance = async (address: string): Promise<Balance[]> => {
  const data = await fetchWithFallback(API_ENDPOINTS.balance(address));
  return data.balances;
};

export const fetchTotalSupply = async (): Promise<Balance[]> => {
  const data = await fetchWithFallback(API_ENDPOINTS.totalSupply);
  return data.supply;
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
  return value.toFixed(6);
};

// Generic API fetch function for components with fallback
export const fetchAPI = async (endpoint: string) => {
  try {
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    // If proxy fails, try direct connection for AWS
    if (window.location.hostname === '18.226.214.89') {
      try {
        const response = await directApi.get(endpoint);
        return response.data;
      } catch (directError) {
        throw error; // Throw original error
      }
    }
    throw error;
  }
};