import React, { useState, useEffect } from 'react';
import { MainCoinInfo } from '../components/MainCoinInfo';
import { fetchAPI } from '../utils/api';

interface EpochInfo {
  currentEpoch: number;
  currentPrice: string;
  supplyBeforeDev: string;
  devAllocation: string;
  totalSupply: string;
  totalValue: string;
  requiredReserve: string;
  currentReserve: string;
  reserveNeeded: string;
  tokensNeeded: string;
  usdcCollected: string;
}

export const MainCoinPage: React.FC = () => {
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);

  useEffect(() => {
    const fetchEpochInfo = async () => {
      try {
        // Try to fetch current epoch info from API
        const epochResponse = await fetchAPI('/mychain/maincoin/v1/segment_info');
        
        if (epochResponse && epochResponse.currentEpoch !== undefined) {
          setEpochInfo({
            currentEpoch: epochResponse.currentEpoch,
            currentPrice: epochResponse.currentPrice || '0.0001001',
            supplyBeforeDev: epochResponse.supplyBeforeDev || '100010',
            devAllocation: epochResponse.devAllocation || '0.001099',
            totalSupply: epochResponse.totalSupply || '100021.991099',
            totalValue: epochResponse.totalValue || '10.01222425',
            requiredReserve: epochResponse.requiredReserve || '1.001222425',
            currentReserve: epochResponse.currentReserve || '0.001099',
            reserveNeeded: epochResponse.reserveNeeded || '0.000123425',
            tokensNeeded: epochResponse.tokensNeeded || '12.33',
            usdcCollected: epochResponse.usdcCollected || '0.001234'
          });
        }
      } catch (error) {
        // Correct values for Epoch 1 with initial dev allocation
        // Segment 0: 100,000 MC created, perfect 1:10 balance
        // Segment 1: Starts with 10 MC dev allocation from genesis
        setEpochInfo({
          currentEpoch: 1,
          currentPrice: '0.0001001',
          supplyBeforeDev: '100000',
          devAllocation: '10',
          totalSupply: '100010',
          totalValue: '10.001',
          requiredReserve: '1.0001',
          currentReserve: '1.000',
          reserveNeeded: '0.0001',
          tokensNeeded: '10.99',
          usdcCollected: '0.001099'
        });
      }
    };

    fetchEpochInfo();
    const interval = setInterval(fetchEpochInfo, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">MainCoin</h1>
        <div className="text-right">
          <span className="text-sm text-gray-400">Bonding Curve Token</span>
          {epochInfo && (
            <div className="text-lg font-bold text-blue-400">
              Epoch #{epochInfo.currentEpoch}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid gap-6">
        {/* Epoch Information */}
        {epochInfo && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Epoch {epochInfo.currentEpoch} Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Current Price</p>
                <p className="text-2xl font-bold text-blue-400">${epochInfo.currentPrice}</p>
                <p className="text-xs text-gray-500">per MainCoin</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Total Supply</p>
                <p className="text-2xl font-bold text-green-400">{parseFloat(epochInfo.totalSupply).toLocaleString()}</p>
                <p className="text-xs text-gray-500">MainCoin</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-yellow-400">${epochInfo.totalValue}</p>
                <p className="text-xs text-gray-500">USD</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Tokens Needed</p>
                <p className="text-2xl font-bold text-purple-400">{epochInfo.tokensNeeded}</p>
                <p className="text-xs text-gray-500">for balance</p>
              </div>
            </div>
          </div>
        )}

        {/* Reserve Information */}
        {epochInfo && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Reserve Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Current Reserve</p>
                <p className="text-2xl font-bold text-green-400">${epochInfo.currentReserve}</p>
                <p className="text-xs text-gray-500">TestUSD held</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Required Reserve</p>
                <p className="text-2xl font-bold text-blue-400">${epochInfo.requiredReserve}</p>
                <p className="text-xs text-gray-500">for 1:10 ratio</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Reserve Needed</p>
                <p className="text-2xl font-bold text-orange-400">${epochInfo.reserveNeeded}</p>
                <p className="text-xs text-gray-500">to balance</p>
              </div>
            </div>
          </div>
        )}

        {/* Dev Allocation */}
        {epochInfo && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Development Allocation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Supply Before Dev</p>
                <p className="text-2xl font-bold text-blue-400">{parseFloat(epochInfo.supplyBeforeDev).toLocaleString()}</p>
                <p className="text-xs text-gray-500">MainCoin</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Dev Allocation</p>
                <p className="text-2xl font-bold text-purple-400">{epochInfo.devAllocation}</p>
                <p className="text-xs text-gray-500">from previous segment</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">USDC Collected</p>
                <p className="text-2xl font-bold text-green-400">${epochInfo.usdcCollected}</p>
                <p className="text-xs text-gray-500">from sales</p>
              </div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-400">
                💡 Dev allocation is calculated as 0.01% of tokens sold in a segment and 
                added AFTER the segment closes. This allocation becomes part of the next segment's supply.
              </p>
            </div>
          </div>
        )}

        <MainCoinInfo />
        
        {/* Buy/Sell Interface */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Trade MainCoin</h2>
          
          {/* Dynamic Pricing Warning */}
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-400 mb-2">⚠️ Dynamic Segment Pricing</h3>
            <p className="text-sm text-gray-300">
              Large purchases may span multiple segments with increasing prices. The system automatically 
              moves to the next segment when 1:10 balance is reached, increasing price by 0.1% per segment.
              Maximum 25 segments per transaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold text-green-400 mb-3">Buy MainCoin</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount (TestUSD)</label>
                  <input 
                    type="number" 
                    id="buyAmount"
                    className="w-full bg-gray-700 rounded px-3 py-2" 
                    placeholder="0.00" 
                    step="0.000001"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <p>Starting Price: ${epochInfo ? epochInfo.currentPrice : '0.0001001'} per MC</p>
                  <p>Final Price: Depends on segments crossed</p>
                  <p>Average Price: Calculated automatically</p>
                </div>
                <button 
                  onClick={() => {
                    const amount = (document.getElementById('buyAmount') as HTMLInputElement).value;
                    if (amount) {
                      console.log('Buy MainCoin:', amount, 'TestUSD');
                      // TODO: Implement Keplr transaction
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 rounded py-2 font-semibold"
                >
                  Buy MainCoin
                </button>
              </div>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold text-red-400 mb-3">Sell MainCoin</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount (MainCoin)</label>
                  <input 
                    type="number" 
                    id="sellAmount"
                    className="w-full bg-gray-700 rounded px-3 py-2" 
                    placeholder="0.00"
                    step="0.000001" 
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <p>Current Price: ${epochInfo ? epochInfo.currentPrice : '0.0001001'} per MC</p>
                  <p>Sells at current segment price</p>
                  <p>No segment crossing on sells</p>
                </div>
                <button 
                  onClick={() => {
                    const amount = (document.getElementById('sellAmount') as HTMLInputElement).value;
                    if (amount) {
                      console.log('Sell MainCoin:', amount, 'MC');
                      // TODO: Implement Keplr transaction
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 rounded py-2 font-semibold"
                >
                  Sell MainCoin
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Results Modal (hidden by default) */}
        <div id="purchaseResults" className="hidden bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Purchase Complete!</h2>
          <div id="purchaseResultsContent">
            {/* Results will be populated here */}
          </div>
        </div>

        {/* Epoch Process Explanation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Epoch System & Bonding Curve</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-400">🏁 Epoch 0 (Genesis)</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• $1.00 TestUSD moved to reserves</li>
                <li>• 100,000 MainCoin generated</li>
                <li>• Price: $0.0001 per MC</li>
                <li>• Total MC value: $10.00</li>
                <li>• ✅ 1:10 ratio achieved</li>
              </ul>
            </div>
            
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-400">🚀 Epoch 1 (Current)</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Price: ${epochInfo ? epochInfo.currentPrice : '0.0001001'}</li>
                <li>• Supply: {epochInfo ? parseFloat(epochInfo.totalSupply).toLocaleString() : '100,000'} MC</li>
                <li>• Dev allocation: {epochInfo ? epochInfo.devAllocation : '0'} MC</li>
                <li>• USDC collected: ${epochInfo ? epochInfo.usdcCollected : '0.000000'}</li>
                <li>• 📊 Ready for new sales</li>
              </ul>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-400">⭐ Reserve Management</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Target ratio: 1:10 (reserves:MC value)</li>
                <li>• Current: ${epochInfo ? epochInfo.currentReserve : '1.000000'} reserves</li>
                <li>• Required: ${epochInfo ? epochInfo.requiredReserve : '1.00001'} reserves</li>
                <li>• Need: {epochInfo ? epochInfo.tokensNeeded : '0.99'} MC sales</li>
                <li>• 🔄 Nearly balanced system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Iterative Segment Calculation System */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Iterative Segment Calculation</h2>
          
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2 text-blue-400">🔄 Segment Process</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>**Calculate:** How many MC needed to reach 1:10 balance at current price</li>
              <li>**Sell:** That exact amount of MC to user</li>
              <li>**Trigger:** 1:10 balance achieved → segment closes</li>
              <li>**Dev Allocation:** 0.01% of sold tokens minted & added to dev</li>
              <li>**Price Increase:** New segment starts at 0.1% higher price</li>
              <li>**Recalculate:** How many MC needed at NEW price for 1:10 balance</li>
              <li>**Repeat:** Until user's purchase amount is fulfilled</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-400">Current Segment Status</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Segment: {epochInfo ? `#${epochInfo.currentEpoch}` : 'Loading...'}</li>
                <li>• Current Price: ${epochInfo ? epochInfo.currentPrice : '0.0001001'}</li>
                <li>• MC Needed: {epochInfo ? epochInfo.tokensNeeded : '0.99'} to reach 1:10</li>
                <li>• Reserve Gap: ${epochInfo ? epochInfo.reserveNeeded : '0.00001'}</li>
                <li>• When sold → Move to next segment</li>
              </ul>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-400">Example Transaction Flow</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• User wants $2 worth of MC</li>
                <li>• **Segment 1:** Sell 0.99 MC → Balance achieved</li>
                <li>• **Price up:** $0.0001001 → $0.0001002</li>
                <li>• **Recalculate:** Need X MC for next balance</li>
                <li>• **Segment 2:** Continue with remaining $1.90</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-orange-900/20 border border-orange-500 rounded-lg p-4 mt-4">
            <h3 className="font-semibold mb-2 text-orange-400">💡 Key Mechanism</h3>
            <p className="text-sm text-gray-300">
              The system **recalculates** the required MC amount for each new segment price. This means 
              each segment may require different amounts of MC to achieve the 1:10 balance, creating 
              precise price discovery and ensuring the bonding curve responds accurately to market dynamics.
            </p>
          </div>
        </div>

        {/* Segment History and Forecast */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Segment History & Forecast</h2>
          
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-400 mb-2">📌 Table Column Explanation</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <strong>Supply Before Dev:</strong> Starting supply for the segment</li>
              <li>• <strong>Dev from Prev:</strong> Dev allocation received from previous segment</li>
              <li>• <strong>Tokens to Balance:</strong> MC that need to be sold to achieve 1:10 ratio</li>
              <li>• <strong>Total Tokens to Balance:</strong> Sum of Dev from Prev + Tokens to Balance</li>
              <li>• <strong>Total Supply:</strong> Final supply after dev allocation + tokens sold</li>
            </ul>
            <p className="text-sm text-gray-300 mt-2">
              <strong>Example:</strong> Segment 1 starts with 100,000 MC + 10 dev = 100,010 MC. 
              Needs to sell 10.99 MC to balance. Final supply: 100,021.99 MC.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-2 text-gray-300">Epoch</th>
                  <th className="text-right p-2 text-gray-300">Price</th>
                  <th className="text-right p-2 text-gray-300">Supply Before Dev</th>
                  <th className="text-right p-2 text-gray-300">Dev from Prev</th>
                  <th className="text-right p-2 text-gray-300">Tokens to Balance</th>
                  <th className="text-right p-2 text-gray-300">Total Tokens to Balance</th>
                  <th className="text-right p-2 text-gray-300">Total Supply</th>
                  <th className="text-right p-2 text-gray-300">Total Value</th>
                  <th className="text-right p-2 text-gray-300">Required Reserve</th>
                  <th className="text-right p-2 text-gray-300">Balance Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Completed Segments */}
                <tr className="border-b border-gray-700 bg-blue-900/10">
                  <td className="p-2 font-semibold text-blue-400">0 ✅</td>
                  <td className="p-2 text-right">$0.0001</td>
                  <td className="p-2 text-right">100,000</td>
                  <td className="p-2 text-right">-</td>
                  <td className="p-2 text-right">0</td>
                  <td className="p-2 text-right">0</td>
                  <td className="p-2 text-right">100,010</td>
                  <td className="p-2 text-right">$10.001</td>
                  <td className="p-2 text-right">$1.0001</td>
                  <td className="p-2 text-right text-green-400">1:10 ✅</td>
                </tr>
                
                {/* Current Segment */}
                <tr className="border-b border-gray-700 bg-green-900/10">
                  <td className="p-2 font-semibold text-green-400">1 🔄</td>
                  <td className="p-2 text-right">$0.0001001</td>
                  <td className="p-2 text-right">100,000</td>
                  <td className="p-2 text-right">10</td>
                  <td className="p-2 text-right">10.99</td>
                  <td className="p-2 text-right">20.99</td>
                  <td className="p-2 text-right">100,020.99</td>
                  <td className="p-2 text-right">$10.0121</td>
                  <td className="p-2 text-right">$1.00121</td>
                  <td className="p-2 text-right text-yellow-400">~1:10</td>
                </tr>
                
                <tr className="border-b border-gray-700 bg-green-900/10">
                  <td className="p-2 font-semibold text-green-400">2 🔄</td>
                  <td className="p-2 text-right">$0.0001002</td>
                  <td className="p-2 text-right">100,020.99</td>
                  <td className="p-2 text-right">0.001099</td>
                  <td className="p-2 text-right">11.00</td>
                  <td className="p-2 text-right">11.001099</td>
                  <td className="p-2 text-right">100,032.091099</td>
                  <td className="p-2 text-right">$10.02321353</td>
                  <td className="p-2 text-right">$1.002321353</td>
                  <td className="p-2 text-right text-yellow-400">~1:10</td>
                </tr>
                
                <tr className="border-b border-gray-700 bg-green-900/10">
                  <td className="p-2 font-semibold text-green-400">3 🔄</td>
                  <td className="p-2 text-right">$0.0001003</td>
                  <td className="p-2 text-right">100,032.091099</td>
                  <td className="p-2 text-right">0.0011</td>
                  <td className="p-2 text-right">11.09</td>
                  <td className="p-2 text-right">11.0911</td>
                  <td className="p-2 text-right">100,043.182199</td>
                  <td className="p-2 text-right">$10.03433077</td>
                  <td className="p-2 text-right">$1.003433077</td>
                  <td className="p-2 text-right text-yellow-400">~1:10</td>
                </tr>
                
                <tr className="border-b border-gray-700 bg-green-900/10">
                  <td className="p-2 font-semibold text-green-400">4 🔄</td>
                  <td className="p-2 text-right">$0.0001004</td>
                  <td className="p-2 text-right">100,043.182199</td>
                  <td className="p-2 text-right">0.001109</td>
                  <td className="p-2 text-right">11.10</td>
                  <td className="p-2 text-right">11.101109</td>
                  <td className="p-2 text-right">100,054.283308</td>
                  <td className="p-2 text-right">$10.04544603</td>
                  <td className="p-2 text-right">$1.004544603</td>
                  <td className="p-2 text-right text-yellow-400">~1:10</td>
                </tr>
                
                <tr className="border-b border-gray-700 bg-green-900/10">
                  <td className="p-2 font-semibold text-green-400">5 🔄</td>
                  <td className="p-2 text-right">$0.0001005</td>
                  <td className="p-2 text-right">100,054.283308</td>
                  <td className="p-2 text-right">0.00111</td>
                  <td className="p-2 text-right">11.10</td>
                  <td className="p-2 text-right">11.10111</td>
                  <td className="p-2 text-right">100,065.384418</td>
                  <td className="p-2 text-right">$10.05657114</td>
                  <td className="p-2 text-right">$1.005657114</td>
                  <td className="p-2 text-right text-yellow-400">~1:10</td>
                </tr>
                
                {/* Future Estimates */}
                <tr className="border-b border-gray-700 bg-gray-700/10">
                  <td className="p-2 font-semibold text-gray-400">6 📊</td>
                  <td className="p-2 text-right text-gray-400">$0.0001006</td>
                  <td className="p-2 text-right text-gray-400">100,065.384418</td>
                  <td className="p-2 text-right text-gray-400">0.00111</td>
                  <td className="p-2 text-right text-gray-400">11.11</td>
                  <td className="p-2 text-right text-gray-400">11.11111</td>
                  <td className="p-2 text-right text-gray-400">100,076.495528</td>
                  <td className="p-2 text-right text-gray-400">$10.06770152</td>
                  <td className="p-2 text-right text-gray-400">$1.006770152</td>
                  <td className="p-2 text-right text-gray-400">~1:10</td>
                </tr>
                
                <tr className="border-b border-gray-700 bg-gray-700/10">
                  <td className="p-2 font-semibold text-gray-400">7 📊</td>
                  <td className="p-2 text-right text-gray-400">$0.0001007</td>
                  <td className="p-2 text-right text-gray-400">100,076.495528</td>
                  <td className="p-2 text-right text-gray-400">0.001111</td>
                  <td className="p-2 text-right text-gray-400">11.11</td>
                  <td className="p-2 text-right text-gray-400">11.111111</td>
                  <td className="p-2 text-right text-gray-400">100,087.606639</td>
                  <td className="p-2 text-right text-gray-400">$10.07883489</td>
                  <td className="p-2 text-right text-gray-400">$1.007883489</td>
                  <td className="p-2 text-right text-gray-400">~1:10</td>
                </tr>
                
                <tr className="border-b border-gray-700 bg-gray-700/10">
                  <td className="p-2 font-semibold text-gray-400">8 📊</td>
                  <td className="p-2 text-right text-gray-400">$0.0001008</td>
                  <td className="p-2 text-right text-gray-400">100,087.606639</td>
                  <td className="p-2 text-right text-gray-400">0.001111</td>
                  <td className="p-2 text-right text-gray-400">11.11</td>
                  <td className="p-2 text-right text-gray-400">11.111111</td>
                  <td className="p-2 text-right text-gray-400">100,098.71775</td>
                  <td className="p-2 text-right text-gray-400">$10.08997472</td>
                  <td className="p-2 text-right text-gray-400">$1.008997472</td>
                  <td className="p-2 text-right text-gray-400">~1:10</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p><span className="text-blue-400">✅ Completed</span> - Segments that have achieved 1:10 balance</p>
            <p><span className="text-green-400">🔄 Active/Projected</span> - Current segment and immediate projections</p>
            <p><span className="text-gray-400">📊 Estimates</span> - Future segment forecasts based on current trends</p>
            <p>• Negative "Reserve Needed" indicates excess reserves vs required 1:10 ratio</p>
            <p>• Dev allocation is 0.01% of tokens sold in the segment, added AFTER segment closes</p>
            <p>• Dev tokens are included in the NEXT segment's supply calculations</p>
          </div>
        </div>
      </div>
    </div>
  );
};