import React, { useState } from 'react';
import { formatNumber } from '../utils/formatters';

interface SegmentHistoryEntry {
  segmentNumber: number;
  mcPurchased: string;
  devAllocation: string;
  totalAdded: string;
  totalSupply: string;
  pricePerMC: string;
  requiredReserve: string;
  actualReserve: string;
  reserveDeficit: string;
  reserveStatus: 'perfect' | 'deficit' | 'surplus';
  timestamp?: string;
  transactionHash?: string;
}

interface SegmentHistoryTableProps {
  segments: SegmentHistoryEntry[];
  onSegmentClick?: (segment: SegmentHistoryEntry) => void;
}

export const SegmentHistoryTable: React.FC<SegmentHistoryTableProps> = ({
  segments,
  onSegmentClick
}) => {
  const [sortField, setSortField] = useState<keyof SegmentHistoryEntry>('segmentNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof SegmentHistoryEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedSegments = [...segments].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * modifier;
    }
    return String(aVal).localeCompare(String(bVal)) * modifier;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'perfect':
        return 'text-green-600 bg-green-50';
      case 'deficit':
        return 'text-red-600 bg-red-50';
      case 'surplus':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatMC = (value: string) => {
    const num = parseFloat(value);
    if (num < 1) {
      return num.toFixed(6) + ' MC';
    }
    return formatNumber(num, 2) + ' MC';
  };

  const formatUSD = (value: string) => {
    return '$' + formatNumber(parseFloat(value), 2);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              onClick={() => handleSort('segmentNumber')}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Segment
              {sortField === 'segmentNumber' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              MC Purchased
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dev Allocation
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Added
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Supply
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price $/MC
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Required Reserve
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actual Reserve
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reserve Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedSegments.map((segment) => (
            <tr 
              key={segment.segmentNumber}
              onClick={() => onSegmentClick?.(segment)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {segment.segmentNumber}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatMC(segment.mcPurchased)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {formatMC(segment.devAllocation)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatMC(segment.totalAdded)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(parseFloat(segment.totalSupply), 0)} MC
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                ${parseFloat(segment.pricePerMC).toFixed(6)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatUSD(segment.requiredReserve)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatUSD(segment.actualReserve)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(segment.reserveStatus)}`}>
                  {segment.reserveStatus === 'perfect' ? 'Perfect' : 
                   segment.reserveStatus === 'deficit' ? `Deficit ${formatUSD(segment.reserveDeficit)}` :
                   `Surplus ${formatUSD(segment.reserveDeficit)}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SegmentHistoryTable;