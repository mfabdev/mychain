import React from 'react';
import { formatNumber, formatUSD, formatPercent } from '../utils/formatters';

interface SegmentProgressBarProps {
  currentSupply: number;
  currentReserves: number;
  currentPrice: number;
  segmentNumber: number;
}

export const SegmentProgressBar: React.FC<SegmentProgressBarProps> = ({
  currentSupply,
  currentReserves,
  currentPrice,
  segmentNumber
}) => {
  // Calculate progress to next segment (1:10 ratio)
  const totalValue = currentSupply * currentPrice;
  const requiredReserves = totalValue * 0.1;
  const reserveDeficit = requiredReserves - currentReserves;
  const currentRatio = currentReserves / totalValue;
  
  // Progress is how close we are to perfect 1:10 ratio
  const progress = Math.min(100, (currentRatio / 0.1) * 100);
  
  // Estimate tokens needed for next segment
  const tokensNeeded = reserveDeficit > 0 ? reserveDeficit / (0.9 * currentPrice) : 0;
  const costToComplete = tokensNeeded * currentPrice;

  const getProgressColor = () => {
    if (progress >= 99.9) return 'bg-green-500';
    if (progress >= 95) return 'bg-blue-500';
    if (progress >= 90) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getStatusText = () => {
    if (progress >= 99.9) return 'Ready for next segment';
    if (progress >= 95) return 'Approaching completion';
    if (progress >= 90) return 'Nearing target';
    return 'In progress';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Segment {segmentNumber} Progress</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          progress >= 99.9 ? 'bg-green-100 text-green-800' :
          progress >= 95 ? 'bg-blue-100 text-blue-800' :
          progress >= 90 ? 'bg-yellow-100 text-yellow-800' :
          'bg-orange-100 text-orange-800'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Reserve Ratio Progress</span>
          <span className="text-sm font-medium">{formatPercent(progress)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
          {/* Animated stripes for active progress */}
          {progress < 99.9 && (
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-stripe-pattern animate-stripe"></div>
            </div>
          )}
        </div>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Current Reserve Ratio</p>
          <p className="text-lg font-semibold">{formatPercent(currentRatio * 100)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Target Ratio</p>
          <p className="text-lg font-semibold">10.00%</p>
        </div>
      </div>

      {/* Completion Estimate */}
      {tokensNeeded > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">To Complete Segment</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">MC Needed</span>
              <span className="text-sm font-medium">{formatNumber(tokensNeeded, 2)} MC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cost Estimate</span>
              <span className="text-sm font-medium">{formatUSD(costToComplete)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Reserve Deficit</span>
              <span className="text-sm font-medium text-red-600">{formatUSD(reserveDeficit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Current State */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total Supply</p>
            <p className="text-sm font-semibold">{formatNumber(currentSupply, 0)} MC</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reserves</p>
            <p className="text-sm font-semibold">{formatUSD(currentReserves)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-sm font-semibold">${currentPrice.toFixed(6)}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes stripe {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-stripe {
          animation: stripe 2s linear infinite;
        }
        
        .bg-stripe-pattern {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 20px
          );
        }
      `}</style>
    </div>
  );
};

export default SegmentProgressBar;