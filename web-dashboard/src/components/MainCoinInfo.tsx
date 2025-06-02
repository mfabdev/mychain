import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';

interface MainCoinData {
  currentPrice: string;
  totalSupply: string;
  reserveBalance: string;
  tokensNeeded: string;
  reserveRatio: string;
  currentEpoch: number;
}

interface MainCoinParams {
  initialPrice: string;
  priceIncrement: string;
  purchaseDenom: string;
  feePercentage: string;
  maxSupply: string;
  devAddress: string;
}

export const MainCoinInfo: React.FC = () => {
  const [mainCoinData, setMainCoinData] = useState<MainCoinData | null>(null);
  const [params, setParams] = useState<MainCoinParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMainCoinData = async () => {
      try {
        setError(null);
        
        // Fetch MainCoin parameters
        const paramsResponse = await fetchAPI('/mychain/maincoin/v1/params');
        setParams(paramsResponse.params);

        // Try to fetch segment info (contains reserves, price, etc.)
        try {
          const segmentResponse = await fetchAPI('/mychain/maincoin/v1/segment_info');
          // Map snake_case API response to camelCase component state
          setMainCoinData({
            currentPrice: segmentResponse.current_price,
            totalSupply: segmentResponse.total_supply,
            reserveBalance: segmentResponse.reserve_balance,
            tokensNeeded: segmentResponse.tokens_needed,
            reserveRatio: segmentResponse.reserve_ratio,
            currentEpoch: parseInt(segmentResponse.current_epoch)
          });
        } catch (segmentError) {
          console.log('Segment info not available, using default values');
          // Use correct default values for 1:10 reserve ratio
          setMainCoinData({
            currentPrice: '0.000100000000000000', // $0.0001 per MainCoin for 10% reserve ratio
            totalSupply: '100000000000', // 100,000 MainCoin (with 6 decimals)
            reserveBalance: '1000000', // 1 TestUSD reserve (with 6 decimals)
            tokensNeeded: '0',
            reserveRatio: '0.100000000000000000', // 10% reserve ratio
            currentEpoch: 0
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching MainCoin data:', error);
        setError('Failed to load MainCoin information');
        setLoading(false);
      }
    };

    fetchMainCoinData();
    const interval = setInterval(fetchMainCoinData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount: string, decimals = 6): string => {
    const value = parseFloat(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const formatPrice = (price: string): string => {
    const value = parseFloat(price);
    return value.toFixed(6);
  };

  const formatPercentage = (ratio: string): string => {
    const value = parseFloat(ratio) * 100;
    return value.toFixed(4);
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-400 mb-2">MainCoin Information</h2>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">MainCoin Information</h2>
        <span className="text-sm text-gray-400">Epoch #{mainCoinData?.currentEpoch || 0}</span>
      </div>

      {/* Price and Supply Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">Current Price</p>
          <p className="text-lg font-bold text-green-400">
            {mainCoinData ? formatPrice(mainCoinData.currentPrice) : '1.000000'} TestUSD
          </p>
          <p className="text-xs text-gray-500">per 1 MainCoin</p>
        </div>
        
        <div className="bg-gray-700/30 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">Total Supply</p>
          <p className="text-lg font-bold text-blue-400">
            {mainCoinData ? formatAmount(mainCoinData.totalSupply) : '100,000.00'} MC
          </p>
          <p className="text-xs text-gray-500">MainCoin in circulation</p>
        </div>
        
        <div className="bg-gray-700/30 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">Reserve Balance</p>
          <p className="text-lg font-bold text-purple-400">
            {mainCoinData ? formatAmount(mainCoinData.reserveBalance) : '1.00'} TestUSD
          </p>
          <p className="text-xs text-gray-500">Backing MainCoin</p>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2">Reserve Ratio</p>
          <p className="text-lg font-bold text-yellow-400">
            {mainCoinData ? formatPercentage(mainCoinData.reserveRatio) : '0.0010'}%
          </p>
          <p className="text-xs text-gray-500">Reserve / Total Value</p>
        </div>
        
        <div className="bg-gray-700/30 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2">Tokens Needed</p>
          <p className="text-lg font-bold text-orange-400">
            {mainCoinData ? formatAmount(mainCoinData.tokensNeeded) : '0.00'} MainCoin
          </p>
          <p className="text-xs text-gray-500">To achieve 1:10 balance</p>
        </div>
      </div>

      {/* Module Parameters */}
      {params && (
        <div className="bg-gray-700/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Module Parameters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400">Initial Price</p>
              <p className="font-mono">{formatPrice(params.initialPrice || '0.0001')} TestUSD</p>
            </div>
            <div>
              <p className="text-gray-400">Price Increment</p>
              <p className="font-mono">{formatPrice(params.priceIncrement || '0.0')}</p>
            </div>
            <div>
              <p className="text-gray-400">Purchase Denom</p>
              <p className="font-mono">{params.purchaseDenom || 'utestusd'}</p>
            </div>
            <div>
              <p className="text-gray-400">Fee Percentage</p>
              <p className="font-mono">{formatPercentage(params.feePercentage || '0.0')}%</p>
            </div>
            <div>
              <p className="text-gray-400">Max Supply</p>
              <p className="font-mono">{formatAmount(params.maxSupply || '0')}</p>
            </div>
            <div>
              <p className="text-gray-400">Dev Address</p>
              <p className="font-mono text-xs">{params.devAddress || 'Not set'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• MainCoin is backed by TestUSD reserves</p>
        <p>• Price may fluctuate based on supply and demand</p>
        <p>• Reserve ratio indicates the backing strength</p>
      </div>
    </div>
  );
};