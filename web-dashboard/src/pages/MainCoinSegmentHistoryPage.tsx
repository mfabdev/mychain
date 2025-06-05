import React, { useState, useMemo } from 'react';
import { SegmentHistoryTable } from '../components/SegmentHistoryTable';
import { SegmentDetailModal } from '../components/SegmentDetailModal';
import { SegmentHistoryChart } from '../components/SegmentHistoryChart';
import { SegmentHistoryFilter, FilterOptions } from '../components/SegmentHistoryFilter';
import { SegmentHistoryExport } from '../components/SegmentHistoryExport';
import { useSegmentHistory } from '../hooks/useSegmentHistory';

export const MainCoinSegmentHistoryPage: React.FC = () => {
  const { segments, loading, error, currentSegment, totalSegments, refresh, getChartData } = useSegmentHistory();
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    showCompleted: true,
    showInProgress: true
  });

  // Apply filters to segments
  const filteredSegments = useMemo(() => {
    return segments.filter(segment => {
      // Status filter
      const isCompleted = segment.transactionHash !== undefined;
      if (!filters.showCompleted && isCompleted) return false;
      if (!filters.showInProgress && !isCompleted) return false;

      // Segment range filter
      if (filters.minSegment !== undefined && segment.segmentNumber < filters.minSegment) return false;
      if (filters.maxSegment !== undefined && segment.segmentNumber > filters.maxSegment) return false;

      // Date filter
      if (filters.dateFrom && segment.timestamp) {
        const segmentDate = new Date(segment.timestamp);
        const fromDate = new Date(filters.dateFrom);
        if (segmentDate < fromDate) return false;
      }
      if (filters.dateTo && segment.timestamp) {
        const segmentDate = new Date(segment.timestamp);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        if (segmentDate > toDate) return false;
      }

      // Dev allocation filter
      if (filters.minDevAllocation !== undefined) {
        const devAmount = parseFloat(segment.devAllocation);
        if (devAmount < filters.minDevAllocation) return false;
      }

      // Transaction hash filter
      if (filters.searchTxHash) {
        const search = filters.searchTxHash.toLowerCase();
        if (!segment.transactionHash?.toLowerCase().includes(search)) return false;
      }

      return true;
    });
  }, [segments, filters]);

  const handleSegmentClick = (segment: any) => {
    // Find previous segment for comparison
    const segmentIndex = segments.findIndex(s => s.segmentNumber === segment.segmentNumber);
    const prevSegment = segmentIndex > 0 ? segments[segmentIndex - 1] : null;
    const nextSegment = segmentIndex < segments.length - 1 ? segments[segmentIndex + 1] : null;

    setSelectedSegment({
      segmentNumber: segment.segmentNumber,
      status: segment.transactionHash ? 'completed' : 'in_progress',
      completedAt: segment.timestamp,
      transactionHash: segment.transactionHash,
      userPurchase: segment.mcPurchased,
      devDistribution: segment.devAllocation,
      totalAdded: segment.totalAdded,
      startingPrice: segment.pricePerMC,
      endingPrice: nextSegment?.pricePerMC || segment.pricePerMC,
      totalCost: segment.actualReserve,
      reserveRatio: ((parseFloat(segment.actualReserve) / (parseFloat(segment.totalSupply) * parseFloat(segment.pricePerMC))) * 100).toFixed(2) + '%',
      supplyBefore: prevSegment?.totalSupply || '0',
      supplyAfter: segment.totalSupply,
      devPendingNext: '0', // Would need to get from segment data
      reserveBefore: prevSegment?.actualReserve || '0',
      reserveAfter: segment.actualReserve
    });
    setIsModalOpen(true);
  };

  if (loading && segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading segment history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading segment history: {error}</p>
        <button
          onClick={refresh}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">MainCoin Segment History</h1>
          <button
            onClick={refresh}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Current Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Current Segment:</span> {currentSegment} of {totalSegments} total segments
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle and Export */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowChart(!showChart)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showChart ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
              {showChart ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
          <SegmentHistoryExport segments={filteredSegments} />
        </div>
      </div>

      {/* Filters */}
      <SegmentHistoryFilter
        filters={filters}
        onFilterChange={setFilters}
        totalSegments={totalSegments}
      />

      {/* Charts */}
      {showChart && segments.length > 0 && (
        <div className="mb-8">
          <SegmentHistoryChart data={getChartData()} />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Segment Details ({filteredSegments.length} segments)
          </h2>
        </div>
        <div className="overflow-hidden">
          <SegmentHistoryTable 
            segments={filteredSegments}
            onSegmentClick={handleSegmentClick}
          />
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSegment && (
        <SegmentDetailModal
          segment={selectedSegment}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MainCoinSegmentHistoryPage;