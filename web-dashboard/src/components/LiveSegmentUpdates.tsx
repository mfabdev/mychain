import React, { useState, useEffect } from 'react';
import { formatNumber, formatUSD, truncateAddress, formatTimestamp } from '../utils/formatters';
import { getRpcEndpoint } from '../utils/endpoints';

interface LiveUpdate {
  id: string;
  type: 'purchase' | 'segment_complete' | 'dev_distribution';
  timestamp: string;
  data: {
    buyer?: string;
    amount?: string;
    tokens?: string;
    segmentNumber?: number;
    devAmount?: string;
    newPrice?: string;
  };
}

interface LiveSegmentUpdatesProps {
  maxItems?: number;
}

export const LiveSegmentUpdates: React.FC<LiveSegmentUpdatesProps> = ({ maxItems = 10 }) => {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const rpcEndpoint = getRpcEndpoint();
    const wsEndpoint = rpcEndpoint.replace('http://', 'ws://').replace('https://', 'wss://') + '/websocket';
    const ws = new WebSocket(wsEndpoint);
    
    const subscribe = () => {
      // Subscribe to buy_maincoin events
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'subscribe',
        params: {
          query: "tm.event='Tx' AND buy_maincoin.buyer EXISTS"
        },
        id: 1
      }));
    };

    ws.onopen = () => {
      setIsConnected(true);
      subscribe();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.result?.events) {
          const events = data.result.events;
          
          // Parse buy_maincoin event
          if (events['buy_maincoin.buyer']) {
            const newUpdate: LiveUpdate = {
              id: `${Date.now()}-${Math.random()}`,
              type: 'purchase',
              timestamp: new Date().toISOString(),
              data: {
                buyer: events['buy_maincoin.buyer'][0],
                amount: events['buy_maincoin.amount_spent']?.[0],
                tokens: events['buy_maincoin.tokens_bought']?.[0],
              }
            };
            
            setUpdates(prev => [newUpdate, ...prev].slice(0, maxItems));
            
            // Check for segment completion
            const segmentsCompleted = events['buy_maincoin.segments_completed']?.[0];
            if (segmentsCompleted && parseInt(segmentsCompleted) > 0) {
              const segmentUpdate: LiveUpdate = {
                id: `${Date.now()}-segment`,
                type: 'segment_complete',
                timestamp: new Date().toISOString(),
                data: {
                  segmentNumber: parseInt(events['buy_maincoin.new_epoch']?.[0]) - 1,
                  newPrice: events['buy_maincoin.new_price']?.[0]
                }
              };
              setUpdates(prev => [segmentUpdate, ...prev].slice(0, maxItems));
            }
            
            // Check for dev distribution
            const devTokens = events['buy_maincoin.dev_tokens']?.[0];
            if (devTokens && parseInt(devTokens) > 0) {
              const devUpdate: LiveUpdate = {
                id: `${Date.now()}-dev`,
                type: 'dev_distribution',
                timestamp: new Date().toISOString(),
                data: {
                  devAmount: devTokens,
                  segmentNumber: parseInt(events['buy_maincoin.new_epoch']?.[0])
                }
              };
              setUpdates(prev => [devUpdate, ...prev].slice(0, maxItems));
            }
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [maxItems, isPaused]);

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'segment_complete':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'dev_distribution':
        return (
          <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatUpdate = (update: LiveUpdate) => {
    switch (update.type) {
      case 'purchase':
        return (
          <div>
            <p className="font-medium text-gray-900">New Purchase</p>
            <p className="text-sm text-gray-600">
              {truncateAddress(update.data.buyer || '')} bought {formatNumber(parseInt(update.data.tokens || '0') / 1000000, 2)} MC for {formatUSD(parseInt(update.data.amount || '0') / 1000000)}
            </p>
          </div>
        );
      case 'segment_complete':
        return (
          <div>
            <p className="font-medium text-green-700">Segment {update.data.segmentNumber} Completed!</p>
            <p className="text-sm text-gray-600">
              New price: ${parseFloat(update.data.newPrice || '0').toFixed(6)} per MC
            </p>
          </div>
        );
      case 'dev_distribution':
        return (
          <div>
            <p className="font-medium text-orange-700">Dev Allocation Distributed</p>
            <p className="text-sm text-gray-600">
              {formatNumber(parseInt(update.data.devAmount || '0') / 1000000, 6)} MC distributed for segment {update.data.segmentNumber}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Live Updates</h3>
          <div className={`flex items-center space-x-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'} ${isConnected ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <button
          onClick={() => setPaused(!isPaused)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {updates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Waiting for updates...</p>
          </div>
        ) : (
          updates.map((update) => (
            <div
              key={update.id}
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getUpdateIcon(update.type)}
              </div>
              <div className="flex-1 min-w-0">
                {formatUpdate(update)}
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(update.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear button */}
      {updates.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setUpdates([])}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear all updates
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveSegmentUpdates;