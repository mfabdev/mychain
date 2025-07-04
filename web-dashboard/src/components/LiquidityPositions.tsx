import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { formatUnixTimestamp } from '../utils/formatters';

// Component to visualize market price range
const MarketPriceRangeChart: React.FC<{
  allBuyOrders: any[];
  allSellOrders: any[];
  allOrderRewardsMap: Map<number, any>;
  mcPrice: number;
}> = ({ allBuyOrders, allSellOrders, allOrderRewardsMap, mcPrice }) => {
  console.log('MarketPriceRangeChart rendering with:', {
    buyOrders: allBuyOrders.length,
    sellOrders: allSellOrders.length,
    rewardsMapSize: allOrderRewardsMap.size,
    mcPrice
  });
  // Process all orders with their eligibility status
  const processedOrders: Array<{
    orderId: number;
    price: number;
    value: number;
    isBuy: boolean;
    status: string;
    volumeCapFraction: number;
  }> = [];
  
  // Process buy orders (sorted by price descending) - v2
  const sortedBuyOrders = [...allBuyOrders].sort((a, b) => {
    const priceA = parseFloat(a.price.amount) / 1000000;
    const priceB = parseFloat(b.price.amount) / 1000000;
    return priceB - priceA; // Highest to lowest for buys
  });
  
  sortedBuyOrders.forEach(order => {
    // Price is already in micro-units, so 100 = $0.0001
    const price = parseFloat(order.price.amount) / 1000000;
    const amount = parseFloat(order.amount.amount) / 1000000;
    const filled = parseFloat(order.filled_amount.amount) / 1000000;
    const remaining = amount - filled;
    const value = remaining * price;
    
    console.log('Processing buy order:', {
      orderId: order.id,
      priceRaw: order.price.amount,
      price,
      remaining,
      value
    });
    
    if (remaining > 0) {
      const orderId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
      const rewardInfo = allOrderRewardsMap.get(orderId);
      const volumeCapFraction = rewardInfo ? parseFloat(rewardInfo.volume_cap_fraction || "1") : 1;
      
      let status = 'eligible';
      if (volumeCapFraction === 0) {
        status = 'ineligible';
      } else if (volumeCapFraction < 1) {
        status = 'partial';
      }
      
      console.log(`Buy order ${orderId}: volumeCapFraction=${volumeCapFraction}, status=${status}`);
      
      processedOrders.push({
        orderId,
        price,
        value,
        isBuy: true,
        status,
        volumeCapFraction
      });
    }
  });
  
  // Process sell orders (sorted by price ascending)
  const sortedSellOrders = [...allSellOrders].sort((a, b) => {
    const priceA = parseFloat(a.price.amount) / 1000000;
    const priceB = parseFloat(b.price.amount) / 1000000;
    return priceA - priceB; // Lowest to highest for sells
  });
  
  sortedSellOrders.forEach(order => {
    // Price is already in micro-units, so 105 = $0.000105
    const price = parseFloat(order.price.amount) / 1000000;
    const amount = parseFloat(order.amount.amount) / 1000000;
    const filled = parseFloat(order.filled_amount.amount) / 1000000;
    const remaining = amount - filled;
    const value = remaining * price;
    
    console.log('Processing sell order:', {
      orderId: order.id,
      priceRaw: order.price.amount,
      price,
      remaining,
      value
    });
    
    if (remaining > 0) {
      const orderId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
      const rewardInfo = allOrderRewardsMap.get(orderId);
      const volumeCapFraction = rewardInfo ? parseFloat(rewardInfo.volume_cap_fraction || "1") : 1;
      
      let status = 'eligible';
      if (volumeCapFraction === 0) {
        status = 'ineligible';
      } else if (volumeCapFraction < 1) {
        status = 'partial';
      }
      
      console.log(`Sell order ${orderId}: volumeCapFraction=${volumeCapFraction}, status=${status}`);
      
      processedOrders.push({
        orderId,
        price,
        value,
        isBuy: false,
        status,
        volumeCapFraction
      });
    }
  });
  
  // Find price range
  const allPrices = processedOrders.map(o => o.price);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const priceRange = maxPrice - minPrice;
  
  console.log('Market Price Range Debug:', {
    processedOrders: processedOrders.length,
    minPrice,
    maxPrice,
    priceRange,
    mcPrice
  });
  
  // Debug order status by price
  console.log('Order Status by Price:');
  const sortedByPrice = [...processedOrders].sort((a, b) => a.price - b.price);
  sortedByPrice.forEach(order => {
    console.log(`Price: $${order.price.toFixed(6)} - ${order.isBuy ? 'BUY' : 'SELL'} - Status: ${order.status} - VolCapFraction: ${order.volumeCapFraction}`);
  });
  
  // Calculate positions on chart (0-100%)
  const getPosition = (price: number) => {
    if (priceRange === 0) return 50;
    return ((price - minPrice) / priceRange) * 100;
  };
  
  // Group orders by price for stacking
  const priceGroups = new Map<string, typeof processedOrders>();
  processedOrders.forEach(order => {
    const key = `${order.price}-${order.isBuy}`;
    if (!priceGroups.has(key)) {
      priceGroups.set(key, []);
    }
    const group = priceGroups.get(key);
    if (group) {
      group.push(order);
    }
  });
  
  // Find the gap between buy and sell
  const highestBuyPrice = Math.max(...processedOrders.filter(o => o.isBuy).map(o => o.price), 0);
  const lowestSellPrice = Math.min(...processedOrders.filter(o => !o.isBuy).map(o => o.price), Infinity);
  
  // Simple test to ensure component renders
  if (!allBuyOrders || !allSellOrders) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-300">💹 Market Price Range</h3>
        <div className="text-center text-gray-400 py-4">
          Loading market data...
        </div>
      </div>
    );
  }

  // Sort all orders by price for range coloring
  const sortedAllOrders = [...processedOrders].sort((a, b) => a.price - b.price);
  
  // Group orders by price to detect mixed statuses
  const ordersByPrice = new Map();
  processedOrders.forEach(order => {
    const price = order.price;
    if (!ordersByPrice.has(price)) {
      ordersByPrice.set(price, []);
    }
    ordersByPrice.get(price).push(order);
  });
  
  // Create price ranges with their status
  const priceRanges = [];
  for (let i = 0; i < sortedAllOrders.length - 1; i++) {
    const currentOrder = sortedAllOrders[i];
    const nextOrder = sortedAllOrders[i + 1];
    
    // Check if current position has mixed statuses
    const ordersAtCurrentPrice = ordersByPrice.get(currentOrder.price) || [];
    const currentStatuses = new Set(ordersAtCurrentPrice.map((o: any) => o.status));
    const ordersAtNextPrice = ordersByPrice.get(nextOrder.price) || [];
    const nextStatuses = new Set(ordersAtNextPrice.map((o: any) => o.status));
    
    // Determine the status of this range based on the orders
    let rangeStatus = 'eligible';
    let isMixed = false;
    
    // Get the actual status from the first order at each price
    const currentStatus = ordersAtCurrentPrice[0]?.status || currentOrder.status;
    const nextStatus = ordersAtNextPrice[0]?.status || nextOrder.status;
    
    // Check for mixed statuses at either end
    if (currentStatuses.size > 1 || nextStatuses.size > 1) {
      isMixed = true;
      // Determine dominant status for mixed positions
      if (currentStatuses.has('eligible') || nextStatuses.has('eligible')) {
        rangeStatus = 'mixed-eligible';
      } else if (currentStatuses.has('partial') || nextStatuses.has('partial')) {
        rangeStatus = 'mixed-partial';
      } else {
        rangeStatus = 'mixed-ineligible';
      }
    } else {
      // Single status at both ends - use the worst status
      if (currentStatus === 'ineligible' || nextStatus === 'ineligible') {
        rangeStatus = 'ineligible';
      } else if (currentStatus === 'partial' || nextStatus === 'partial') {
        rangeStatus = 'partial';
      } else if (currentStatus === 'eligible' && nextStatus === 'eligible') {
        rangeStatus = 'eligible';
      }
    }
    
    priceRanges.push({
      startPrice: currentOrder.price,
      endPrice: nextOrder.price,
      status: rangeStatus,
      isMixed,
      startPos: getPosition(currentOrder.price),
      endPos: getPosition(nextOrder.price)
    });
  }

  // Separate buy and sell orders for detailed charts
  const buyOrdersProcessed = processedOrders.filter(o => o.isBuy).sort((a, b) => b.price - a.price);
  const sellOrdersProcessed = processedOrders.filter(o => !o.isBuy).sort((a, b) => a.price - b.price);

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-300">💹 Market Price Range Overview</h3>
      
      {processedOrders.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No active orders to display
        </div>
      ) : (
        <>
          {/* Price labels */}
          <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>${minPrice.toFixed(6)}</span>
          <span>Current MC: ${mcPrice.toFixed(6)}</span>
          <span>${maxPrice.toFixed(6)}</span>
        </div>
        
        {/* Chart container with padding for labels and indicators */}
        <div className="relative bg-gray-900/50 rounded-lg p-2" style={{ paddingBottom: '120px', paddingTop: '60px' }}>
          {/* Volume indicators at the top */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '60px' }}>
            {Array.from(ordersByPrice.entries()).map(([price, ordersAtPrice], index) => {
              const position = getPosition(price);
              // Calculate total volume at this price point
              const totalVolume = ordersAtPrice.reduce((sum: number, order: any) => {
                const amount = parseFloat(order.value) / order.price; // Convert value back to amount
                return sum + amount;
              }, 0);
              
              return (
                <div
                  key={`volume-${price}`}
                  className="absolute text-center"
                  style={{
                    left: `${position}%`,
                    transform: 'translateX(-50%)',
                    top: '5px'
                  }}
                >
                  {/* Volume number */}
                  <div className="text-xs font-bold text-yellow-400 mb-1">
                    {totalVolume >= 1000 ? `${(totalVolume/1000).toFixed(1)}k` : totalVolume.toFixed(1)} MC
                  </div>
                  {/* Connecting line/bracket */}
                  <div className="relative">
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-yellow-400/50" style={{ height: '30px' }}></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-3">
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-yellow-400/50"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Inner chart area */}
          <div className="relative h-32 overflow-visible">
          {/* Price range coloring - THICKER LINE */}
          <div className="absolute bottom-0 left-0 right-0 h-2">
            {/* No orders range before first order */}
            {minPrice < sortedAllOrders[0].price && (
              <div 
                className="absolute h-full bg-gray-700"
                style={{ 
                  left: '0%',
                  width: `${getPosition(sortedAllOrders[0].price)}%`
                }}
              />
            )}
            
            {/* Colored ranges between orders */}
            {priceRanges.map((range, idx) => (
              <div
                key={idx}
                className={`absolute h-full ${
                  range.status === 'mixed-eligible' ? 'bg-gradient-to-r from-green-500 to-yellow-500' :
                  range.status === 'mixed-partial' ? 'bg-gradient-to-r from-yellow-500 to-red-500' :
                  range.status === 'mixed-ineligible' ? 'bg-gradient-to-r from-red-500 to-gray-500' :
                  range.status === 'eligible' ? 'bg-green-500' :
                  range.status === 'partial' ? 'bg-yellow-500' :
                  range.status === 'ineligible' ? 'bg-red-500' :
                  'bg-gray-700'
                }`}
                style={{
                  left: `${range.startPos}%`,
                  width: `${range.endPos - range.startPos}%`
                }}
              />
            ))}
            
            {/* No orders range after last order */}
            {maxPrice > sortedAllOrders[sortedAllOrders.length - 1].price && (
              <div 
                className="absolute h-full bg-gray-700"
                style={{ 
                  left: `${getPosition(sortedAllOrders[sortedAllOrders.length - 1].price)}%`,
                  width: `${100 - getPosition(sortedAllOrders[sortedAllOrders.length - 1].price)}%`
                }}
              />
            )}
          </div>
          
          {/* Price dots on the line with prices below */}
          {Array.from(ordersByPrice.entries()).map(([price, ordersAtPrice], index) => {
            const position = getPosition(price);
            const statuses = new Set(ordersAtPrice.map((o: any) => o.status));
            const isMixed = statuses.size > 1;
            
            // Determine dot style based on mixed status
            let dotStyle = '';
            if (isMixed) {
              // Mixed status - use gradient or striped pattern
              if (statuses.has('eligible') && statuses.has('partial')) {
                dotStyle = 'bg-gradient-to-r from-green-400 to-yellow-400';
              } else if (statuses.has('partial') && statuses.has('ineligible')) {
                dotStyle = 'bg-gradient-to-r from-yellow-400 to-gray-400';
              } else {
                dotStyle = 'bg-gradient-to-r from-green-400 to-gray-400';
              }
            } else {
              // Single status - all orders at this price have the same status
              const status = ordersAtPrice[0].status;
              if (status === 'eligible') {
                dotStyle = 'bg-green-400';
              } else if (status === 'partial') {
                dotStyle = 'bg-yellow-400';
              } else {
                dotStyle = 'bg-red-500'; // Use red for ineligible
              }
            }
            
            // Alternate label positions to avoid overlap
            const labelOffset = index % 2 === 0 ? '20px' : '40px';
            
            return (
              <div
                key={`dot-${price}`}
                className="absolute"
                style={{
                  bottom: '-2px',
                  left: `${position}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {/* The dot */}
                <div
                  className={`w-3 h-3 ${dotStyle} rounded-full border-2 border-gray-900 z-10 ${isMixed ? 'ring-2 ring-purple-400' : ''}`}
                  title={`$${price.toFixed(6)}`}
                />
                
                {/* Price label below the dot - LARGER */}
                <div 
                  className="absolute text-gray-300 whitespace-nowrap text-center font-medium"
                  style={{
                    top: labelOffset,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    lineHeight: '1.2'
                  }}
                >
                  <div className="font-mono">${price.toFixed(6)}</div>
                  <div className="text-gray-400" style={{ fontSize: '9px' }}>
                    {isMixed ? 'MIXED' : 
                     ordersAtPrice.every((o: any) => o.isBuy) ? 'BUY' : 
                     ordersAtPrice.every((o: any) => !o.isBuy) ? 'SELL' : 'BUY/SELL'}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Directional indicators for eligible order placement */}
          <div className="absolute left-0 right-0" style={{ bottom: '-65px' }}>
            {/* Find eligible buy range */}
            {(() => {
              const eligibleBuyOrders = processedOrders.filter(o => o.isBuy && o.status === 'eligible');
              const eligibleSellOrders = processedOrders.filter(o => !o.isBuy && o.status === 'eligible');
              
              if (eligibleBuyOrders.length > 0) {
                const minBuyPrice = Math.min(...eligibleBuyOrders.map(o => o.price));
                const maxBuyPrice = Math.max(...eligibleBuyOrders.map(o => o.price));
                const startPos = getPosition(minBuyPrice);
                const endPos = getPosition(maxBuyPrice);
                
                return (
                  <div className="absolute flex items-center" style={{ left: `${startPos}%`, width: `${endPos - startPos}%` }}>
                    <div className="w-full relative">
                      <div className="absolute inset-0 border-t-2 border-green-500 opacity-50"></div>
                      <div className="absolute left-0 top-0 transform -translate-y-1/2">
                        <div className="text-green-500 text-lg">←</div>
                      </div>
                      <div className="absolute right-0 top-0 transform -translate-y-1/2">
                        <div className="text-green-500 text-lg">→</div>
                      </div>
                      <div className="absolute left-1/2 transform -translate-x-1/2 -top-4 text-green-400 text-xs font-semibold whitespace-nowrap">
                        Buy Rewards: Right → Left (≤$${maxBuyPrice.toFixed(6)})
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Find eligible sell range */}
            {(() => {
              const eligibleSellOrders = processedOrders.filter(o => !o.isBuy && o.status === 'eligible');
              
              if (eligibleSellOrders.length > 0) {
                const minSellPrice = Math.min(...eligibleSellOrders.map(o => o.price));
                const maxSellPrice = Math.max(...eligibleSellOrders.map(o => o.price));
                const startPos = getPosition(minSellPrice);
                const endPos = getPosition(maxSellPrice);
                
                return (
                  <div className="absolute flex items-center" style={{ left: `${startPos}%`, width: `${endPos - startPos}%`, top: '20px' }}>
                    <div className="w-full relative">
                      <div className="absolute inset-0 border-t-2 border-red-500 opacity-50"></div>
                      <div className="absolute left-0 top-0 transform -translate-y-1/2">
                        <div className="text-red-500 text-lg">←</div>
                      </div>
                      <div className="absolute right-0 top-0 transform -translate-y-1/2">
                        <div className="text-red-500 text-lg">→</div>
                      </div>
                      <div className="absolute left-1/2 transform -translate-x-1/2 -top-4 text-red-400 text-xs font-semibold whitespace-nowrap">
                        Sell Rewards SHOULD BE: Right → Left (but it's backwards!)
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Ineligible zone indicator */}
            {(() => {
              const ineligibleSells = processedOrders.filter(o => !o.isBuy && o.status === 'ineligible');
              if (ineligibleSells.length > 0) {
                const maxIneligibleSellPrice = Math.max(...ineligibleSells.map(o => o.price));
                return (
                  <div className="absolute left-0 right-0" style={{ top: '45px' }}>
                    <div className="text-center text-gray-400 text-xs">
                      ⚠️ Sell orders below ${(maxIneligibleSellPrice + 0.000001).toFixed(6)} are too close to spread (no rewards)
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Reward distribution issue indicator */}
            {(() => {
              const sellOrders = processedOrders.filter(o => !o.isBuy).sort((a, b) => b.price - a.price);
              let showPriorityIssue = false;
              
              if (sellOrders.length > 1) {
                const highestSell = sellOrders[0];
                const hasIncorrectPriority = highestSell.status === 'partial' && sellOrders.some(o => o.price < highestSell.price && o.status === 'eligible');
                
                if (hasIncorrectPriority) {
                  showPriorityIssue = true;
                  return (
                    <div className="absolute left-0 right-0" style={{ top: '65px' }}>
                      <div className="text-center text-red-500 text-xs font-bold">
                        ⚠️ CRITICAL: Sell reward logic is REVERSED!
                      </div>
                      <div className="text-center text-orange-400 text-xs mt-1">
                        Highest sell at ${highestSell.price.toFixed(6)} gets only {(highestSell.volumeCapFraction * 100).toFixed(1)}% rewards
                      </div>
                      <div className="text-orange-300 text-xs mt-1">
                        Expected: Like buys, rewards should go from furthest to closest (right to left)
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}
            
            {/* Bonus price indicators */}
            {(() => {
              const partialOrders = processedOrders.filter(o => o.status === 'partial');
              if (partialOrders.length > 0) {
                const bonusPrices = Array.from(new Set(partialOrders.map(o => o.price)));
                // Check if we showed priority issue
                const sellOrders = processedOrders.filter(o => !o.isBuy).sort((a, b) => b.price - a.price);
                const showOffset = sellOrders.length > 1 && sellOrders[0].status === 'partial' && 
                                 sellOrders.some(o => o.price < sellOrders[0].price && o.status === 'eligible');
                
                return (
                  <div className="absolute left-0 right-0" style={{ top: showOffset ? '95px' : '65px' }}>
                    <div className="text-center text-yellow-400 text-xs font-semibold mb-1">
                      Partial Reward Prices:
                    </div>
                    <div className="flex justify-center gap-3">
                      {bonusPrices.map(price => (
                        <div key={price} className="text-yellow-300 font-mono text-xs">
                          ${price.toFixed(6)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          
          {/* Reward flow direction indicators */}
          <div className="absolute top-2 left-0 right-0 flex justify-between px-4">
            <div className="text-green-400 text-xs flex items-center gap-1">
              <span>Buy rewards</span>
              <span className="text-lg">→</span>
            </div>
            <div className="text-red-400 text-xs flex items-center gap-1">
              <span className="text-lg">←</span>
              <span>Sell rewards (expected)</span>
            </div>
          </div>
          
          {/* Current price line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20"
            style={{ left: `${getPosition(mcPrice)}%` }}
            title={`Current MC Price: $${mcPrice.toFixed(6)}`}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-blue-400 whitespace-nowrap">
              MC
            </div>
          </div>
          
          {/* Uncovered territory - gap between highest buy and lowest sell */}
          {highestBuyPrice < lowestSellPrice && lowestSellPrice !== Infinity && (
            <>
              {/* Visual gap indicator */}
              <div 
                className="absolute h-full bg-gray-800/50 border-x border-gray-600 border-dashed"
                style={{ 
                  left: `${getPosition(highestBuyPrice)}%`,
                  width: `${getPosition(lowestSellPrice) - getPosition(highestBuyPrice)}%`
                }}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold">
                  SPREAD
                </div>
              </div>
              
              {/* Add gap to the bottom range line */}
              <div 
                className="absolute bottom-0 h-2 bg-gray-700"
                style={{ 
                  left: `${getPosition(highestBuyPrice)}%`,
                  width: `${getPosition(lowestSellPrice) - getPosition(highestBuyPrice)}%`
                }}
              />
            </>
          )}
          
          {/* Render orders */}
          {Array.from(priceGroups.entries()).map(([key, orders], groupIndex) => {
            const position = getPosition(orders[0].price);
            const isBuy = orders[0].isBuy;
            // Alternate label positions to avoid overlap
            const labelOffset = groupIndex % 2 === 0 ? '8px' : '28px';
            
            return (
              <div key={key} className="absolute" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}>
                {/* Stack orders at same price */}
                {orders.map((order, index) => {
                  // Make bars more visible - minimum 20px, scale up based on value
                  const height = Math.max(20, Math.min(60, order.value * 10)); // Scale height by value
                  const bottom = 20 + index * 25; // Stack vertically, leave space for price label
                  
                  let bgColor = '';
                  let borderColor = '';
                  if (order.status === 'eligible') {
                    bgColor = isBuy ? 'bg-green-500' : 'bg-red-500';
                    borderColor = isBuy ? 'border-green-600' : 'border-red-600';
                  } else if (order.status === 'partial') {
                    bgColor = isBuy ? 'bg-yellow-500' : 'bg-orange-500';
                    borderColor = isBuy ? 'border-yellow-600' : 'border-orange-600';
                  } else {
                    bgColor = 'bg-gray-600';
                    borderColor = 'border-gray-700';
                  }
                  
                  console.log(`Rendering order ${order.orderId}: ${isBuy ? 'BUY' : 'SELL'} - status: ${order.status} - colors: ${bgColor}`);
                  
                  return (
                    <div
                      key={`${order.orderId}`}
                      className={`absolute ${bgColor} ${borderColor} border-2 rounded-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                      style={{
                        width: '8px',
                        height: `${height}px`,
                        bottom: `${bottom}px`,
                        left: '-4px'
                      }}
                      title={`Order #${order.orderId} - ${isBuy ? 'Buy' : 'Sell'} at $${order.price.toFixed(6)} - Value: $${order.value.toFixed(2)} - ${order.status}${order.status === 'partial' ? ` (${(order.volumeCapFraction * 100).toFixed(0)}%)` : ''}`}
                    />
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-6 space-y-2">
          <div className="text-xs font-semibold text-gray-300">Order Bars:</div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 border border-green-600 rounded-sm"></div>
              <span className="text-gray-400">Buy (Eligible)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 border border-yellow-600 rounded-sm"></div>
              <span className="text-gray-400">Buy (Partial)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 border border-red-600 rounded-sm"></div>
              <span className="text-gray-400">Sell (Eligible)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 border border-orange-600 rounded-sm"></div>
              <span className="text-gray-400">Sell (Partial)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-600 border border-gray-700 rounded-sm"></div>
              <span className="text-gray-400">Ineligible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-3 bg-blue-500"></div>
              <span className="text-gray-400">Current Price</span>
            </div>
          </div>
          
          <div className="text-xs font-semibold text-gray-300 mt-3">Price Range Colors:</div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-green-500"></div>
              <span className="text-gray-400">Eligible Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-yellow-500"></div>
              <span className="text-gray-400">Partial Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-red-500"></div>
              <span className="text-gray-400">Ineligible Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-gradient-to-r from-green-500 to-yellow-500"></div>
              <span className="text-gray-400">Mixed Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-gray-700"></div>
              <span className="text-gray-400">No Orders</span>
            </div>
          </div>
        </div>
        
        {/* Price Range Information */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          {/* Buy Side Ranges */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Buy Order Status by Price</h4>
            <div className="space-y-3 text-xs">
              {(() => {
                // Group buy orders by price
                const buyOrders = processedOrders.filter(o => o.isBuy).sort((a, b) => b.price - a.price);
                const priceGroups = new Map();
                
                buyOrders.forEach(order => {
                  const price = order.price.toFixed(6);
                  if (!priceGroups.has(price)) {
                    priceGroups.set(price, { eligible: 0, partial: 0, ineligible: 0 });
                  }
                  priceGroups.get(price)[(order as any).status]++;
                });
                
                return Array.from(priceGroups.entries()).map(([price, counts]) => (
                  <div key={price} className="border-l-2 border-gray-700 pl-3">
                    <div className="font-mono text-gray-200 mb-1">${price}</div>
                    {counts.eligible > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded"></div>
                        <span className="text-gray-400">{counts.eligible} eligible order{counts.eligible > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {counts.partial > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                        <span className="text-gray-400">{counts.partial} partial order{counts.partial > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {counts.ineligible > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded"></div>
                        <span className="text-gray-400">{counts.ineligible} ineligible order{counts.ineligible > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                ));
              })()}
              {processedOrders.filter(o => o.isBuy).length === 0 && (
                <div className="text-gray-500">No buy orders</div>
              )}
            </div>
          </div>
          
          {/* Sell Side Ranges */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Sell Order Status by Price</h4>
            <div className="space-y-3 text-xs">
              {(() => {
                // Group sell orders by price
                const sellOrders = processedOrders.filter(o => !o.isBuy).sort((a, b) => a.price - b.price);
                const priceGroups = new Map();
                
                sellOrders.forEach(order => {
                  const price = order.price.toFixed(6);
                  if (!priceGroups.has(price)) {
                    priceGroups.set(price, { eligible: 0, partial: 0, ineligible: 0 });
                  }
                  priceGroups.get(price)[(order as any).status]++;
                });
                
                return Array.from(priceGroups.entries()).map(([price, counts]) => (
                  <div key={price} className="border-l-2 border-gray-700 pl-3">
                    <div className="font-mono text-gray-200 mb-1">${price}</div>
                    {counts.eligible > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded"></div>
                        <span className="text-gray-400">{counts.eligible} eligible order{counts.eligible > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {counts.partial > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                        <span className="text-gray-400">{counts.partial} partial order{counts.partial > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {counts.ineligible > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded"></div>
                        <span className="text-gray-400">{counts.ineligible} ineligible order{counts.ineligible > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                ));
              })()}
              {processedOrders.filter(o => !o.isBuy).length === 0 && (
                <div className="text-gray-500">No sell orders</div>
              )}
            </div>
          </div>
        </div>
        </>
      )}
      </div>

      {/* Detailed Buy Orders Chart */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-green-400">📈 Buy Orders Detail</h3>
        
        {/* Visual Buy Order Chart */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
          {/* Current System State */}
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-blue-300">Current System Tier:</span>
                <span className="text-white font-semibold">
                  {(() => {
                    // Determine which tier we're in based on market conditions
                    const priceDeviation = ((mcPrice - mcPrice) / mcPrice) * 100; // This would come from actual market data
                    if (priceDeviation >= 0) return "Tier 1 (Tightest caps)";
                    if (priceDeviation >= -3) return "Tier 2 (Moderate caps)";
                    if (priceDeviation >= -8) return "Tier 3 (Looser caps)";
                    return "Tier 4 (Loosest caps)";
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300">Current Reward Rate:</span>
                <span className="text-green-400 font-semibold">7% - 100% APR (Dynamic)</span>
              </div>
            </div>
          </div>
          
          {/* Volume Cap Visualization */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Buy Side Volume Cap Usage (Orders processed by price priority)</div>
            <div className="relative h-8 bg-gray-800 rounded overflow-hidden">
              {/* Show cumulative volume usage */}
              {(() => {
                let cumulativePercent = 0;
                const capUsage = buyOrdersProcessed.map((order, idx) => {
                  const volume = order.value;
                  const percentOfCap = (volume / (mcPrice * 1000000 * 0.02)) * 100; // Assuming tier 1 with 2% cap
                  const startPercent = cumulativePercent;
                  cumulativePercent += percentOfCap;
                  
                  return {
                    order,
                    startPercent,
                    width: percentOfCap,
                    overCap: cumulativePercent > 100
                  };
                });
                
                return capUsage.map((item, idx) => (
                  <div
                    key={`cap-${item.order.orderId}`}
                    className={`absolute h-full ${
                      item.order.status === 'eligible' ? 'bg-green-500' :
                      item.order.status === 'partial' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{
                      left: `${Math.min(item.startPercent, 100)}%`,
                      width: `${Math.min(item.width, 100 - item.startPercent)}%`
                    }}
                    title={`Order ${item.order.orderId}: ${item.order.status}`}
                  />
                ));
              })()}
              {/* Cap line */}
              <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white"></div>
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-white">100% Cap</span>
            </div>
          </div>
          
          {/* Price scale - horizontal layout */}
          <div className="relative h-32 mt-4 mb-16">
            <div className="relative w-full h-full">
              {/* Price axis at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600"></div>
              
              {/* Price markers on x-axis */}
              <div className="absolute bottom-0 left-0" style={{ left: '0%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 0.84).toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0" style={{ left: '25%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 0.88).toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0" style={{ left: '50%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 0.92).toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0" style={{ left: '75%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 0.97).toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0" style={{ left: '100%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 right-0 text-xs text-white whitespace-nowrap">
                  ${mcPrice.toFixed(6)}
                </div>
              </div>
              
              {/* Market price indicator */}
              <div className="absolute bottom-0 top-4" style={{ left: '100%' }}>
                <div className="absolute bottom-0 top-0 w-0.5 bg-white border-r-2 border-dashed border-white/50"></div>
                <div className="absolute top-0 right-0 transform translate-x-2 text-xs text-white bg-gray-800 px-1 rounded">
                  Market
                </div>
              </div>
              
              {/* Bracket zones below price axis */}
              <div className="absolute -bottom-4 left-0 right-0">
                {(() => {
                  // Calculate volumes for different reward zones
                  let noRewardsVolume = 0;  // Below 84% of market price
                  let eligibleVolume = 0;   // 84% to 100% of market price
                  let ineligibleVolume = 0; // Orders that exceed volume caps
                  let totalBuyVolume = 0;
                  
                  buyOrdersProcessed.forEach(order => {
                    const volume = order.value / order.price;
                    totalBuyVolume += volume;
                    
                    if (order.price < mcPrice * 0.84) {
                      noRewardsVolume += volume;
                    } else if (order.status === 'eligible') {
                      eligibleVolume += volume;
                    } else if (order.status === 'partial') {
                      const eligiblePortion = volume * order.volumeCapFraction;
                      const ineligiblePortion = volume * (1 - order.volumeCapFraction);
                      eligibleVolume += eligiblePortion;
                      ineligibleVolume += ineligiblePortion;
                    } else {
                      ineligibleVolume += volume;
                    }
                  });
                  
                  const formatVolume = (vol: number) => {
                    if (vol >= 1000000) return `${(vol/1000000).toFixed(1)}M`;
                    if (vol >= 1000) return `${(vol/1000).toFixed(1)}k`;
                    return vol.toFixed(0);
                  };
                  
                  const formatPercent = (vol: number) => {
                    return totalBuyVolume > 0 ? `${((vol / totalBuyVolume) * 100).toFixed(1)}%` : '0%';
                  };
                  
                  return (
                    <>
                      {/* No rewards bracket (far left) */}
                      {noRewardsVolume > 0 && (
                        <div className="absolute" style={{ left: '0%', width: '10%' }}>
                          <div className="relative">
                            {/* Bracket with arrows */}
                            <div className="relative h-8 mb-2">
                              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-500"></div>
                              <div className="absolute left-0 top-0 w-0.5 h-4 bg-gray-500"></div>
                              <div className="absolute right-0 top-0 w-0.5 h-4 bg-gray-500"></div>
                              {/* Left arrow pointing up */}
                              <div className="absolute left-0 -top-2">
                                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-gray-500"></div>
                              </div>
                              {/* Right arrow pointing to 84% price */}
                              <div className="absolute right-0 -top-2">
                                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-gray-500"></div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 whitespace-nowrap text-center">
                              <div className="font-semibold">No Rewards</div>
                              <div className="text-[10px]">Below ${(mcPrice * 0.84).toFixed(6)}</div>
                              <div className="font-bold text-white">{formatVolume(noRewardsVolume)} MC</div>
                              <div className="text-[10px]">{formatPercent(noRewardsVolume)} of buy volume</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Eligible rewards bracket */}
                      <div className="absolute" style={{ left: noRewardsVolume > 0 ? '10%' : '0%', width: '90%' }}>
                        <div className="relative">
                          {/* Bracket with arrows */}
                          <div className="relative h-8 mb-2">
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-green-500"></div>
                            <div className="absolute left-0 top-0 w-0.5 h-4 bg-green-500"></div>
                            <div className="absolute right-0 top-0 w-0.5 h-4 bg-green-500"></div>
                            {/* Left arrow pointing to 84% price */}
                            <div className="absolute left-0 -top-2">
                              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-green-500"></div>
                            </div>
                            {/* Right arrow pointing to market price */}
                            <div className="absolute right-0 -top-2">
                              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-green-500"></div>
                            </div>
                          </div>
                          <div className="text-xs text-green-400 whitespace-nowrap text-center">
                            <div className="font-semibold">Eligible for Rewards</div>
                            <div className="text-[10px]">${(mcPrice * 0.84).toFixed(6)} - ${mcPrice.toFixed(6)}</div>
                            <div className="font-bold text-white">{formatVolume(eligibleVolume)} MC</div>
                            <div className="text-[10px]">{formatPercent(eligibleVolume)} of buy volume</div>
                            <div className="text-[10px] text-green-500">Earns 7% APR base rewards</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ineligible bracket (overlaps with eligible range) */}
                      {ineligibleVolume > 0 && (
                        <div className="absolute" style={{ left: '40%', width: '50%' }}>
                          <div className="relative mt-20">
                            <div className="text-xs text-red-400 whitespace-nowrap text-center">
                              <div className="font-semibold">Volume Cap Exceeded</div>
                              <div className="text-[10px]">Orders beyond tier limits</div>
                              <div className="font-bold text-white">{formatVolume(ineligibleVolume)} MC</div>
                              <div className="text-[10px]">{formatPercent(ineligibleVolume)} of buy volume</div>
                              <div className="text-[10px] text-gray-500">No rewards on excess volume</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              
              {/* Plot buy orders with stacked bars */}
              {(() => {
                console.log('Buy orders to process:', buyOrdersProcessed.length, buyOrdersProcessed);
                // Group orders by price to show stacked amounts
                const priceGroups = new Map();
                buyOrdersProcessed.forEach(order => {
                  const price = order.price.toFixed(6);
                  if (!priceGroups.has(price)) {
                    priceGroups.set(price, { 
                      price: order.price,
                      orders: [],
                      totalVolume: 0,
                      eligibleVolume: 0,
                      partialVolume: 0,
                      ineligibleVolume: 0
                    });
                  }
                  const group = priceGroups.get(price);
                  const volume = order.value / order.price;
                  group.orders.push(order);
                  group.totalVolume += volume;
                  
                  if (order.status === 'eligible') {
                    group.eligibleVolume += volume;
                  } else if (order.status === 'partial') {
                    // For partial orders, calculate the eligible and ineligible portions
                    const eligiblePortion = volume * order.volumeCapFraction;
                    const ineligiblePortion = volume * (1 - order.volumeCapFraction);
                    group.partialVolume += eligiblePortion;
                    group.ineligibleVolume += ineligiblePortion;
                  } else {
                    group.ineligibleVolume += volume;
                  }
                });

                return Array.from(priceGroups.values()).map((group, index) => {
                  const priceRatio = group.price / mcPrice;
                  const xPosition = Math.max(0, Math.min(100, (priceRatio - 0.84) / 0.16 * 100));
                  const maxHeight = 100; // Maximum height in pixels
                  const volumeScale = 50; // Scale factor for volume to pixels
                  
                  // Calculate heights for each segment
                  const eligibleHeight = (group.eligibleVolume / volumeScale) * maxHeight / (group.totalVolume / volumeScale);
                  const partialHeight = (group.partialVolume / volumeScale) * maxHeight / (group.totalVolume / volumeScale);
                  const ineligibleHeight = (group.ineligibleVolume / volumeScale) * maxHeight / (group.totalVolume / volumeScale);
                  const totalHeight = Math.min(group.totalVolume / volumeScale, maxHeight);
                  
                  // Estimate spread multiplier
                  const spreadMultiplier = group.price >= mcPrice * 0.98 ? 2.0 :
                                         group.price >= mcPrice * 0.95 ? 1.5 :
                                         group.price >= mcPrice * 0.92 ? 1.3 : 1.1;
                  
                  return (
                    <div
                      key={`buy-stack-${group.price}`}
                      className="absolute"
                      style={{
                        left: `${xPosition}%`,
                        bottom: '0',
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {/* Stacked bar sitting on the axis */}
                      <div 
                        className="absolute w-10"
                        style={{
                          height: `${totalHeight}px`,
                          bottom: '0'
                        }}
                      >
                        {/* Eligible portion (bottom) */}
                        {group.eligibleVolume > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-green-500"
                            style={{ height: `${(group.eligibleVolume / group.totalVolume) * 100}%` }}
                            title={`Eligible: ${group.eligibleVolume.toFixed(2)} MC`}
                          >
                            {group.eligibleVolume > 100 && (
                              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-white font-semibold">
                                {group.eligibleVolume >= 1000 ? `${(group.eligibleVolume/1000).toFixed(1)}k` : group.eligibleVolume.toFixed(0)}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Partial portion (middle) */}
                        {group.partialVolume > 0 && (
                          <div 
                            className="absolute left-0 right-0 bg-yellow-500"
                            style={{ 
                              bottom: `${(group.eligibleVolume / group.totalVolume) * 100}%`,
                              height: `${(group.partialVolume / group.totalVolume) * 100}%` 
                            }}
                            title={`Partial: ${group.partialVolume.toFixed(2)} MC`}
                          />
                        )}
                        
                        {/* Ineligible portion (top) */}
                        {group.ineligibleVolume > 0 && (
                          <div 
                            className="absolute top-0 left-0 right-0 bg-red-500"
                            style={{ height: `${(group.ineligibleVolume / group.totalVolume) * 100}%` }}
                            title={`Ineligible: ${group.ineligibleVolume.toFixed(2)} MC`}
                          />
                        )}
                        
                        {/* Priority number on top */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center">
                          {index + 1}
                        </div>
                        
                        {/* Total volume label above bar */}
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-300 font-semibold whitespace-nowrap">
                          {group.totalVolume >= 1000 ? `${(group.totalVolume/1000).toFixed(1)}k` : group.totalVolume.toFixed(0)} MC
                        </div>
                        
                        {/* Spread multiplier below */}
                        {spreadMultiplier > 1 && (
                          <div className={`absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs font-bold ${
                            spreadMultiplier >= 2 ? 'text-purple-400' :
                            spreadMultiplier >= 1.5 ? 'text-blue-400' :
                            'text-blue-300'
                          }`}>
                            {spreadMultiplier}x
                          </div>
                        )}
                      </div>
                      
                      {/* Price indicator at base */}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  );
                });
              })()}
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-800 rounded">
              <div className="font-semibold text-gray-300 mb-1">Bar Colors (Stacked):</div>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span>
                  <span>Eligible amount (Full rewards)</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-yellow-500 mr-1"></span>
                  <span>Partial amount (Reduced rewards)</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span>
                  <span>Ineligible amount (No rewards)</span>
                </div>
                <div className="text-gray-400 mt-1">
                  Bar height = Total volume at price
                </div>
              </div>
            </div>
            <div className="p-2 bg-gray-800 rounded">
              <div className="font-semibold text-gray-300 mb-1">Spread Bonuses:</div>
              <div className="space-y-1">
                <div><span className="inline-block w-3 h-3 bg-purple-400 rounded-full mr-1"></span>2.0x (75%+ spread reduction)</div>
                <div><span className="inline-block w-3 h-3 bg-blue-400 rounded-full mr-1"></span>1.5x (50%+ spread reduction)</div>
                <div><span className="text-gray-500">Numbers show processing priority</span></div>
              </div>
            </div>
          </div>
        
        {buyOrdersProcessed.length === 0 ? (
          <div className="text-center text-gray-400 py-4">No buy orders</div>
        ) : (
          <div className="space-y-3">
            {/* Current market price reference */}
            <div className="text-sm text-gray-400 mb-2">
              Current MC Price: ${mcPrice.toFixed(6)}
            </div>
            
            {/* Buy orders list */}
            {buyOrdersProcessed.map((order, index) => {
              const pricePercentFromMarket = ((order.price - mcPrice) / mcPrice) * 100;
              const volume = order.value / order.price;
              
              return (
                <div key={`buy-${order.orderId}`} className={`p-3 rounded-lg border ${
                  order.status === 'eligible' ? 'bg-green-900/20 border-green-500/30' :
                  order.status === 'partial' ? 'bg-yellow-900/20 border-yellow-500/30' :
                  'bg-red-900/20 border-red-500/30'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-white">
                        ${order.price.toFixed(6)} ({pricePercentFromMarket > 0 ? '+' : ''}{pricePercentFromMarket.toFixed(1)}% from market)
                      </div>
                      <div className="text-sm text-gray-400">
                        Volume: {volume.toFixed(2)} MC • Value: ${order.value.toFixed(2)}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      order.status === 'eligible' ? 'bg-green-600/30 text-green-400' :
                      order.status === 'partial' ? 'bg-yellow-600/30 text-yellow-400' :
                      'bg-red-600/30 text-red-400'
                    }`}>
                      {order.status === 'eligible' ? '✓ Full Rewards' :
                       order.status === 'partial' ? `${(order.volumeCapFraction * 100).toFixed(0)}% Rewards` :
                       '✗ No Rewards'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Sell Orders Chart */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-red-400">📉 Sell Orders Detail</h3>
        
        {/* Visual Sell Order Chart */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
          {/* Current System State */}
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-blue-300">Current System Tier:</span>
                <span className="text-white font-semibold">Same as Buy Side</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ⚠️ Note: Sell orders only receive rewards when at or below market price (negative deviation system)
              </div>
            </div>
          </div>
          
          {/* Volume Cap Visualization */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Sell Side Volume Cap Usage (Orders processed by price priority)</div>
            <div className="relative h-8 bg-gray-800 rounded overflow-hidden">
              {/* Show cumulative volume usage */}
              {(() => {
                let cumulativePercent = 0;
                const capUsage = sellOrdersProcessed.map((order, idx) => {
                  const volume = order.value;
                  const percentOfCap = (volume / (mcPrice * 1000000 * 0.01)) * 100; // Assuming tier 1 with 1% cap for sells
                  const startPercent = cumulativePercent;
                  cumulativePercent += percentOfCap;
                  
                  return {
                    order,
                    startPercent,
                    width: percentOfCap,
                    overCap: cumulativePercent > 100
                  };
                });
                
                return capUsage.map((item, idx) => (
                  <div
                    key={`cap-sell-${item.order.orderId}`}
                    className={`absolute h-full ${
                      item.order.status === 'eligible' ? 'bg-green-500' :
                      item.order.status === 'partial' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{
                      left: `${Math.min(item.startPercent, 100)}%`,
                      width: `${Math.min(item.width, 100 - item.startPercent)}%`
                    }}
                    title={`Order ${item.order.orderId}: ${item.order.status}`}
                  />
                ));
              })()}
              {/* Cap line */}
              <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white"></div>
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-white">100% Cap</span>
            </div>
          </div>
          
          {/* Price scale for sells - horizontal layout */}
          <div className="relative h-32 mt-4 mb-16">
            <div className="relative w-full h-full">
              {/* Price axis at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600"></div>
              
              {/* Price markers on x-axis */}
              <div className="absolute bottom-0 left-0" style={{ left: '0%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 0.90).toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0" style={{ left: '33%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 0.97).toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0" style={{ left: '50%' }}>
                <div className="absolute bottom-0 w-0.5 h-4 bg-white"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white whitespace-nowrap font-semibold">
                  ${mcPrice.toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0" style={{ left: '67%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 1.03).toFixed(6)}
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0" style={{ left: '100%' }}>
                <div className="absolute bottom-0 w-0.5 h-2 bg-gray-500"></div>
                <div className="absolute -bottom-6 right-0 text-xs text-gray-400 whitespace-nowrap">
                  ${(mcPrice * 1.10).toFixed(6)}
                </div>
              </div>
              
              {/* Market price boundary */}
              <div className="absolute bottom-0 top-4" style={{ left: '50%' }}>
                <div className="absolute bottom-0 top-0 w-0.5 bg-green-500 border-l-2 border-dashed border-green-500/50"></div>
                <div className="absolute top-0 left-0 transform -translate-x-1/2 text-xs text-green-400 bg-gray-800 px-1 rounded">
                  Rewards Start
                </div>
              </div>
              
              {/* Zone brackets below price axis */}
              <div className="absolute -bottom-4 left-0 right-0">
                {(() => {
                  // Calculate volumes for each zone
                  let eligibleVolume = 0;
                  let noRewardsVolume = 0;
                  let totalSellVolume = 0;
                  
                  sellOrdersProcessed.forEach(order => {
                    const volume = order.value / order.price;
                    totalSellVolume += volume;
                    
                    if (order.price <= mcPrice) {
                      eligibleVolume += volume;
                    } else {
                      noRewardsVolume += volume;
                    }
                  });
                  
                  const formatVolume = (vol: number) => {
                    if (vol >= 1000000) return `${(vol/1000000).toFixed(1)}M`;
                    if (vol >= 1000) return `${(vol/1000).toFixed(1)}k`;
                    return vol.toFixed(0);
                  };
                  
                  const formatPercent = (vol: number) => {
                    return totalSellVolume > 0 ? `${((vol / totalSellVolume) * 100).toFixed(1)}%` : '0%';
                  };
                  
                  return (
                    <>
                      {/* Eligible rewards bracket */}
                      <div className="absolute" style={{ left: '0%', width: '50%' }}>
                        <div className="relative">
                          {/* Bracket with arrows */}
                          <div className="relative h-8 mb-2">
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-green-500"></div>
                            <div className="absolute left-0 top-0 w-0.5 h-4 bg-green-500"></div>
                            <div className="absolute right-0 top-0 w-0.5 h-4 bg-green-500"></div>
                            {/* Left arrow pointing to min price */}
                            <div className="absolute left-0 -top-2">
                              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-green-500"></div>
                            </div>
                            {/* Right arrow pointing to market price */}
                            <div className="absolute right-0 -top-2">
                              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-green-500"></div>
                            </div>
                          </div>
                          <div className="text-xs text-green-400 whitespace-nowrap text-center">
                            <div className="font-semibold">Eligible for Rewards</div>
                            <div className="text-[10px]">${(mcPrice * 0.90).toFixed(6)} - ${mcPrice.toFixed(6)}</div>
                            <div className="font-bold text-white">{formatVolume(eligibleVolume)} MC</div>
                            <div className="text-[10px]">{formatPercent(eligibleVolume)} of sell volume</div>
                            <div className="text-[10px] text-green-500">Earns 7% APR base rewards</div>
                          </div>
                        </div>
                      </div>
                      {/* No rewards bracket */}
                      <div className="absolute" style={{ left: '50%', width: '50%' }}>
                        <div className="relative">
                          {/* Bracket with arrows */}
                          <div className="relative h-8 mb-2">
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-500"></div>
                            <div className="absolute left-0 top-0 w-0.5 h-4 bg-gray-500"></div>
                            <div className="absolute right-0 top-0 w-0.5 h-4 bg-gray-500"></div>
                            {/* Left arrow pointing to market price */}
                            <div className="absolute left-0 -top-2">
                              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-gray-500"></div>
                            </div>
                            {/* Right arrow pointing to max price */}
                            <div className="absolute right-0 -top-2">
                              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-gray-500"></div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 whitespace-nowrap text-center">
                            <div className="font-semibold">No Rewards</div>
                            <div className="text-[10px]">Above ${mcPrice.toFixed(6)}</div>
                            <div className="font-bold text-white">{formatVolume(noRewardsVolume)} MC</div>
                            <div className="text-[10px]">{formatPercent(noRewardsVolume)} of sell volume</div>
                            <div className="text-[10px] text-gray-500">No rewards earned</div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              {/* Plot sell orders with stacked bars */}
              {(() => {
                // Group orders by price to show stacked amounts
                const priceGroups = new Map();
                sellOrdersProcessed.forEach(order => {
                  const price = order.price.toFixed(6);
                  if (!priceGroups.has(price)) {
                    priceGroups.set(price, { 
                      price: order.price,
                      orders: [],
                      totalVolume: 0,
                      eligibleVolume: 0,
                      partialVolume: 0,
                      ineligibleVolume: 0
                    });
                  }
                  const group = priceGroups.get(price);
                  const volume = order.value / order.price;
                  group.orders.push(order);
                  group.totalVolume += volume;
                  
                  if (order.status === 'eligible') {
                    group.eligibleVolume += volume;
                  } else if (order.status === 'partial') {
                    // For partial orders, calculate the eligible and ineligible portions
                    const eligiblePortion = volume * order.volumeCapFraction;
                    const ineligiblePortion = volume * (1 - order.volumeCapFraction);
                    group.partialVolume += eligiblePortion;
                    group.ineligibleVolume += ineligiblePortion;
                  } else {
                    group.ineligibleVolume += volume;
                  }
                });

                return Array.from(priceGroups.values()).map((group, index) => {
                  const priceRatio = group.price / mcPrice;
                  const xPosition = Math.max(0, Math.min(100, (priceRatio - 0.90) / 0.20 * 100));
                  const maxHeight = 100; // Maximum height in pixels
                  const volumeScale = 50; // Scale factor for volume to pixels
                  
                  // Calculate heights for each segment
                  const totalHeight = Math.min(group.totalVolume / volumeScale, maxHeight);
                  
                  return (
                    <div
                      key={`sell-stack-${group.price}`}
                      className="absolute"
                      style={{
                        left: `${xPosition}%`,
                        bottom: '0',
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {/* Stacked bar sitting on the axis */}
                      <div 
                        className="absolute w-10"
                        style={{
                          height: `${totalHeight}px`,
                          bottom: '0'
                        }}
                      >
                        {/* Eligible portion (bottom) */}
                        {group.eligibleVolume > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-green-500"
                            style={{ height: `${(group.eligibleVolume / group.totalVolume) * 100}%` }}
                            title={`Eligible: ${group.eligibleVolume.toFixed(2)} MC`}
                          >
                            {group.eligibleVolume > 100 && (
                              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-white font-semibold">
                                {group.eligibleVolume >= 1000 ? `${(group.eligibleVolume/1000).toFixed(1)}k` : group.eligibleVolume.toFixed(0)}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Partial portion (middle) */}
                        {group.partialVolume > 0 && (
                          <div 
                            className="absolute left-0 right-0 bg-yellow-500"
                            style={{ 
                              bottom: `${(group.eligibleVolume / group.totalVolume) * 100}%`,
                              height: `${(group.partialVolume / group.totalVolume) * 100}%` 
                            }}
                            title={`Partial: ${group.partialVolume.toFixed(2)} MC`}
                          />
                        )}
                        
                        {/* Ineligible portion (top) */}
                        {group.ineligibleVolume > 0 && (
                          <div 
                            className="absolute top-0 left-0 right-0 bg-red-500"
                            style={{ height: `${(group.ineligibleVolume / group.totalVolume) * 100}%` }}
                            title={`Ineligible: ${group.ineligibleVolume.toFixed(2)} MC`}
                          />
                        )}
                        
                        {/* Priority number on top */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center">
                          {index + 1}
                        </div>
                        
                        {/* Total volume label above bar */}
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-300 font-semibold whitespace-nowrap">
                          {group.totalVolume >= 1000 ? `${(group.totalVolume/1000).toFixed(1)}k` : group.totalVolume.toFixed(0)} MC
                        </div>
                      </div>
                      
                      {/* Price indicator at base */}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          {/* Important note about sell rewards */}
          <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
            ⚠️ Important: Sell orders only receive LC rewards when placed at or below market price due to the negative deviation tier system.
          </div>
        </div>
        
        {sellOrdersProcessed.length === 0 ? (
          <div className="text-center text-gray-400 py-4">No sell orders</div>
        ) : (
          <div className="space-y-3">
            {/* Current market price reference */}
            <div className="text-sm text-gray-400 mb-2">
              Current MC Price: ${mcPrice.toFixed(6)}
            </div>
            
            {/* Sell orders list */}
            {sellOrdersProcessed.map((order, index) => {
              const pricePercentFromMarket = ((order.price - mcPrice) / mcPrice) * 100;
              const volume = order.value / order.price;
              
              return (
                <div key={`sell-${order.orderId}`} className={`p-3 rounded-lg border ${
                  order.status === 'eligible' ? 'bg-green-900/20 border-green-500/30' :
                  order.status === 'partial' ? 'bg-yellow-900/20 border-yellow-500/30' :
                  'bg-red-900/20 border-red-500/30'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-white">
                        ${order.price.toFixed(6)} ({pricePercentFromMarket > 0 ? '+' : ''}{pricePercentFromMarket.toFixed(1)}% from market)
                      </div>
                      <div className="text-sm text-gray-400">
                        Volume: {volume.toFixed(2)} MC • Value: ${order.value.toFixed(2)}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      order.status === 'eligible' ? 'bg-green-600/30 text-green-400' :
                      order.status === 'partial' ? 'bg-yellow-600/30 text-yellow-400' :
                      'bg-red-600/30 text-red-400'
                    }`}>
                      {order.status === 'eligible' ? '✓ Full Rewards' :
                       order.status === 'partial' ? `${(order.volumeCapFraction * 100).toFixed(0)}% Rewards` :
                       '✗ No Rewards'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

// Component to visualize reward eligibility
const RewardEligibilityChart: React.FC<{
  positions: LiquidityPosition[];
  currentAPR: number;
}> = ({ positions, currentAPR }) => {
  const eligible = positions.filter(p => p.eligibilityStatus === 'eligible');
  const partial = positions.filter(p => p.eligibilityStatus === 'partial');
  const ineligible = positions.filter(p => p.eligibilityStatus === 'ineligible');
  
  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  const eligibleValue = eligible.reduce((sum, p) => sum + p.value, 0);
  const partialValue = partial.reduce((sum, p) => sum + p.value, 0);
  const ineligibleValue = ineligible.reduce((sum, p) => sum + p.value, 0);
  
  const eligiblePercent = totalValue > 0 ? (eligibleValue / totalValue) * 100 : 0;
  const partialPercent = totalValue > 0 ? (partialValue / totalValue) * 100 : 0;
  const ineligiblePercent = totalValue > 0 ? (ineligibleValue / totalValue) * 100 : 0;
  
  const totalHourlyRewards = positions.reduce((sum, p) => sum + p.hourlyReward, 0);
  const projectedDaily = totalHourlyRewards * 24;
  const projectedYearly = totalHourlyRewards * 8760;
  const effectiveAPR = totalValue > 0 ? (projectedYearly / totalValue) * 100 : 0;
  
  return (
    <div className="mt-3">
      {/* Progress bar */}
      <div className="h-8 bg-gray-700 rounded-lg overflow-hidden flex relative">
        {eligiblePercent > 0 && (
          <div 
            className="bg-green-500 flex items-center justify-center text-xs font-bold"
            style={{ width: `${eligiblePercent}%` }}
          >
            {eligiblePercent >= 10 && `${eligiblePercent.toFixed(0)}%`}
          </div>
        )}
        {partialPercent > 0 && (
          <div 
            className="bg-yellow-500 flex items-center justify-center text-xs font-bold"
            style={{ width: `${partialPercent}%` }}
          >
            {partialPercent >= 10 && `${partialPercent.toFixed(0)}%`}
          </div>
        )}
        {ineligiblePercent > 0 && (
          <div 
            className="bg-red-500 flex items-center justify-center text-xs font-bold"
            style={{ width: `${ineligiblePercent}%` }}
          >
            {ineligiblePercent >= 10 && `${ineligiblePercent.toFixed(0)}%`}
          </div>
        )}
      </div>
      
      {/* Legend with amounts */}
      <div className="mt-1 flex justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded"></span>
          <span className="text-gray-400">Eligible: ${eligibleValue.toFixed(2)}</span>
        </div>
        {partialValue > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded"></span>
            <span className="text-gray-400">Partial: ${partialValue.toFixed(2)}</span>
          </div>
        )}
        {ineligibleValue > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded"></span>
            <span className="text-gray-400">Ineligible: ${ineligibleValue.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-gray-400">Effective APR:</span>
          <span className="font-bold ml-1 text-green-400">
            {effectiveAPR.toFixed(1)}%
          </span>
          <span className="text-gray-500 ml-1">
            (of {currentAPR}%)
          </span>
        </div>
        <div>
          <span className="text-gray-400">Daily Rewards:</span>
          <span className="font-bold ml-1">
            {projectedDaily.toFixed(2)} LC
          </span>
        </div>
        <div>
          <span className="text-gray-400">Yearly Rewards:</span>
          <span className="font-bold ml-1">
            {projectedYearly.toFixed(0)} LC
          </span>
        </div>
      </div>
    </div>
  );
};

interface LiquidityPosition {
  orderId: string;
  pairId: string;
  isBuy: boolean;
  price: number;
  amount: number;
  filled: number;
  value: number;
  placedAt: string;
  lastRewardAt?: string;
  totalRewardsEarned: number;
  isEligible: boolean;
  eligibilityStatus: 'eligible' | 'partial' | 'ineligible';
  eligibilityReason?: string;
  eligibilityPercent: number;
  tier: number;
  hourlyReward: number;
  spreadMultiplier: number;
  bonusType: string;
  potentialMultiplier: number;
  potentialBonusType: string;
  rewardPayments?: RewardPayment[];
}

interface RewardPayment {
  timestamp: string;
  amount: number;
  orderId: string;
  blockHeight: number;
  lcPriceAtTime: number;  // LC price in MC at time of payment
  mcPriceAtTime: number;  // MC price in TUSD at time of payment
  valueInTUSD: number;    // Total value in TUSD
}

interface Props {
  userAddress: string;
  currentAPR: number;
  mcPrice: number;
  onCancelOrder: (orderId: string) => void;
}

export const LiquidityPositions: React.FC<Props> = ({ 
  userAddress, 
  currentAPR, 
  mcPrice,
  onCancelOrder 
}) => {
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [rewardHistory, setRewardHistory] = useState<RewardPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [marketStats, setMarketStats] = useState({
    totalBuyLiquidity: 0,
    totalSellLiquidity: 0,
    rewardedBuyVolume: 0,
    rewardedSellVolume: 0,
    highestRewardedBuyPrice: 0,
    lowestRewardedBuyPrice: 0,
    highestRewardedSellPrice: 0,
    lowestRewardedSellPrice: 0,
    buyOrders: [] as any[],
    sellOrders: [] as any[]
  });
  const [allBuyOrders, setAllBuyOrders] = useState<any[]>([]);
  const [allSellOrders, setAllSellOrders] = useState<any[]>([]);
  const [allOrderRewardsMap, setAllOrderRewardsMap] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    fetchPositionsAndHistory();
    const interval = setInterval(fetchPositionsAndHistory, 10000);
    return () => clearInterval(interval);
  }, [userAddress]);

  const fetchPositionsAndHistory = async () => {
    try {
      // Fetch all orders
      const orderBookRes = await fetchAPI('/mychain/dex/v1/order_book/1');
      const buyOrders = orderBookRes.buy_orders || [];
      const sellOrders = orderBookRes.sell_orders || [];
      const allOrders = [...buyOrders, ...sellOrders];
      
      // Store raw order data for price range chart
      setAllBuyOrders(buyOrders);
      setAllSellOrders(sellOrders);
      
      // Fetch all order rewards info for market statistics
      const allOrderRewardsMap = new Map();
      try {
        const allOrderRewardsRes = await fetchAPI('/mychain/dex/v1/all_order_rewards');
        console.log('All order rewards response:', allOrderRewardsRes);
        if (allOrderRewardsRes.rewards) {
          allOrderRewardsRes.rewards.forEach((reward: any) => {
            // Parse order_id as a number since it comes as a string
            const orderId = parseInt(reward.order_id);
            allOrderRewardsMap.set(orderId, reward);
            console.log(`Order ${orderId} reward info:`, reward);
          });
        }
      } catch (error) {
        console.error('Failed to fetch all order rewards:', error);
        // Continue without market statistics
      }
      
      // Store the rewards map for the price range chart
      setAllOrderRewardsMap(allOrderRewardsMap);
      
      // Calculate market statistics
      let totalBuyLiquidity = 0;
      let totalSellLiquidity = 0;
      let rewardedBuyVolume = 0;
      let rewardedSellVolume = 0;
      let highestRewardedBuyPrice = 0;
      let lowestRewardedBuyPrice = Infinity;
      let highestRewardedSellPrice = 0;
      let lowestRewardedSellPrice = Infinity;
      
      // Process buy orders
      console.log('Processing buy orders:', buyOrders.length);
      buyOrders.forEach((order: any) => {
        const price = parseFloat(order.price.amount) / 1000000;
        const amount = parseFloat(order.amount.amount) / 1000000;
        const filled = parseFloat(order.filled_amount.amount) / 1000000;
        const remaining = amount - filled;
        const value = remaining * price;
        
        totalBuyLiquidity += value;
        
        const orderId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
        const rewardInfo = allOrderRewardsMap.get(orderId);
        if (rewardInfo) {
          console.log(`Buy order ${orderId} reward info:`, rewardInfo);
          const volumeCapFraction = parseFloat(rewardInfo.volume_cap_fraction || "1");
          console.log(`Buy order ${orderId}: value=${value}, volumeCapFraction=${volumeCapFraction}, remaining=${remaining}`);
          // Order is eligible if it has any volume cap fraction > 0
          if (volumeCapFraction > 0 && value > 0) {
            const rewardedAmount = value * volumeCapFraction;
            console.log(`Buy order ${orderId} is eligible: value=${value}, volumeCapFraction=${volumeCapFraction}, rewardedAmount=${rewardedAmount}`);
            rewardedBuyVolume += rewardedAmount;
            if (price > highestRewardedBuyPrice) highestRewardedBuyPrice = price;
            if (price < lowestRewardedBuyPrice) lowestRewardedBuyPrice = price;
          } else {
            console.log(`Buy order ${orderId} not eligible: value=${value}, volumeCapFraction=${volumeCapFraction}`);
          }
        } else {
          console.log(`No reward info for buy order ${orderId}`);
        }
      });
      
      // Process sell orders
      sellOrders.forEach((order: any) => {
        const price = parseFloat(order.price.amount) / 1000000;
        const amount = parseFloat(order.amount.amount) / 1000000;
        const filled = parseFloat(order.filled_amount.amount) / 1000000;
        const remaining = amount - filled;
        const value = remaining * price;
        
        totalSellLiquidity += value;
        
        const orderId = typeof order.id === 'string' ? parseInt(order.id) : order.id;
        const rewardInfo = allOrderRewardsMap.get(orderId);
        if (rewardInfo) {
          console.log(`Sell order ${orderId} reward info:`, rewardInfo);
          const volumeCapFraction = parseFloat(rewardInfo.volume_cap_fraction || "1");
          console.log(`Sell order ${orderId}: value=${value}, volumeCapFraction=${volumeCapFraction}, remaining=${remaining}`);
          // Order is eligible if it has any volume cap fraction > 0
          if (volumeCapFraction > 0 && value > 0) {
            const rewardedAmount = value * volumeCapFraction;
            console.log(`Sell order ${orderId} is eligible: value=${value}, volumeCapFraction=${volumeCapFraction}, rewardedAmount=${rewardedAmount}`);
            rewardedSellVolume += rewardedAmount;
            if (price > highestRewardedSellPrice) highestRewardedSellPrice = price;
            if (price < lowestRewardedSellPrice) lowestRewardedSellPrice = price;
          } else {
            console.log(`Sell order ${orderId} not eligible: value=${value}, volumeCapFraction=${volumeCapFraction}`);
          }
        } else {
          console.log(`No reward info for sell order ${orderId}`);
        }
      });
      
      // Set market statistics
      console.log('Market statistics calculated:', {
        totalBuyLiquidity,
        totalSellLiquidity,
        rewardedBuyVolume,
        rewardedSellVolume,
        buyOrdersCount: buyOrders.length,
        sellOrdersCount: sellOrders.length
      });
      
      setMarketStats({
        totalBuyLiquidity,
        totalSellLiquidity,
        rewardedBuyVolume,
        rewardedSellVolume,
        highestRewardedBuyPrice: highestRewardedBuyPrice === 0 ? 0 : highestRewardedBuyPrice,
        lowestRewardedBuyPrice: lowestRewardedBuyPrice === Infinity ? 0 : lowestRewardedBuyPrice,
        highestRewardedSellPrice: highestRewardedSellPrice === 0 ? 0 : highestRewardedSellPrice,
        lowestRewardedSellPrice: lowestRewardedSellPrice === Infinity ? 0 : lowestRewardedSellPrice,
        buyOrders: buyOrders.length,
        sellOrders: sellOrders.length
      });
      
      // Filter user's orders
      const userOrders = allOrders.filter((order: any) => order.maker === userAddress);
      
      // Fetch order rewards info to get actual spread multipliers
      const orderRewardsRes = await fetchAPI(`/mychain/dex/v1/order_rewards/${userAddress}`);
      const orderRewardsMap = new Map();
      if (orderRewardsRes.order_rewards) {
        orderRewardsRes.order_rewards.forEach((reward: any) => {
          orderRewardsMap.set(reward.order_id, reward);
        });
      }
      
      // Fetch transaction history for reward payments
      const txHistoryRes = await fetchAPI(`/mychain/mychain/v1/transaction-history/${userAddress}`);
      
      // Get current LC price (for reference)
      const lcPriceInMC = 0.0001; // Initial LC price, would need historical data for accurate past prices
      
      const rewardTxs = (txHistoryRes.transactions || [])
        .filter((tx: any) => tx.type === 'dex_reward_distribution')
        .map((tx: any) => {
          const lcAmount = parseFloat(tx.amount[0]?.amount || '0') / 1000000;
          // For historical accuracy, we'd need price at tx time, using current prices as approximation
          const lcPrice = lcPriceInMC; // LC price in MC
          const mcPriceUSD = mcPrice; // MC price in TUSD
          const valueInTUSD = lcAmount * lcPrice * mcPriceUSD;
          
          return {
            timestamp: new Date(tx.timestamp).toLocaleString(),
            amount: lcAmount,
            orderId: tx.metadata || 'N/A',
            blockHeight: parseInt(tx.height),
            lcPriceAtTime: lcPrice,
            mcPriceAtTime: mcPriceUSD,
            valueInTUSD: valueInTUSD
          };
        });
      
      const totalRewardsSum = rewardTxs.reduce((sum: number, tx: any) => sum + tx.amount, 0);
      console.log('DEBUG: Reward transactions found:', rewardTxs.length);
      console.log('DEBUG: First few rewards:', rewardTxs.slice(0, 3));
      console.log('DEBUG: Total rewards sum (LC):', totalRewardsSum);
      console.log('DEBUG: Total rewards sum (ulc):', totalRewardsSum * 1000000);
      
      setRewardHistory(rewardTxs);
      
      // Process positions
      const processedPositions = userOrders.map((order: any) => {
        const price = parseFloat(order.price.amount) / 1000000;
        const amount = parseFloat(order.amount.amount) / 1000000;
        const filled = parseFloat(order.filled_amount.amount) / 1000000;
        const remaining = amount - filled;
        const value = remaining * price;
        
        // Calculate minimum value for rewards
        const minimumValue = 0.000001 * 8760 * 100 / currentAPR;
        
        // Determine eligibility
        let eligibilityStatus: 'eligible' | 'partial' | 'ineligible' = 'eligible';
        let eligibilityReason = '';
        let eligibilityPercent = 100;
        
        if (value < minimumValue) {
          eligibilityStatus = 'ineligible';
          eligibilityReason = `Order too small (min: $${minimumValue.toFixed(2)})`;
          eligibilityPercent = 0;
        } else if (remaining === 0) {
          eligibilityStatus = 'ineligible';
          eligibilityReason = 'Order fully filled';
          eligibilityPercent = 0;
        }
        
        
        // Get order reward info from backend
        const orderRewardInfo = orderRewardsMap.get(order.id);
        
        // Get tier from backend order reward info
        let tier = 1;
        if (orderRewardInfo && orderRewardInfo.tier_id) {
          tier = orderRewardInfo.tier_id;
        }
        
        // Get actual spread multiplier from backend
        let spreadMultiplier = 1.0;
        let bonusType = '';
        
        if (orderRewardInfo && orderRewardInfo.spread_multiplier) {
          const backendMultiplier = parseFloat(orderRewardInfo.spread_multiplier);
          if (backendMultiplier > 0) {
            spreadMultiplier = backendMultiplier;
            // Determine bonus type based on multiplier value
            if (spreadMultiplier >= 2.0) {
              bonusType = 'Spread -75%';
            } else if (spreadMultiplier >= 1.5) {
              bonusType = 'Spread -50%';
            } else if (spreadMultiplier >= 1.3) {
              bonusType = 'Spread -25%';
            } else if (spreadMultiplier >= 1.2) {
              bonusType = 'Price +2%';
            } else if (spreadMultiplier > 1.0) {
              bonusType = 'Spread Bonus';
            }
          }
        }
        
        // If no stored multiplier, calculate potential bonus for display
        let potentialMultiplier = 1.0;
        let potentialBonusType = '';
        if (spreadMultiplier === 1.0) {
          // Get best bid and ask from order book
          const buyOrders = orderBookRes.buy_orders || [];
          const sellOrders = orderBookRes.sell_orders || [];
          const bestBid = buyOrders.length > 0 ? parseFloat(buyOrders[0].price.amount) / 1000000 : 0;
          const bestAsk = sellOrders.length > 0 ? parseFloat(sellOrders[0].price.amount) / 1000000 : 0;
          
          if (order.is_buy && bestAsk > 0) {
            // Calculate spread reduction for buy orders
            const currentSpread = bestBid > 0 ? (bestAsk - bestBid) / bestBid : 1;
            const newSpread = (bestAsk - price) / price;
            const spreadReduction = currentSpread > 0 ? (currentSpread - newSpread) / currentSpread : 0;
            
            if (spreadReduction >= 0.75) {
              potentialMultiplier = 2.0;
              potentialBonusType = 'Spread -75%';
            } else if (spreadReduction >= 0.50) {
              potentialMultiplier = 1.5;
              potentialBonusType = 'Spread -50%';
            } else if (spreadReduction >= 0.25) {
              potentialMultiplier = 1.3;
              potentialBonusType = 'Spread -25%';
            } else if (spreadReduction >= 0.05) {
              potentialMultiplier = 1.1;
              potentialBonusType = 'Spread -5%';
            }
          } else if (!order.is_buy && sellOrders.length > 0) {
            // Calculate average ask price
            let totalValue = 0;
            let totalAmount = 0;
            sellOrders.forEach((s: any) => {
              const sellPrice = parseFloat(s.price.amount) / 1000000;
              const sellAmount = parseFloat(s.amount.amount) / 1000000 - parseFloat(s.filled_amount.amount) / 1000000;
              if (sellAmount > 0) {
                totalValue += sellPrice * sellAmount;
                totalAmount += sellAmount;
              }
            });
            const avgAsk = totalAmount > 0 ? totalValue / totalAmount : 0;
            
            if (avgAsk > 0 && price > avgAsk) {
              const priceAboveAvg = (price - avgAsk) / avgAsk;
              if (priceAboveAvg >= 0.10) {
                potentialMultiplier = 1.5;
                potentialBonusType = 'Price +10%';
              } else if (priceAboveAvg >= 0.05) {
                potentialMultiplier = 1.3;
                potentialBonusType = 'Price +5%';
              } else if (priceAboveAvg >= 0.02) {
                potentialMultiplier = 1.2;
                potentialBonusType = 'Price +2%';
              } else {
                potentialMultiplier = 1.1;
                potentialBonusType = 'Above Avg';
              }
            }
          }
        }
        
        // Calculate hourly reward with multiplier
        const baseHourlyReward = eligibilityStatus !== 'ineligible' ? (value * currentAPR / 100 / 8760) : 0;
        let hourlyReward = baseHourlyReward * spreadMultiplier;
        
        // Check if order has volume cap fraction from backend
        if (eligibilityStatus !== 'ineligible' && orderRewardInfo && orderRewardInfo.volume_cap_fraction) {
          const volumeCapFraction = parseFloat(orderRewardInfo.volume_cap_fraction || "1");
          
          if (volumeCapFraction < 1.0) {
            if (volumeCapFraction === 0) {
              eligibilityStatus = 'ineligible';
              eligibilityReason = 'Exceeds tier volume cap';
              eligibilityPercent = 0;
              hourlyReward = 0;
            } else {
              eligibilityStatus = 'partial';
              eligibilityPercent = Math.round(volumeCapFraction * 100);
              eligibilityReason = `Volume capped at ${eligibilityPercent}%`;
              hourlyReward = hourlyReward * volumeCapFraction;
            }
          }
        }
        
        // Calculate total hourly rewards for all user's orders
        let totalUserHourlyRewards = 0;
        let orderDetails: any[] = [];
        userOrders.forEach((o: any) => {
          const oPrice = parseFloat(o.price.amount) / 1000000;
          const oAmount = parseFloat(o.amount.amount) / 1000000;
          const oFilled = parseFloat(o.filled_amount.amount) / 1000000;
          const oRemaining = oAmount - oFilled;
          const oValue = oRemaining * oPrice;
          if (oValue > 0) {
            const oHourly = oValue * currentAPR / 100 / 8760;
            totalUserHourlyRewards += oHourly;
            orderDetails.push({ id: o.id, value: oValue, hourly: oHourly });
          }
        });
        
        if (order.id === '5') {
          console.log('Order calculation details:', {
            orderDetails,
            totalUserHourlyRewards,
            totalUserHourlyRewardsUlc: totalUserHourlyRewards * 1000000,
            currentAPR
          });
        }
        
        // Calculate this order's share of total rewards
        const orderShare = totalUserHourlyRewards > 0 ? hourlyReward / totalUserHourlyRewards : 0;
        
        // Since rewards are distributed as a lump sum, we need to estimate this order's portion
        // based on its hourly reward rate compared to the total
        const totalRewardsEarned = (() => {
          if (rewardTxs.length === 0 || hourlyReward === 0) return 0;
          
          // Sum all reward transactions and multiply by this order's share
          const totalUserRewards = rewardTxs.reduce((sum: number, tx: any) => sum + tx.amount, 0);
          const orderRewards = totalUserRewards * orderShare;
          
          if (order.id === '5') {
            console.log('DEBUG Order 5:', {
              hourlyReward,
              hourlyRewardUlc: hourlyReward * 1000000,
              totalUserHourlyRewards,
              totalUserHourlyRewardsUlc: totalUserHourlyRewards * 1000000,
              orderShare,
              orderSharePct: (orderShare * 100).toFixed(1) + '%',
              totalUserRewards,
              totalUserRewardsUlc: totalUserRewards * 1000000,
              orderRewards,
              orderRewardsUlc: orderRewards * 1000000,
              rewardTxsCount: rewardTxs.length
            });
          }
          
          return orderRewards;
        })();
        
        // Calculate individual reward payments for this order
        const orderRewardPayments = rewardTxs.map((tx: any) => ({
          ...tx,
          amount: tx.amount * orderShare
        }));
        
        const result = {
          orderId: order.id,
          pairId: order.pair_id,
          isBuy: order.is_buy,
          price,
          amount,
          filled,
          value,
          placedAt: formatUnixTimestamp(order.created_at),
          lastRewardAt: rewardTxs.length > 0 ? 
            rewardTxs[0].timestamp : undefined,
          totalRewardsEarned,
          isEligible: eligibilityStatus === 'eligible',
          eligibilityStatus,
          eligibilityReason,
          eligibilityPercent,
          tier,
          hourlyReward,
          spreadMultiplier,
          bonusType,
          potentialMultiplier,
          potentialBonusType,
          rewardPayments: orderRewardPayments
        };
        
        if (order.id === '5') {
          console.log('Order 5 final result:', {
            totalRewardsEarnedLC: result.totalRewardsEarned,
            totalRewardsEarnedUlc: result.totalRewardsEarned * 1000000
          });
        }
        
        return result;
      });
      
      setPositions(processedPositions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching liquidity positions:', error);
      setLoading(false);
    }
  };

  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  const totalHourlyRewards = positions.reduce((sum, pos) => sum + pos.hourlyReward, 0);
  const totalEarned = positions.reduce((sum, pos) => sum + pos.totalRewardsEarned, 0);
  const actualTotalEarned = rewardHistory.reduce((sum, tx) => sum + tx.amount, 0);

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">💎 Your Liquidity Positions</h2>
      
      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-400">
          <strong>How it works:</strong> Place buy/sell orders on the DEX to earn LC rewards. 
          Orders closer to market price earn more. Volume caps apply per tier.
          Current system tier determines caps: Tier {positions[0]?.tier || 1}.
        </p>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Position Value</p>
          <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-400">Hourly LC Rewards</p>
          <p className="text-2xl font-bold text-green-300">{totalHourlyRewards.toFixed(6)} LC</p>
          <p className="text-xs text-gray-400 mt-1">≈ ${(totalHourlyRewards * 0.0001 * mcPrice).toFixed(6)} TUSD/hr</p>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <p className="text-sm text-purple-400">Total Earned</p>
          <p className="text-2xl font-bold text-purple-300">{actualTotalEarned.toFixed(6)} LC</p>
          <p className="text-xs text-gray-400 mt-1">≈ ${(actualTotalEarned * 0.0001 * mcPrice).toFixed(6)} TUSD</p>
          {actualTotalEarned > 0 && actualTotalEarned < 0.001 && (
            <p className="text-xs text-yellow-400 mt-1">({(actualTotalEarned * 1000000).toFixed(0)} ulc total)</p>
          )}
        </div>
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">Annual Rate</p>
          <p className="text-2xl font-bold text-blue-300">{currentAPR.toFixed(1)}%</p>
        </div>
      </div>

      {/* Market Price Range Chart */}
      <MarketPriceRangeChart 
        allBuyOrders={allBuyOrders}
        allSellOrders={allSellOrders}
        allOrderRewardsMap={allOrderRewardsMap}
        mcPrice={mcPrice}
      />

      {/* Market Statistics */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-300">📊 Market Statistics</h3>
        
        {/* Buy Side Statistics */}
        <div className="mb-4">
          <h4 className="text-md font-medium mb-2 text-green-400">Buy Orders</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-700/30 rounded p-2">
              <p className="text-xs text-gray-400">Total Orders</p>
              <p className="font-bold">{marketStats.buyOrders}</p>
            </div>
            <div className="bg-gray-700/30 rounded p-2">
              <p className="text-xs text-gray-400">Total Liquidity</p>
              <p className="font-bold">${marketStats.totalBuyLiquidity.toFixed(2)}</p>
            </div>
            <div className="bg-green-900/20 border border-green-500/30 rounded p-2">
              <p className="text-xs text-green-400">Rewarded Volume</p>
              <p className="font-bold text-green-300">${marketStats.rewardedBuyVolume.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{marketStats.totalBuyLiquidity > 0 ? `${((marketStats.rewardedBuyVolume / marketStats.totalBuyLiquidity) * 100).toFixed(1)}% of total` : '0%'}</p>
            </div>
            <div className="bg-gray-700/30 rounded p-2">
              <p className="text-xs text-gray-400">Price Range (Rewarded)</p>
              {marketStats.lowestRewardedBuyPrice > 0 ? (
                <>
                  <p className="font-bold text-sm">${marketStats.lowestRewardedBuyPrice.toFixed(6)}</p>
                  <p className="text-xs text-gray-500">to ${marketStats.highestRewardedBuyPrice.toFixed(6)}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">No rewarded orders</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Sell Side Statistics */}
        <div>
          <h4 className="text-md font-medium mb-2 text-red-400">Sell Orders</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-700/30 rounded p-2">
              <p className="text-xs text-gray-400">Total Orders</p>
              <p className="font-bold">{marketStats.sellOrders}</p>
            </div>
            <div className="bg-gray-700/30 rounded p-2">
              <p className="text-xs text-gray-400">Total Liquidity</p>
              <p className="font-bold">${marketStats.totalSellLiquidity.toFixed(2)}</p>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
              <p className="text-xs text-red-400">Rewarded Volume</p>
              <p className="font-bold text-red-300">${marketStats.rewardedSellVolume.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{marketStats.totalSellLiquidity > 0 ? `${((marketStats.rewardedSellVolume / marketStats.totalSellLiquidity) * 100).toFixed(1)}% of total` : '0%'}</p>
            </div>
            <div className="bg-gray-700/30 rounded p-2">
              <p className="text-xs text-gray-400">Price Range (Rewarded)</p>
              {marketStats.lowestRewardedSellPrice > 0 ? (
                <>
                  <p className="font-bold text-sm">${marketStats.lowestRewardedSellPrice.toFixed(6)}</p>
                  <p className="text-xs text-gray-500">to ${marketStats.highestRewardedSellPrice.toFixed(6)}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">No rewarded orders</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-3 pt-3 border-t border-gray-700 text-sm">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-gray-400">Total Market Liquidity:</span>
              <span className="font-bold ml-2">${(marketStats.totalBuyLiquidity + marketStats.totalSellLiquidity).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Rewarded Volume:</span>
              <span className="font-bold ml-2 text-green-400">${(marketStats.rewardedBuyVolume + marketStats.rewardedSellVolume).toFixed(2)}</span>
              {(marketStats.totalBuyLiquidity + marketStats.totalSellLiquidity) > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({((marketStats.rewardedBuyVolume + marketStats.rewardedSellVolume) / (marketStats.totalBuyLiquidity + marketStats.totalSellLiquidity) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-4 border-b border-gray-700">
        <button
          onClick={() => setSelectedTab('active')}
          className={`pb-2 px-1 font-medium transition-colors ${
            selectedTab === 'active' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Active Positions ({positions.length})
        </button>
        <button
          onClick={() => setSelectedTab('history')}
          className={`pb-2 px-1 font-medium transition-colors ${
            selectedTab === 'history' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Reward History ({rewardHistory.length})
        </button>
      </div>

      {/* Eligibility Summary */}
      {selectedTab === 'active' && positions.length > 0 && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex gap-4 text-sm mb-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-400">Eligible:</span>
              <span className="font-bold text-green-400">
                {positions.filter(p => p.eligibilityStatus === 'eligible').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚠</span>
              <span className="text-gray-400">Partial:</span>
              <span className="font-bold text-yellow-400">
                {positions.filter(p => p.eligibilityStatus === 'partial').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">✗</span>
              <span className="text-gray-400">Ineligible:</span>
              <span className="font-bold text-red-400">
                {positions.filter(p => p.eligibilityStatus === 'ineligible').length}
              </span>
            </div>
            <div className="flex-1 text-right text-gray-400">
              <span>Total Value Earning: </span>
              <span className="font-bold text-white">
                ${positions.filter(p => p.eligibilityStatus !== 'ineligible').reduce((sum, p) => sum + p.value, 0).toFixed(2)}
              </span>
            </div>
          </div>
          {/* Visual representation */}
          <RewardEligibilityChart positions={positions} currentAPR={currentAPR} />
        </div>
      )}

      {/* Active Positions */}
      {selectedTab === 'active' && (
        <div className="space-y-4">
          {positions.length > 0 ? (
            positions.map((position) => (
              <div 
                key={position.orderId} 
                className={`border rounded-lg p-4 transition-all ${
                  position.eligibilityStatus === 'eligible'
                    ? 'bg-gray-700/30 border-gray-600 hover:border-gray-500' 
                    : position.eligibilityStatus === 'partial'
                    ? 'bg-yellow-900/20 border-yellow-500/40 hover:border-yellow-500/60'
                    : 'bg-red-900/10 border-red-500/50 opacity-75'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Order Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        position.isBuy ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {position.isBuy ? 'BUY' : 'SELL'}
                      </span>
                      <span className="text-lg font-semibold">
                        Order #{position.orderId}
                      </span>
                      <span className="text-sm text-gray-400">
                        Tier {position.tier}
                      </span>
                      {position.spreadMultiplier > 1 && (
                        <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
                          <span>🎯</span>
                          <span>{position.spreadMultiplier}x</span>
                          <span className="text-gray-400">({position.bonusType})</span>
                        </span>
                      )}
                      {position.spreadMultiplier === 1 && position.potentialMultiplier > 1 && (
                        <span className="text-xs bg-gray-600/30 text-gray-400 px-2 py-1 rounded flex items-center gap-1" title="This order was placed before spread bonuses were implemented">
                          <span>📊</span>
                          <span>Potential {position.potentialMultiplier}x</span>
                          <span className="text-gray-500">({position.potentialBonusType})</span>
                        </span>
                      )}
                      {position.eligibilityStatus === 'eligible' ? (
                        <span className="text-xs bg-green-600/30 text-green-400 px-2 py-1 rounded flex items-center gap-1">
                          <span>✓</span>
                          <span>EARNING REWARDS</span>
                        </span>
                      ) : position.eligibilityStatus === 'partial' ? (
                        <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
                          <span>⚠</span>
                          <span>PARTIALLY CAPPED ({position.eligibilityPercent}%)</span>
                        </span>
                      ) : (
                        <span className="text-xs bg-red-600/30 text-red-400 px-2 py-1 rounded flex items-center gap-1">
                          <span>✗</span>
                          <span>NOT EARNING</span>
                        </span>
                      )}
                    </div>

                    {/* Eligibility Reason */}
                    {!position.isEligible && position.eligibilityReason && (
                      <div className="text-xs text-red-400 mb-2">
                        <span className="font-medium">Reason: </span>
                        {position.eligibilityReason}
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-400 block">Price</span>
                        <span className="font-medium">${position.price.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Amount</span>
                        <span className="font-medium">{position.amount.toFixed(6)} MC</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Filled</span>
                        <span className="font-medium">
                          {((position.filled / position.amount) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Value</span>
                        <span className="font-medium">${position.value.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Placed</span>
                        <span className="font-medium text-xs">{position.placedAt}</span>
                      </div>
                    </div>

                    {/* Rewards Info */}
                    <div className="bg-gray-800/50 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400 block text-xs">
                          Hourly Reward {position.spreadMultiplier > 1 ? `(${currentAPR}% × ${position.spreadMultiplier}x)` : ''}
                        </span>
                        <span className={`font-bold ${position.isEligible ? 'text-green-400' : 'text-red-400'}`}>
                          {position.hourlyReward.toFixed(6)} LC/hr
                        </span>
                        {position.hourlyReward > 0 && (
                          <span className="text-xs text-yellow-400 block">
                            ({(position.hourlyReward * 1000000).toFixed(1)} ulc/hr)
                          </span>
                        )}
                        <span className="text-xs text-gray-400 block">
                          ≈ ${(position.hourlyReward * 0.0001 * mcPrice).toFixed(10)}/hr
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Daily: {(position.hourlyReward * 24).toFixed(4)} LC
                        </span>
                        <span className="text-xs text-gray-500 block">
                          Yearly: {(position.hourlyReward * 8760).toFixed(2)} LC
                        </span>
                        {position.spreadMultiplier > 1 && (
                          <span className="text-xs text-yellow-400 block mt-1">
                            Effective APR: {(currentAPR * position.spreadMultiplier).toFixed(0)}%
                          </span>
                        )}
                        {position.spreadMultiplier === 1 && position.potentialMultiplier > 1 && (
                          <span className="text-xs text-gray-500 block mt-1">
                            (Could earn {(currentAPR * position.potentialMultiplier).toFixed(0)}% APR with spread bonus)
                          </span>
                        )}
                      </div>
                      <div>
                        <div 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleOrderExpanded(position.orderId)}
                        >
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            Total Earned 
                            <span className="text-xs">
                              {expandedOrders.has(position.orderId) ? '▼' : '▶'}
                            </span>
                          </span>
                          {position.totalRewardsEarned > 0 ? (
                            <>
                              <span className="font-bold text-purple-400">
                                {position.totalRewardsEarned.toFixed(6)} LC
                              </span>
                              <span className="text-xs text-yellow-400 block">
                                ({(position.totalRewardsEarned * 1000000).toFixed(1)} ulc)
                              </span>
                              <span className="text-xs text-gray-400 block">
                                ≈ ${(position.totalRewardsEarned * 0.0001 * mcPrice).toFixed(8)}
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-gray-500">
                              0 LC
                            </span>
                          )}
                        </div>
                        
                        {/* Expanded reward payments */}
                        {expandedOrders.has(position.orderId) && position.rewardPayments && position.rewardPayments.length > 0 && (
                          <div className="mt-2 ml-2 text-xs space-y-1 border-l-2 border-purple-500/30 pl-3">
                            <div className="text-gray-500 mb-1">
                              Share: {((position.hourlyReward * 1000000 / 39) * 100).toFixed(1)}% of total rewards
                              <br />
                              {position.rewardPayments.length} payments = {(position.totalRewardsEarned * 1000000).toFixed(1)} ulc total
                            </div>
                            {position.rewardPayments.slice(0, 10).map((payment, idx) => (
                              <div key={idx} className="text-gray-400">
                                <span className="text-gray-500">{payment.timestamp}</span>
                                <span className="text-purple-400 ml-2">
                                  ~{(payment.amount * 1000000).toFixed(1)} ulc
                                </span>
                                <span className="text-gray-600 ml-1">
                                  (Block #{payment.blockHeight})
                                </span>
                              </div>
                            ))}
                            {position.rewardPayments.length > 10 && (
                              <div className="text-gray-500 italic mt-1">
                                ... and {position.rewardPayments.length - 10} more payments
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2 italic">
                              Note: Individual amounts are estimates based on current order share
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400 block text-xs">Last Reward</span>
                        <span className="text-xs">
                          {position.lastRewardAt || 'Never'}
                        </span>
                        {!position.lastRewardAt && position.isEligible && (
                          <span className="text-xs text-yellow-400 block">
                            (Paid hourly)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Eligibility Warning */}
                    {!position.isEligible && (
                      <div className="mt-2 bg-red-900/30 border border-red-500/30 rounded p-2">
                        <p className="text-red-400 text-sm">
                          ⚠️ {position.eligibilityReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cancel Button */}
                  <button
                    onClick={() => onCancelOrder(position.orderId)}
                    className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <p className="text-gray-400">No active liquidity positions</p>
              <p className="text-sm text-gray-500 mt-2">
                Place orders on the DEX to start earning liquidity rewards
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">📊 Position Information</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Orders earn {currentAPR}% APR paid in LC tokens</li>
              <li>• Rewards distributed every 100 blocks (~8.3 minutes)</li>
              <li>• Minimum order value: ${(0.000001 * 8760 * 100 / currentAPR).toFixed(2)}</li>
              <li>• Orders outside tier volume caps don't earn rewards</li>
              <li>• Cancel anytime - earned rewards are automatically sent</li>
            </ul>
          </div>
        </div>
      )}

      {/* Reward History */}
      {selectedTab === 'history' && (
        <div className="space-y-2">
          {rewardHistory.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600 text-left">
                      <th className="p-2 text-gray-400">Time</th>
                      <th className="p-2 text-gray-400">Block</th>
                      <th className="p-2 text-gray-400">LC Amount</th>
                      <th className="p-2 text-gray-400">Value at Time</th>
                      <th className="p-2 text-gray-400">LC Price</th>
                      <th className="p-2 text-gray-400">Order ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewardHistory.map((payment, index) => (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30">
                        <td className="p-2">{payment.timestamp}</td>
                        <td className="p-2">#{payment.blockHeight}</td>
                        <td className="p-2 text-green-400 font-medium">
                          {payment.amount.toFixed(6)} LC
                        </td>
                        <td className="p-2 text-yellow-400 font-medium">
                          ${payment.valueInTUSD.toFixed(6)} TUSD
                        </td>
                        <td className="p-2 text-gray-400 text-xs">
                          {payment.lcPriceAtTime.toFixed(6)} MC<br/>
                          @ ${payment.mcPriceAtTime.toFixed(6)}
                        </td>
                        <td className="p-2 text-gray-400">{payment.orderId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded">
                <div className="space-y-1">
                  <p className="text-sm text-green-400">
                    Total rewards received: {rewardHistory.reduce((sum, p) => sum + p.amount, 0).toFixed(6)} LC
                  </p>
                  <p className="text-sm text-yellow-400">
                    Total value at time of payment: ${rewardHistory.reduce((sum, p) => sum + p.valueInTUSD, 0).toFixed(6)} TUSD
                  </p>
                  <p className="text-xs text-gray-400">
                    Note: Values shown are at the time each reward was distributed
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <p className="text-gray-400">No reward payments yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Rewards are distributed every 100 blocks to eligible positions
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};