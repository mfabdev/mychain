import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SegmentProgressBar } from '../components/SegmentProgressBar';
import { SegmentStatisticsCard } from '../components/SegmentStatisticsCard';
import { LiveSegmentUpdates } from '../components/LiveSegmentUpdates';
import { SegmentHistoryTable } from '../components/SegmentHistoryTable';
import { SegmentDetailModal } from '../components/SegmentDetailModal';
import { useSegmentHistory } from '../hooks/useSegmentHistory';
import { fetchAPI } from '../utils/api';

export const MainCoinDashboard: React.FC = () => {
  const { segments, loading, error, currentSegment, refresh } = useSegmentHistory({ limit: 10 });
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentState, setCurrentState] = useState({
    supply: 0,
    reserves: 0,
    price: 0,
    segment: 0
  });
  const [statistics, setStatistics] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load current state
  useEffect(() => {
    const loadCurrentState = async () => {
      try {
        const response = await fetchAPI('/maincoin/segment-info');
        setCurrentState({
          supply: parseInt(response.data.current_supply) / 1000000,
          reserves: parseInt(response.data.current_reserves) / 1000000,
          price: parseInt(response.data.current_price) / 1000000000,
          segment: response.data.current_segment
        });
      } catch (err) {
        console.error('Failed to load current state:', err);
      }
    };

    loadCurrentState();
    const interval = setInterval(loadCurrentState, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Load statistics
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setStatsLoading(true);
        const response = await fetchAPI('/maincoin/segment-statistics');
        setStatistics({
          totalSegments: response.data.stats.total_segments,
          totalMcPurchased: (parseInt(response.data.stats.total_mc_purchased) / 1000000).toString(),
          totalDevAllocated: (parseInt(response.data.stats.total_dev_allocated) / 1000000).toString(),
          totalReserves: (parseInt(response.data.stats.total_reserves) / 1000000).toString(),
          averageSegmentTime: response.data.stats.average_segment_time,
          fastestSegment: response.data.stats.fastest_segment,
          slowestSegment: response.data.stats.slowest_segment,
          perfectRatioSegments: response.data.stats.perfect_ratio_segments,
          deficitSegments: response.data.stats.deficit_segments,
          surplusSegments: response.data.stats.surplus_segments,
          currentSegment: response.data.stats.current_segment,
          currentPrice: (parseInt(response.data.stats.current_price) / 1000000000).toString(),
          currentSupply: (parseInt(response.data.stats.current_supply) / 1000000).toString(),
          latestSegmentTime: response.data.stats.latest_segment_time
        });
      } catch (err) {
        console.error('Failed to load statistics:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const handleSegmentClick = (segment: any) => {
    // Prepare detailed segment data
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
      devPendingNext: '0',
      reserveBefore: prevSegment?.actualReserve || '0',
      reserveAfter: segment.actualReserve
    });
    setIsModalOpen(true);
  };

  if (loading && segments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MainCoin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">MainCoin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={refresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <Link
                to="/maincoin/history"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                View Full History
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Progress and Stats */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Segment Progress */}
            <SegmentProgressBar
              currentSupply={currentState.supply}
              currentReserves={currentState.reserves}
              currentPrice={currentState.price}
              segmentNumber={currentState.segment}
            />

            {/* Statistics */}
            {statistics && (
              <SegmentStatisticsCard
                stats={statistics}
                loading={statsLoading}
              />
            )}

            {/* Recent Segments */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Recent Segments</h2>
              </div>
              <div className="overflow-hidden">
                <SegmentHistoryTable
                  segments={segments}
                  onSegmentClick={handleSegmentClick}
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200">
                <Link
                  to="/maincoin/history"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all segments →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Live Updates */}
          <div className="space-y-8">
            <LiveSegmentUpdates maxItems={15} />
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/maincoin/buy"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Buy MainCoin
                </Link>
                <Link
                  to="/maincoin/history"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  View History
                </Link>
                <Link
                  to="/maincoin/analytics"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Analytics
                </Link>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">About MainCoin</p>
                  <p>MainCoin uses a bonding curve with automatic segment progression. Each segment maintains a 1:10 reserve ratio, and 0.01% of tokens are allocated to development.</p>
                </div>
              </div>
            </div>
          </div>
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

export default MainCoinDashboard;