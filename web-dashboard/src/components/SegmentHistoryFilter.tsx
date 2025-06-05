import React from 'react';

export interface FilterOptions {
  showCompleted: boolean;
  showInProgress: boolean;
  minSegment?: number;
  maxSegment?: number;
  dateFrom?: string;
  dateTo?: string;
  minDevAllocation?: number;
  searchTxHash?: string;
}

interface SegmentHistoryFilterProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  totalSegments: number;
}

export const SegmentHistoryFilter: React.FC<SegmentHistoryFilterProps> = ({
  filters,
  onFilterChange,
  totalSegments
}) => {
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const handleReset = () => {
    onFilterChange({
      showCompleted: true,
      showInProgress: true,
      minSegment: undefined,
      maxSegment: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      minDevAllocation: undefined,
      searchTxHash: undefined
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showCompleted}
                onChange={(e) => handleFilterChange('showCompleted', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Completed</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showInProgress}
                onChange={(e) => handleFilterChange('showInProgress', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">In Progress</span>
            </label>
          </div>
        </div>

        {/* Segment Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Segment Range
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max={totalSegments}
              placeholder="From"
              value={filters.minSegment || ''}
              onChange={(e) => handleFilterChange('minSegment', e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              max={totalSegments}
              placeholder="To"
              value={filters.maxSegment || ''}
              onChange={(e) => handleFilterChange('maxSegment', e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Additional Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Dev Allocation (MC)
          </label>
          <input
            type="number"
            min="0"
            step="0.000001"
            placeholder="0.000001"
            value={filters.minDevAllocation || ''}
            onChange={(e) => handleFilterChange('minDevAllocation', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          
          <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
            Transaction Hash
          </label>
          <input
            type="text"
            placeholder="Search by tx hash..."
            value={filters.searchTxHash || ''}
            onChange={(e) => handleFilterChange('searchTxHash', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default SegmentHistoryFilter;