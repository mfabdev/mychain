import React from 'react';
import { CodeBracketIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface DevAllocationTrackerProps {
  totalDevAllocation: string;
  currentPrice: string;
  percentOfSupply: number;
}

export const DevAllocationTracker: React.FC<DevAllocationTrackerProps> = ({
  totalDevAllocation,
  currentPrice,
  percentOfSupply,
}) => {
  const devAllocationNum = parseFloat(totalDevAllocation);
  const priceNum = parseFloat(currentPrice);
  const devValue = devAllocationNum * priceNum;

  return (
    <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
          <CodeBracketIcon className="h-5 w-5" />
          Developer Allocation Tracker
        </h3>
        <span className="text-xs text-gray-400 bg-purple-800/30 px-2 py-1 rounded">
          0.01% per segment crossing
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="h-4 w-4 text-purple-400" />
            <p className="text-sm text-gray-400">Total Allocated</p>
          </div>
          <p className="text-2xl font-bold text-purple-300">
            {devAllocationNum.toFixed(6)} MC
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {percentOfSupply.toFixed(2)}% of total supply
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="h-4 w-4 text-green-400" />
            <p className="text-sm text-gray-400">Current Value</p>
          </div>
          <p className="text-2xl font-bold text-green-400">
            ${devValue.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            At ${priceNum.toFixed(6)}/MC
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2">Allocation Model</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Segment 0→1:</span>
              <span className="text-purple-300">0.01% of tokens</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Per crossing:</span>
              <span className="text-purple-300">0.01% allocation</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Partial segments:</span>
              <span className="text-gray-400">No allocation</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-800/10 rounded-lg">
        <p className="text-xs text-purple-200">
          <strong>How it works:</strong> When a purchase completes a segment (reaches the 1:10 reserve ratio), 
          0.01% of the tokens bought in that transaction are allocated to the developer address. This minimal fee 
          supports protocol development while maintaining predictable tokenomics.
        </p>
      </div>

      {devAllocationNum > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          <p>Developer Address: <span className="font-mono text-purple-400">cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4</span></p>
        </div>
      )}
    </div>
  );
};