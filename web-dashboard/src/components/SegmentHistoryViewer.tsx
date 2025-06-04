import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { ClockIcon, CurrencyDollarIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface SegmentPurchaseRecord {
  segmentNumber: number;
  buyer: string;
  tokensBought: string;
  userTokens: string;
  devAllocation: string;
  pricePerToken: string;
  cost: string;
  isComplete: boolean;
  txHash: string;
  blockHeight: number;
  timestamp: string;
}

interface SegmentHistory {
  segmentNumber: number;
  purchases: SegmentPurchaseRecord[];
  totalTokensSold: string;
  totalDevAllocation: string;
  totalRevenue: string;
  isComplete: boolean;
  completedAtHeight: number;
  completedAt?: string;
}

interface SegmentHistoryViewerProps {
  currentSegment: number;
}

export const SegmentHistoryViewer: React.FC<SegmentHistoryViewerProps> = ({ currentSegment }) => {
  const [selectedSegment, setSelectedSegment] = useState(currentSegment);
  const [segmentHistory, setSegmentHistory] = useState<SegmentHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSegmentHistory(selectedSegment);
  }, [selectedSegment]);

  const fetchSegmentHistory = async (segmentNumber: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchAPI(`/mychain/maincoin/v1/segment_history/${segmentNumber}`);
      if (response && response.segment_history) {
        setSegmentHistory(response.segment_history);
      } else {
        setSegmentHistory(null);
      }
    } catch (err) {
      console.error('Failed to fetch segment history:', err);
      setError('Failed to load segment history');
      // Create mock data for demonstration
      setSegmentHistory({
        segmentNumber,
        purchases: [],
        totalTokensSold: '0',
        totalDevAllocation: '0',
        totalRevenue: '0',
        isComplete: false,
        completedAtHeight: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
  };

  const formatNumber = (value: string): string => {
    if (!value || value === '0') return '0.00';
    const num = parseFloat(value) / 1_000_000;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 6 
    });
  };

  const formatPrice = (value: string): string => {
    const num = parseFloat(value);
    return `$${num.toFixed(7)}`;
  };

  const formatDate = (timestamp: string): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Generate segment selector options
  const segmentOptions = [];
  for (let i = Math.max(1, currentSegment - 5); i <= currentSegment + 5; i++) {
    segmentOptions.push(i);
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-blue-400" />
          Segment Purchase History
        </h3>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Segment:</label>
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(Number(e.target.value))}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
          >
            {segmentOptions.map(num => (
              <option key={num} value={num}>
                {num} {num === currentSegment ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading segment history...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!loading && segmentHistory && (
        <>
          {/* Segment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserGroupIcon className="h-4 w-4 text-purple-400" />
                <p className="text-sm text-gray-400">Purchases</p>
              </div>
              <p className="text-xl font-bold text-white">
                {segmentHistory.purchases.length}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Tokens Sold</p>
              <p className="text-xl font-bold text-blue-400">
                {formatNumber(segmentHistory.totalTokensSold)} MC
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Dev Allocation</p>
              <p className="text-xl font-bold text-purple-400">
                {formatNumber(segmentHistory.totalDevAllocation)} MC
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CurrencyDollarIcon className="h-4 w-4 text-green-400" />
                <p className="text-sm text-gray-400">Revenue</p>
              </div>
              <p className="text-xl font-bold text-green-400">
                ${formatNumber(segmentHistory.totalRevenue)}
              </p>
            </div>
          </div>

          {/* Completion Status */}
          {segmentHistory.isComplete && (
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3 mb-4 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-green-400 font-medium">Segment Complete</p>
                <p className="text-xs text-gray-400">
                  Completed at block {segmentHistory.completedAtHeight} on {formatDate(segmentHistory.completedAt || '')}
                </p>
              </div>
            </div>
          )}

          {/* Purchase List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Individual Purchases</h4>
            
            {segmentHistory.purchases.length === 0 ? (
              <div className="text-center py-8 bg-gray-700/20 rounded-lg">
                <p className="text-gray-500">No purchases recorded for this segment yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {segmentHistory.purchases.map((purchase, index) => (
                  <div
                    key={`${purchase.txHash}-${index}`}
                    className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {formatAddress(purchase.buyer)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Block {purchase.blockHeight} • {formatDate(purchase.timestamp)}
                        </p>
                      </div>
                      {purchase.isComplete && (
                        <span className="text-xs bg-green-600/30 text-green-400 px-2 py-1 rounded">
                          Completed Segment
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Tokens:</span>
                        <span className="ml-1 text-white">{formatNumber(purchase.tokensBought)} MC</span>
                      </div>
                      <div>
                        <span className="text-gray-500">User:</span>
                        <span className="ml-1 text-green-400">{formatNumber(purchase.userTokens)} MC</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Dev:</span>
                        <span className="ml-1 text-purple-400">{formatNumber(purchase.devAllocation)} MC</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cost:</span>
                        <span className="ml-1 text-blue-400">${formatNumber(purchase.cost)}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Price: {formatPrice(purchase.pricePerToken)}/MC
                      </p>
                      {purchase.txHash && (
                        <a
                          href={`#/tx/${purchase.txHash}`}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          View TX →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};