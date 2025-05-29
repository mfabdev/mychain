import axios from 'axios';
import { CHAIN_INFO, API_ENDPOINTS } from './config';
import { Balance } from '../types';

const api = axios.create({
  baseURL: CHAIN_INFO.rest,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const fetchMainCoinPrice = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.maincoinPrice);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const fetchMainCoinSegment = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.maincoinSegment);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const fetchDexOrderBook = async (pairId: string) => {
  try {
    const response = await api.get(API_ENDPOINTS.dexOrderBook(pairId));
    return response.data;
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

export const formatAmount = (amount: string, decimals: number = 6): string => {
  const value = parseInt(amount) / Math.pow(10, decimals);
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
};