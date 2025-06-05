import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../utils/api';

export interface SegmentData {
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

interface UseSegmentHistoryOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

export const useSegmentHistory = (options: UseSegmentHistoryOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 10000, // 10 seconds
    limit = 50
  } = options;

  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSegment, setCurrentSegment] = useState<number>(0);
  const [totalSegments, setTotalSegments] = useState<number>(0);

  const formatSegmentData = useCallback((rawSegment: any): SegmentData => {
    const mcPurchased = parseInt(rawSegment.tokens_minted || '0') / 1000000;
    const devAllocation = parseInt(rawSegment.dev_distributed || '0') / 1000000;
    const totalSupply = parseInt(rawSegment.total_supply || '0') / 1000000;
    const price = parseInt(rawSegment.price || '0') / 1000000000;
    const reserves = parseInt(rawSegment.reserves || '0') / 1000000;
    
    const requiredReserve = totalSupply * price * 0.1;
    const deficit = requiredReserve - reserves;
    
    let reserveStatus: 'perfect' | 'deficit' | 'surplus' = 'perfect';
    if (Math.abs(deficit) / requiredReserve > 0.001) {
      reserveStatus = deficit > 0 ? 'deficit' : 'surplus';
    }

    return {
      segmentNumber: rawSegment.segment_number,
      mcPurchased: mcPurchased.toString(),
      devAllocation: devAllocation.toString(),
      totalAdded: (mcPurchased + devAllocation).toString(),
      totalSupply: totalSupply.toString(),
      pricePerMC: price.toString(),
      requiredReserve: requiredReserve.toString(),
      actualReserve: reserves.toString(),
      reserveDeficit: Math.abs(deficit).toString(),
      reserveStatus,
      timestamp: rawSegment.timestamp,
      transactionHash: rawSegment.tx_hash
    };
  }, []);

  const loadSegmentHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load segment history
      const response = await fetchAPI(`/maincoin/segment-history?limit=${limit}`);
      const formattedSegments = response.data.segments.map(formatSegmentData);
      setSegments(formattedSegments);
      setTotalSegments(response.data.pagination?.total || formattedSegments.length);

      // Get current segment info
      const infoResponse = await fetchAPI('/maincoin/segment-info');
      setCurrentSegment(infoResponse.data.current_segment || 0);

    } catch (err) {
      console.error('Failed to load segment history:', err);
      setError('Failed to load segment history');
    } finally {
      setLoading(false);
    }
  }, [limit, formatSegmentData]);

  // Initial load
  useEffect(() => {
    loadSegmentHistory();
  }, [loadSegmentHistory]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadSegmentHistory();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadSegmentHistory]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:26657/websocket');
    
    const subscribeToEvents = () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'subscribe',
        params: {
          query: "tm.event='Tx' AND buy_maincoin.segments_completed EXISTS"
        },
        id: 1
      }));
    };

    ws.onopen = subscribeToEvents;
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.result?.events?.['buy_maincoin.segments_completed']) {
          // New segments completed, reload data
          loadSegmentHistory();
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [loadSegmentHistory]);

  const getSegmentDetails = useCallback(async (segmentNumber: number) => {
    try {
      const response = await fetchAPI(`/maincoin/segment/${segmentNumber}`);
      return formatSegmentData(response.data);
    } catch (err) {
      console.error(`Failed to load segment ${segmentNumber} details:`, err);
      throw err;
    }
  }, [formatSegmentData]);

  const getChartData = useCallback(() => {
    return segments.map(segment => ({
      segment: segment.segmentNumber,
      price: parseFloat(segment.pricePerMC),
      supply: parseFloat(segment.totalSupply),
      reserves: parseFloat(segment.actualReserve),
      devAllocation: parseFloat(segment.devAllocation),
      reserveRatio: (parseFloat(segment.actualReserve) / (parseFloat(segment.totalSupply) * parseFloat(segment.pricePerMC))) * 100
    }));
  }, [segments]);

  return {
    segments,
    loading,
    error,
    currentSegment,
    totalSegments,
    refresh: loadSegmentHistory,
    getSegmentDetails,
    getChartData
  };
};