import React from 'react';
import { formatAmount } from '../utils/api';

interface CoinCardProps {
  name: string;
  symbol: string;
  totalSupply: string;
  price?: number;
  color: string;
  decimals?: number;
}

export const CoinCard: React.FC<CoinCardProps> = ({ 
  name, 
  symbol, 
  totalSupply, 
  price, 
  color,
  decimals = 6 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
          <span className={`text-sm font-medium ${color}`}>{symbol}</span>
        </div>
        <div className={`w-12 h-12 rounded-full ${color} bg-opacity-20 flex items-center justify-center`}>
          <span className={`text-xl font-bold ${color}`}>
            {symbol.charAt(0)}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Supply</span>
          <span className="text-sm font-medium text-gray-800">
            {formatAmount(totalSupply, decimals)} {symbol}
          </span>
        </div>
        
        {price !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Price</span>
            <span className="text-sm font-medium text-gray-800">
              ${price < 0.01 ? price.toFixed(8) : price.toFixed(4)}
            </span>
          </div>
        )}
        
        {price !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Market Cap</span>
            <span className="text-sm font-medium text-gray-800">
              ${((parseInt(totalSupply) / Math.pow(10, decimals)) * price).toLocaleString('en-US', { 
                minimumFractionDigits: price < 0.01 ? 8 : 2,
                maximumFractionDigits: price < 0.01 ? 8 : 2
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};