import React from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

interface SegmentDetail {
  segmentNumber: number;
  tokensBought: string;
  pricePerToken: string;
  segmentCost: string;
  devAllocation: string;
  userTokens: string;
  isComplete: boolean;
  tokensInSegment: string;
  tokensNeededToComplete: string;
}

interface SegmentPurchaseDetailsProps {
  segments: SegmentDetail[];
  totalUserTokens: string;
  totalDevAllocation: string;
  totalCost: string;
}

export const SegmentPurchaseDetails: React.FC<SegmentPurchaseDetailsProps> = ({
  segments,
  totalUserTokens,
  totalDevAllocation,
  totalCost,
}) => {
  if (!segments || segments.length === 0) {
    return null;
  }

  const formatNumber = (value: string): string => {
    const num = parseFloat(value) / 1_000_000;
    return num.toFixed(6);
  };

  const formatPrice = (value: string): string => {
    const num = parseFloat(value);
    return `$${num.toFixed(6)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Segment Purchase Details</h3>
      
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
        <div>
          <p className="text-sm text-gray-400">Your Tokens</p>
          <p className="text-xl font-bold text-green-400">{formatNumber(totalUserTokens)} MC</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Dev Allocation</p>
          <p className="text-xl font-bold text-purple-400">{formatNumber(totalDevAllocation)} MC</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Total Cost</p>
          <p className="text-xl font-bold text-blue-400">${formatNumber(totalCost)}</p>
        </div>
      </div>

      {/* Segment Details */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Segments Processed ({segments.length})</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {segments.map((segment, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                segment.isComplete 
                  ? 'bg-green-900/20 border-green-600/30' 
                  : 'bg-yellow-900/20 border-yellow-600/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">Segment {segment.segmentNumber}</span>
                  {segment.isComplete ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClockIcon className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {formatPrice(segment.pricePerToken)}/MC
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Tokens Bought:</span>
                  <span className="ml-2 text-white">{formatNumber(segment.tokensBought)} MC</span>
                </div>
                <div>
                  <span className="text-gray-400">Cost:</span>
                  <span className="ml-2 text-white">${formatNumber(segment.segmentCost)}</span>
                </div>
                <div>
                  <span className="text-gray-400">User Receives:</span>
                  <span className="ml-2 text-green-400">{formatNumber(segment.userTokens)} MC</span>
                </div>
                <div>
                  <span className="text-gray-400">Dev Allocation:</span>
                  <span className="ml-2 text-purple-400">
                    {segment.devAllocation === "0" ? "0" : formatNumber(segment.devAllocation)} MC
                  </span>
                </div>
              </div>

              {!segment.isComplete && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400">
                    Progress: {formatNumber(segment.tokensInSegment)} MC in segment
                    {segment.tokensNeededToComplete !== "0" && (
                      <span> • {formatNumber(segment.tokensNeededToComplete)} MC needed to complete</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dev Allocation Explanation */}
      {totalDevAllocation !== "0" && (
        <div className="mt-4 p-3 bg-purple-900/20 border border-purple-600/30 rounded-lg">
          <p className="text-xs text-purple-300">
            <strong>Dev Allocation:</strong> 0.01% of tokens are allocated to the developer when completing a segment.
            This minimal fee helps fund ongoing development and maintenance of the protocol.
          </p>
        </div>
      )}
    </div>
  );
};