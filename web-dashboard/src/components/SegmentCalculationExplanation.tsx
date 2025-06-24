import React from 'react';

interface CalculationProps {
  segmentNumber: number;
  supplyBefore: number;
  devFromPrev: number;
  tokensPurchased: number;
  price: number;
  reserveBefore: number;
}

export const SegmentCalculationExplanation: React.FC<CalculationProps> = ({
  segmentNumber,
  supplyBefore,
  devFromPrev,
  tokensPurchased,
  price,
  reserveBefore
}) => {
  // Calculate all derived values
  const supplyAfterDev = supplyBefore + devFromPrev;
  const requiredReserveAfterDev = supplyAfterDev * price * 0.1;
  const reserveDeficit = requiredReserveAfterDev - reserveBefore;
  const tokensCalculated = reserveDeficit / (0.9 * price);
  const costOfTokens = tokensPurchased * price;
  const finalSupply = supplyAfterDev + tokensPurchased;
  const finalReserve = reserveBefore + costOfTokens;
  const finalRequiredReserve = finalSupply * price * 0.1;
  const reserveRatio = finalReserve / (finalSupply * price);

  return (
    <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-3">
      <h4 className="font-semibold text-gray-900">Segment {segmentNumber} Calculation Breakdown:</h4>
      
      <div className="space-y-2">
        <div className="border-b pb-2">
          <p className="font-medium text-gray-700">1. Initial State:</p>
          <ul className="ml-4 space-y-1 text-gray-600">
            <li>• Supply before: {supplyBefore.toFixed(6)} MC</li>
            <li>• Reserve before: ${reserveBefore.toFixed(6)}</li>
            <li>• Price: ${price.toFixed(7)} per MC</li>
          </ul>
        </div>

        <div className="border-b pb-2">
          <p className="font-medium text-gray-700">2. Dev Allocation Applied:</p>
          <ul className="ml-4 space-y-1 text-gray-600">
            <li>• Dev allocation: {devFromPrev.toFixed(3)} MC (0.01% of previous segment)</li>
            <li>• Supply after dev: {supplyBefore.toFixed(6)} + {devFromPrev.toFixed(3)} = {supplyAfterDev.toFixed(6)} MC</li>
            <li>• Reserve unchanged: ${reserveBefore.toFixed(6)}</li>
          </ul>
        </div>

        <div className="border-b pb-2">
          <p className="font-medium text-gray-700">3. Calculate Reserve Deficit:</p>
          <ul className="ml-4 space-y-1 text-gray-600">
            <li>• Required reserve = Supply × Price × 0.1</li>
            <li>• Required = {supplyAfterDev.toFixed(6)} × ${price.toFixed(7)} × 0.1 = ${requiredReserveAfterDev.toFixed(6)}</li>
            <li>• Deficit = ${requiredReserveAfterDev.toFixed(6)} - ${reserveBefore.toFixed(6)} = ${reserveDeficit.toFixed(6)}</li>
          </ul>
        </div>

        <div className="border-b pb-2">
          <p className="font-medium text-gray-700">4. Calculate Tokens Needed (Formula):</p>
          <ul className="ml-4 space-y-1 text-gray-600">
            <li>• Formula: Tokens = Reserve Deficit / (0.9 × Price)</li>
            <li>• Why 0.9? Because buying tokens increases both supply AND reserve</li>
            <li>• Calculation: ${reserveDeficit.toFixed(6)} / (0.9 × ${price.toFixed(7)})</li>
            <li>• = ${reserveDeficit.toFixed(6)} / ${(0.9 * price).toFixed(7)}</li>
            <li>• = {tokensCalculated.toFixed(6)} MC</li>
            <li>• Actual purchased: {tokensPurchased.toFixed(6)} MC</li>
          </ul>
        </div>

        <div className="border-b pb-2">
          <p className="font-medium text-gray-700">5. Final State After Purchase:</p>
          <ul className="ml-4 space-y-1 text-gray-600">
            <li>• Tokens purchased: {tokensPurchased.toFixed(6)} MC</li>
            <li>• Cost: {tokensPurchased.toFixed(6)} × ${price.toFixed(7)} = ${costOfTokens.toFixed(6)}</li>
            <li>• Final supply: {supplyAfterDev.toFixed(6)} + {tokensPurchased.toFixed(3)} = {finalSupply.toFixed(6)} MC</li>
            <li>• Final reserve: ${reserveBefore.toFixed(6)} + ${costOfTokens.toFixed(6)} = ${finalReserve.toFixed(6)}</li>
          </ul>
        </div>

        <div>
          <p className="font-medium text-gray-700">6. Verification:</p>
          <ul className="ml-4 space-y-1 text-gray-600">
            <li>• Required reserve: {finalSupply.toFixed(6)} × ${price.toFixed(7)} × 0.1 = ${finalRequiredReserve.toFixed(6)}</li>
            <li>• Actual reserve: ${finalReserve.toFixed(6)}</li>
            <li>• Reserve ratio: ${finalReserve.toFixed(6)} / (${(finalSupply * price).toFixed(6)}) = {(reserveRatio * 100).toFixed(3)}%</li>
            <li>• Target ratio: 10%</li>
            <li>• Status: {Math.abs(reserveRatio - 0.1) < 0.0001 ? '✅ Perfect balance' : '⚠️ Slight deviation'}</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>Key Insight:</strong> The formula uses 0.9 × Price because when you buy X tokens at price P, 
          you increase the supply by X but also increase the reserve by X × P. The math works out to needing 
          Reserve Deficit / (0.9 × Price) tokens to maintain the exact 1:10 ratio.
        </p>
      </div>
    </div>
  );
};