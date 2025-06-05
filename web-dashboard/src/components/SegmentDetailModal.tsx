import React from 'react';
import { formatNumber } from '../utils/formatters';

interface SegmentDetail {
  segmentNumber: number;
  status: 'completed' | 'in_progress';
  completedAt?: string;
  transactionHash?: string;
  userPurchase: string;
  devDistribution: string;
  totalAdded: string;
  startingPrice: string;
  endingPrice: string;
  totalCost: string;
  reserveRatio: string;
  supplyBefore: string;
  supplyAfter: string;
  devPendingNext: string;
  reserveBefore: string;
  reserveAfter: string;
}

interface SegmentDetailModalProps {
  segment: SegmentDetail;
  isOpen: boolean;
  onClose: () => void;
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({
  segment,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const formatMC = (value: string) => {
    const num = parseFloat(value);
    if (num < 1) {
      return num.toFixed(6) + ' MC';
    }
    return formatNumber(num, 3) + ' MC';
  };

  const formatUSD = (value: string) => {
    return '$' + formatNumber(parseFloat(value), 2);
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Segment {segment.segmentNumber} Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    segment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {segment.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                  </span>
                </p>
              </div>
              {segment.completedAt && (
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="font-medium">{new Date(segment.completedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
            {segment.transactionHash && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Transaction</p>
                <a 
                  href={`/tx/${segment.transactionHash}`}
                  className="font-mono text-sm text-blue-600 hover:text-blue-800"
                >
                  {truncateHash(segment.transactionHash)}
                </a>
              </div>
            )}
          </div>

          {/* Token Distribution */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Token Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">User Purchase</span>
                <span className="font-medium">{formatMC(segment.userPurchase)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Dev Distribution</span>
                <span className="font-medium">{formatMC(segment.devDistribution)}</span>
              </div>
              <div className="flex justify-between py-2 font-semibold">
                <span>Total Added</span>
                <span>{formatMC(segment.totalAdded)}</span>
              </div>
            </div>
          </div>

          {/* Economics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Economics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Starting Price</p>
                <p className="font-medium">${parseFloat(segment.startingPrice).toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ending Price</p>
                <p className="font-medium">${parseFloat(segment.endingPrice).toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="font-medium">{formatUSD(segment.totalCost)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reserve Ratio</p>
                <p className="font-medium">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    segment.reserveRatio === '10.00%' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {segment.reserveRatio}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Supply Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Supply Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Supply Before</span>
                <span className="font-medium">{formatNumber(parseFloat(segment.supplyBefore), 0)} MC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supply After</span>
                <span className="font-medium">{formatNumber(parseFloat(segment.supplyAfter), 0)} MC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reserve Before</span>
                <span className="font-medium">{formatUSD(segment.reserveBefore)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reserve After</span>
                <span className="font-medium">{formatUSD(segment.reserveAfter)}</span>
              </div>
              {parseFloat(segment.devPendingNext) > 0 && (
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-600">Dev Pending for Next</span>
                  <span className="font-medium text-orange-600">{formatMC(segment.devPendingNext)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegmentDetailModal;