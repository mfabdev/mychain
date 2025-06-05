import React from 'react';
import { formatNumber, formatUSD, formatPercent } from '../utils/formatters';

interface SegmentStatistics {
  totalSegments: number;
  totalMcPurchased: string;
  totalDevAllocated: string;
  totalReserves: string;
  averageSegmentTime: number;
  fastestSegment: number;
  slowestSegment: number;
  perfectRatioSegments: number;
  deficitSegments: number;
  surplusSegments: number;
  currentSegment: number;
  currentPrice: string;
  currentSupply: string;
  latestSegmentTime: number;
}

interface SegmentStatisticsCardProps {
  stats: SegmentStatistics;
  loading?: boolean;
}

export const SegmentStatisticsCard: React.FC<SegmentStatisticsCardProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const reserveRatioHealth = () => {
    const total = stats.perfectRatioSegments + stats.deficitSegments + stats.surplusSegments;
    if (total === 0) return 100;
    return (stats.perfectRatioSegments / total) * 100;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">MainCoin Statistics</h2>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Segments</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSegments}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Current Segment</p>
          <p className="text-2xl font-bold text-blue-600">{stats.currentSegment}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Current Price</p>
          <p className="text-2xl font-bold text-green-600">${parseFloat(stats.currentPrice).toFixed(6)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Supply</p>
          <p className="text-2xl font-bold text-purple-600">{formatNumber(parseFloat(stats.currentSupply), 0)} MC</p>
        </div>
      </div>

      {/* Token Distribution */}
      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Token Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">Total MC Purchased</p>
            <p className="text-xl font-bold text-blue-900">{formatNumber(parseFloat(stats.totalMcPurchased), 2)} MC</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 mb-1">Total Dev Allocated</p>
            <p className="text-xl font-bold text-orange-900">{formatNumber(parseFloat(stats.totalDevAllocated), 2)} MC</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 mb-1">Total Reserves</p>
            <p className="text-xl font-bold text-green-900">{formatUSD(parseFloat(stats.totalReserves))}</p>
          </div>
        </div>
      </div>

      {/* Reserve Ratio Health */}
      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Reserve Ratio Health</h3>
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Overall Health</span>
            <span className="text-sm font-medium">{formatPercent(reserveRatioHealth())}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                reserveRatioHealth() > 95 ? 'bg-green-500' :
                reserveRatioHealth() > 90 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${reserveRatioHealth()}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.perfectRatioSegments}</p>
            <p className="text-xs text-gray-500">Perfect Ratio</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.deficitSegments}</p>
            <p className="text-xs text-gray-500">Deficit</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{stats.surplusSegments}</p>
            <p className="text-xs text-gray-500">Surplus</p>
          </div>
        </div>
      </div>

      {/* Timing Statistics */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-4">Segment Timing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Average Time</p>
            <p className="text-lg font-semibold">{formatTime(stats.averageSegmentTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Fastest (Segment {stats.fastestSegment})</p>
            <p className="text-lg font-semibold text-green-600">{formatTime(stats.averageSegmentTime * 0.5)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Slowest (Segment {stats.slowestSegment})</p>
            <p className="text-lg font-semibold text-red-600">{formatTime(stats.averageSegmentTime * 2)}</p>
          </div>
        </div>
      </div>

      {/* Last Update */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Last segment completed: {new Date(stats.latestSegmentTime * 1000).toLocaleString()}
      </div>
    </div>
  );
};

export default SegmentStatisticsCard;