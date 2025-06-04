import React from 'react';
import { ArrowTrendingUpIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface SegmentData {
  segment: number;
  price: number;
  costToComplete: number | null;
  tokensToComplete: number | null;
  cumulativeCost: number | null;
  isFuture: boolean;
}

interface SegmentProgressionChartProps {
  currentSegment: number;
  currentPrice: string;
  tokensNeeded?: string;
  reserveNeeded?: string;
}

export const SegmentProgressionChart: React.FC<SegmentProgressionChartProps> = ({
  currentSegment,
  currentPrice,
  tokensNeeded,
  reserveNeeded,
}) => {
  // Calculate segment progression data
  const calculateSegmentData = (): SegmentData[] => {
    const data: SegmentData[] = [];
    const basePrice = 0.0001;
    const priceIncrement = 0.00001;
    let cumulativeCost = 0;
    
    // Show current segment and next 5
    for (let i = 0; i < 6; i++) {
      const segment = currentSegment + i;
      // Each segment increases price by 0.1% (0.001)
      const price = basePrice * Math.pow(1.001, segment);
      
      let costToComplete: number;
      let tokensToComplete: number;
      
      if (i === 0 && reserveNeeded && tokensNeeded) {
        // Use actual blockchain data for current segment
        costToComplete = parseFloat(reserveNeeded);
        tokensToComplete = parseFloat(tokensNeeded);
        cumulativeCost += costToComplete;
        
        data.push({
          segment,
          price,
          costToComplete,
          tokensToComplete,
          cumulativeCost,
          isFuture: false,
        });
      } else {
        // Future segments - we can't predict accurately
        data.push({
          segment,
          price,
          costToComplete: null,
          tokensToComplete: null,
          cumulativeCost: null,
          isFuture: true,
        });
      }
    }
    
    return data;
  };

  const segmentData = calculateSegmentData();
  const maxCost = Math.max(...segmentData.filter(d => d.costToComplete !== null).map(d => d.costToComplete as number));

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-5 w-5 text-blue-400" />
          Segment Progression & Costs
        </h3>
        <span className="text-sm text-gray-400">
          Current: Segment {currentSegment}
        </span>
      </div>

      <div className="space-y-3">
        {segmentData.map((data, index) => {
          const isActive = index === 0;
          const barWidth = data.costToComplete !== null ? (data.costToComplete / maxCost) * 100 : 0;
          
          return (
            <div
              key={data.segment}
              className={`p-3 rounded-lg border ${
                isActive 
                  ? 'bg-blue-900/20 border-blue-600/30' 
                  : 'bg-gray-700/20 border-gray-600/20'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`font-medium ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>
                    Segment {data.segment}
                  </span>
                  {isActive && (
                    <span className="ml-2 text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-gray-300">
                    ${data.price.toFixed(7)}/MC
                  </div>
                  <div className="text-xs text-gray-500">
                    +{(data.segment * 0.1).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Cost to complete</span>
                  <span>{data.costToComplete !== null ? `$${data.costToComplete.toFixed(6)}` : 'TBD'}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isActive ? 'bg-blue-500' : 'bg-gray-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Tokens needed:</span>
                  <span className="ml-1 text-gray-300">
                    {data.tokensToComplete !== null ? `${data.tokensToComplete.toLocaleString(undefined, { maximumFractionDigits: 0 })} MC` : 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Cumulative:</span>
                  <span className="ml-1 text-gray-300">
                    {data.cumulativeCost !== null ? `$${data.cumulativeCost.toFixed(3)}` : 'TBD'}
                  </span>
                </div>
              </div>

              {isActive && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="flex items-center gap-2 text-xs">
                    <CurrencyDollarIcon className="h-3 w-3 text-green-400" />
                    <span className="text-gray-400">
                      Dev allocation on completion: 
                      <span className="text-purple-400 ml-1">
                        {data.tokensToComplete !== null ? `${(data.tokensToComplete * 0.0001).toFixed(4)} MC (0.01%)` : 'TBD'}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-orange-900/20 border border-orange-600/30 rounded-lg">
        <p className="text-xs text-orange-300">
          <strong>Note:</strong> Future segment costs are marked as "TBD" because they depend on the exact 
          state when each segment is reached. The amount of tokens needed varies based on total supply, 
          reserves, and dev allocations at that time. Only the current segment shows actual values from the blockchain.
        </p>
      </div>
    </div>
  );
};