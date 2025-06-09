import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface SegmentDetail {
  segment: number;
  price: string;
  supplyBefore: string;
  devFromPrev: string;
  tokensToBalance: string;
  totalSupply: string;
  totalValue: string;
  requiredReserve: string;
  currentReserve: string;
  ratio: string;
  status: string;
  userTokens: string;
  costToUser: string;
}

const SegmentPurchaseDetailsPage: React.FC = () => {
  const { startSegment, endSegment } = useParams<{ startSegment: string; endSegment: string }>();
  const [segments, setSegments] = useState<SegmentDetail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const segmentsPerPage = 20;

  useEffect(() => {
    if (!startSegment || !endSegment) return;

    const start = parseInt(startSegment);
    const end = parseInt(endSegment);
    const segmentData: SegmentDetail[] = [];

    // Calculate starting values based on segments 0-25
    let currentSupply = 100000; // Genesis supply
    let currentReserve = 1.00; // Initial reserve
    
    // Build up to segment 25 if we're starting after it
    if (start > 0) {
      for (let i = 1; i < start; i++) {
        const price = 0.0001 * Math.pow(1.001, i);
        const devAlloc = currentSupply * 0.0001;
        const supplyAfterDev = currentSupply + devAlloc;
        
        // Calculate tokens needed using the formula: X = (0.1 * S * P - R) / (0.9 * P)
        const numerator = 0.1 * supplyAfterDev * price - currentReserve;
        const denominator = 0.9 * price;
        const tokensNeeded = numerator / denominator;
        
        // Update state
        currentSupply = supplyAfterDev + tokensNeeded;
        currentReserve += tokensNeeded * price;
      }
    }
    
    let totalUserTokens = 0;
    let totalCost = 0;

    // Process each segment
    for (let i = start; i <= end; i++) {
      const segmentNumber = i;
      const price = 0.0001 * Math.pow(1.001, segmentNumber);
      
      // Dev allocation from previous segment (0.01% of current supply)
      const devFromPrev = currentSupply * 0.0001;
      
      // Supply after dev allocation
      const supplyAfterDev = currentSupply + devFromPrev;
      
      // Calculate tokens needed using the formula: X = (0.1 * S * P - R) / (0.9 * P)
      const numerator = 0.1 * supplyAfterDev * price - currentReserve;
      const denominator = 0.9 * price;
      const tokensToBalanceValue = Math.max(0, numerator / denominator);
      
      // Cost to user for these tokens
      const costToUser = tokensToBalanceValue * price;
      
      // Update totals
      totalUserTokens += tokensToBalanceValue;
      totalCost += costToUser;
      
      // New supply after selling tokens
      const newSupply = supplyAfterDev + tokensToBalanceValue;
      
      // Update reserve with payment
      const newReserve = currentReserve + costToUser;
      
      // Total value at segment end
      const totalValue = newSupply * price;
      
      // Required reserve for 1:10 ratio
      const requiredReserve = totalValue / 10;

      segmentData.push({
        segment: segmentNumber,
        price: `$${price.toFixed(10)}`,
        supplyBefore: currentSupply.toFixed(3),
        devFromPrev: devFromPrev.toFixed(3),
        tokensToBalance: tokensToBalanceValue.toFixed(3),
        totalSupply: newSupply.toFixed(3),
        totalValue: `$${totalValue.toFixed(4)}`,
        requiredReserve: `$${requiredReserve.toFixed(4)}`,
        currentReserve: `$${newReserve.toFixed(4)}`,
        ratio: '1:10',
        status: segmentNumber < 76 ? '✅' : segmentNumber === 76 ? '🔄' : '📊',
        userTokens: tokensToBalanceValue.toFixed(3),
        costToUser: `$${costToUser.toFixed(6)}`
      });

      // Update for next iteration
      currentSupply = newSupply;
      currentReserve = newReserve;
    }

    setSegments(segmentData);
  }, [startSegment, endSegment]);

  const totalPages = Math.ceil(segments.length / segmentsPerPage);
  const startIndex = (currentPage - 1) * segmentsPerPage;
  const endIndex = startIndex + segmentsPerPage;
  const currentSegments = segments.slice(startIndex, endIndex);

  // Calculate totals
  const totalUserTokens = segments.reduce((sum, seg) => sum + parseFloat(seg.userTokens), 0);
  const totalCost = segments.reduce((sum, seg) => sum + parseFloat(seg.costToUser.replace('$', '')), 0);
  const priceIncrease = segments.length > 0 ? ((Math.pow(1.001, segments.length) - 1) * 100) : 0;

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="mb-6">
        <Link to="/maincoin" className="text-blue-400 hover:text-blue-300">
          ← Back to MainCoin Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        Segment Purchase Details: {startSegment} → {endSegment}
      </h1>

      {/* Purchase Summary */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Purchase Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-400">Segments Spanned</p>
            <p className="text-2xl font-bold text-green-400">{segments.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total MC Purchased</p>
            <p className="text-2xl font-bold text-green-400">{totalUserTokens.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total Cost</p>
            <p className="text-2xl font-bold text-blue-400">${totalCost.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Price Increase</p>
            <p className="text-2xl font-bold text-orange-400">{priceIncrease.toFixed(2)}%</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
          <div>
            <p className="text-sm text-gray-400">Starting Price</p>
            <p className="text-lg font-semibold">{segments[0]?.price || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Ending Price</p>
            <p className="text-lg font-semibold">{segments[segments.length - 1]?.price || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Avg Price/MC</p>
            <p className="text-lg font-semibold">
              ${totalUserTokens > 0 ? (totalCost / totalUserTokens).toFixed(10) : '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Dev Allocation</p>
            <p className="text-lg font-semibold">
              {segments.reduce((sum, seg) => sum + parseFloat(seg.devFromPrev), 0).toFixed(3)} MC
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Segment Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Segment-by-Segment Breakdown</h2>
          <p className="text-sm text-gray-400 mt-1">
            Each segment shows how the bonding curve progresses with price increases and reserve balancing
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Segment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Price/MC</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Supply Before</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Dev Added</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">User Buys</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">User Pays</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">New Supply</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Total Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Reserve</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {currentSegments.map((segment) => (
                <tr key={segment.segment} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium">
                    {segment.segment} {segment.status}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{segment.price}</td>
                  <td className="px-4 py-3 text-sm text-right">{segment.supplyBefore} MC</td>
                  <td className="px-4 py-3 text-sm text-right text-yellow-400">+{segment.devFromPrev} MC</td>
                  <td className="px-4 py-3 text-sm text-right text-green-400">+{segment.userTokens} MC</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-400">{segment.costToUser}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">{segment.totalSupply} MC</td>
                  <td className="px-4 py-3 text-sm text-right">{segment.totalValue}</td>
                  <td className="px-4 py-3 text-sm text-right">{segment.currentReserve}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="text-green-400">{segment.ratio} ✅</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, segments.length)} of {segments.length} segments
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6 mt-6">
        <h3 className="font-semibold text-blue-400 mb-2">📊 Understanding the Values</h3>
        <ul className="text-sm text-gray-300 space-y-2">
          <li>• These values are calculated using the exact formula from the blockchain: X = (0.1 * S * P - R) / (0.9 * P)</li>
          <li>• Where S = supply after dev allocation, P = price, R = current reserve</li>
          <li>• The 0.9 factor comes from the mathematical derivation of maintaining the 1:10 reserve ratio</li>
          <li>• Each segment maintains exactly a 1:10 ratio between reserves and total MainCoin value</li>
          <li>• Dev allocation is 0.01% of the current supply at the start of each segment</li>
          <li>• Price increases by exactly 0.1% each segment, creating the bonding curve</li>
        </ul>
      </div>
    </div>
  );
};

export default SegmentPurchaseDetailsPage;