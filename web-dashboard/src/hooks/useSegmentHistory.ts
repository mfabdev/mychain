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

  // Generate calculated segment data when blockchain history is not available
  const generateCalculatedSegments = useCallback((currentEpoch: number): SegmentData[] => {
    const segments: SegmentData[] = [];
    
    // Accurate tokens needed per segment to maintain 1:10 ratio
    const tokensToBalance = [
      0,            // Segment 0: genesis
      10.09101899,  // Segment 1
      11.00031171,  // Segment 2
      11.09225827,  // Segment 3
      11.10255289,  // Segment 4
      11.10469068,  // Segment 5
      11.10601374,  // Segment 6
      11.10725553,  // Segment 7
      11.10848932,  // Segment 8
      11.10972244,  // Segment 9
      11.11095562,  // Segment 10
      11.11218892,  // Segment 11
      11.11342236,  // Segment 12
      11.11465593,  // Segment 13
      11.11588965,  // Segment 14
      11.1171235,   // Segment 15
      11.11835748,  // Segment 16
      11.11959161,  // Segment 17
      11.12082587,  // Segment 18
      11.12206027,  // Segment 19
      11.1232948,   // Segment 20
      11.12452947,  // Segment 21
      11.12576428,  // Segment 22
      11.12699923,  // Segment 23
      11.12823431,  // Segment 24
      11.12946953   // Segment 25
    ];
    
    let cumulativeSupply = 0;
    let cumulativeReserve = 0;
    
    for (let i = 0; i <= Math.min(currentEpoch, 25); i++) {
      const price = 0.0001 * Math.pow(1.001, i);
      let mcPurchased = 0;
      let devAllocation = 0;
      
      if (i === 0) {
        // Genesis segment
        mcPurchased = 100000;
        devAllocation = 0;
        cumulativeSupply = 100000;
        cumulativeReserve = 1.00;
      } else if (i === 1) {
        // First segment after genesis
        devAllocation = 10; // 0.01% of 100k
        mcPurchased = tokensToBalance[i];
        cumulativeSupply += devAllocation + mcPurchased;
        cumulativeReserve += mcPurchased * price;
      } else if (i <= 25) {
        // Other segments
        mcPurchased = tokensToBalance[i];
        devAllocation = mcPurchased * 0.0001; // 0.01% of purchased
        cumulativeSupply += devAllocation + mcPurchased;
        cumulativeReserve += mcPurchased * price;
      }
      
      const totalSupply = cumulativeSupply;
      const requiredReserve = totalSupply * price * 0.1;
      const deficit = requiredReserve - cumulativeReserve;
      
      let reserveStatus: 'perfect' | 'deficit' | 'surplus' = 'perfect';
      if (Math.abs(deficit) / requiredReserve > 0.001) {
        reserveStatus = deficit > 0 ? 'deficit' : 'surplus';
      }
      
      segments.push({
        segmentNumber: i,
        mcPurchased: mcPurchased.toFixed(2),
        devAllocation: devAllocation.toFixed(3),
        totalAdded: (mcPurchased + devAllocation).toFixed(2),
        totalSupply: totalSupply.toFixed(0),
        pricePerMC: price.toFixed(7),
        requiredReserve: requiredReserve.toFixed(2),
        actualReserve: cumulativeReserve.toFixed(6),
        reserveDeficit: Math.abs(deficit).toFixed(6),
        reserveStatus,
        // Only mark as complete if it's before current segment
        transactionHash: i < currentEpoch ? 'calculated' : undefined
      });
    }
    
    return segments;
  }, []);

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
      const response = await fetchAPI(`/mychain/maincoin/v1/segment-history?limit=${limit}`);
      
      if (response && response.segments) {
        const formattedSegments = response.segments.map(formatSegmentData);
        setSegments(formattedSegments);
        setTotalSegments(response.pagination?.total || formattedSegments.length);
      } else {
        // If no blockchain data available, generate calculated data
        const infoResponse = await fetchAPI('/mychain/maincoin/v1/segment_info');
        const currentEpoch = parseInt(infoResponse.current_epoch || '0');
        
        // Generate calculated segment data for display
        const calculatedSegments = generateCalculatedSegments(currentEpoch);
        setSegments(calculatedSegments);
        setTotalSegments(currentEpoch);
        setCurrentSegment(currentEpoch);
      }

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
      const response = await fetchAPI(`/mychain/maincoin/v1/segment/${segmentNumber}`);
      if (response && response.details) {
        return formatSegmentData(response.details.segment);
      }
      // If no data, return from calculated segments
      const calculatedSegment = segments.find(s => s.segmentNumber === segmentNumber);
      if (calculatedSegment) {
        return calculatedSegment;
      }
      throw new Error('Segment not found');
    } catch (err) {
      console.error(`Failed to load segment ${segmentNumber} details:`, err);
      // Try to return calculated data
      const calculatedSegment = segments.find(s => s.segmentNumber === segmentNumber);
      if (calculatedSegment) {
        return calculatedSegment;
      }
      throw err;
    }
  }, [formatSegmentData, segments]);

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