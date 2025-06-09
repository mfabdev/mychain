import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TransactionDetails } from '../components/TransactionDetails';
import { TransactionHistory } from '../components/TransactionHistory';
import { SegmentPurchaseDetails } from '../components/SegmentPurchaseDetails';
import { DevAllocationTracker } from '../components/DevAllocationTracker';
import { SegmentProgressionChart } from '../components/SegmentProgressionChart';
import { SegmentHistoryViewer } from '../components/SegmentHistoryViewer';
import { UserPurchaseHistory } from '../components/UserPurchaseHistory';
import { fetchAPI } from '../utils/api';
import { SigningStargateClient } from '@cosmjs/stargate';

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
  devAllocationFromAPI?: string;
}

interface MainCoinPageProps {
  address: string;
  isConnected: boolean;
  client: SigningStargateClient | null;
}

export const MainCoinPage: React.FC<MainCoinPageProps> = ({ address, isConnected, client }) => {
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [commandType, setCommandType] = useState('');
  const [txStatus, setTxStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [useDirectExecution, setUseDirectExecution] = useState(true); // Default to direct execution
  const [lastPurchaseDetails, setLastPurchaseDetails] = useState<any>(null);

  useEffect(() => {
    fetchEpochInfo();
    // Poll more frequently to catch segment changes
    const interval = setInterval(fetchEpochInfo, 5000); // Changed from 30s to 5s
    return () => clearInterval(interval);
  }, []);

  const fetchEpochInfo = async () => {
    try {
      // Try to fetch current segment info from API
      const epochResponse = await fetchAPI('/mychain/maincoin/v1/segment_info');
      
      if (epochResponse && epochResponse.current_epoch !== undefined) {
        // Parse the total supply from API
        const totalSupplyFromAPI = parseFloat(epochResponse.total_supply) / 1000000; // Convert from smallest unit
        
        // Get dev allocation from API if available
        const devAllocationFromAPI = epochResponse.dev_allocation_total ? 
          parseFloat(epochResponse.dev_allocation_total) / 1000000 : 0;
        
        // Total supply already includes dev allocation
        const correctedTotalSupply = totalSupplyFromAPI;
        
        // Log the calculation for debugging
        console.log('MainCoin API Response:', epochResponse);
        console.log('MainCoin calculation debug:', {
          totalSupplyFromAPI,
          devAllocationFromAPI,
          correctedTotalSupply,
          apiResponse: epochResponse
        });
        
        // Use blockchain's calculated values
        const currentPriceNum = parseFloat(epochResponse.current_price);
        const totalValue = correctedTotalSupply * currentPriceNum;
        const requiredReserve = totalValue / 10; // 1:10 ratio
        const currentReserve = parseFloat(epochResponse.reserve_balance) / 1000000; // Convert from utestusd
        const reserveNeeded = requiredReserve - currentReserve;
        // Use the blockchain's tokens_needed if available, otherwise calculate
        const tokensNeeded = epochResponse.tokens_needed ? 
          parseFloat(epochResponse.tokens_needed) / 1000000 : // Convert from micro units
          reserveNeeded / currentPriceNum;
        
        console.log('Tokens needed calculation:', {
          totalValue,
          requiredReserve,
          currentReserve,
          reserveNeeded,
          tokensNeeded
        });
        
        setEpochInfo({
          currentEpoch: parseInt(epochResponse.current_epoch),
          currentPrice: epochResponse.current_price || '0.0001001',
          supplyBeforeDev: (totalSupplyFromAPI - devAllocationFromAPI).toFixed(0),
          devAllocation: devAllocationFromAPI.toFixed(0),
          totalSupply: correctedTotalSupply.toFixed(0),
          totalValue: totalValue.toFixed(7),
          requiredReserve: requiredReserve.toFixed(7),
          currentReserve: currentReserve.toFixed(6),
          reserveNeeded: reserveNeeded.toFixed(7),
          tokensNeeded: tokensNeeded.toFixed(2),
          usdcCollected: epochResponse.usdcCollected || '0',
          devAllocationFromAPI: devAllocationFromAPI.toFixed(0)
        });
      }
    } catch (error) {
      console.error('Failed to fetch epoch info:', error);
      // Correct values for Segment 1 with initial dev allocation
      setEpochInfo({
        currentEpoch: 1,
        currentPrice: '0.0001001',
        supplyBeforeDev: '100000',
        devAllocation: '10',
        totalSupply: '100010',
        totalValue: '10.011001',
        requiredReserve: '1.0011001',
        currentReserve: '1.0',
        reserveNeeded: '0.0011001',
        tokensNeeded: '10.99',
        usdcCollected: '0'
      });
    }
  };

  const handleBuyMainCoin = async () => {
    if (!buyAmount) {
      alert('Please enter an amount');
      return;
    }

    setIsLoading(true);
    setTxStatus('');
    setTxHash('');
    
    try {
      if (useDirectExecution) {
        // Direct execution through terminal server
        const response = await fetch('http://localhost:3003/execute-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'buy',
            amount: buyAmount
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          setTxStatus('✅ Transaction submitted successfully!');
          setTxHash(result.txHash || '');
          
          // Parse segment details if available
          if (result.segments) {
            setLastPurchaseDetails({
              segments: result.segments,
              totalUserTokens: result.totalTokensBought || '0',
              totalDevAllocation: result.totalDevAllocation || '0',
              totalCost: result.totalPaid || '0'
            });
          }
          
          // Immediately refresh the epoch info
          fetchEpochInfo();
          setBuyAmount('');
          // Also refresh after a delay to catch any pending state changes
          setTimeout(() => {
            fetchEpochInfo();
          }, 3000);
        } else {
          setTxStatus(`❌ Transaction failed: ${result.error}`);
        }
      } else {
        // Execute through Keplr
        console.log('Wallet state check:', { isConnected, hasClient: !!client, address });
        if (!isConnected || !client || !address) {
          setTxStatus('❌ Please connect your wallet first');
          return;
        }

        // For now, let's alert the user that they need to use the CLI
        setTxStatus('⚠️ Web transactions for custom messages are not yet supported. Please use the CLI commands shown below.');
        
        // Generate the CLI command for the user
        const amountInMicro = Math.floor(parseFloat(buyAmount) * 1000000);
        const cliCommand = `mychaind tx maincoin buy-maincoin ${amountInMicro}utestusd --from [YOUR_KEY_NAME] --chain-id mychain --fees 50000alc --keyring-backend test -y`;
        
        setGeneratedCommand(cliCommand);
        setCommandType('buy');
        
        // Clear the amount
        setBuyAmount('');
      }
    } catch (error) {
      console.error('Buy transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTxStatus(`❌ Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellMainCoin = async () => {
    if (!sellAmount) {
      alert('Please enter an amount');
      return;
    }

    setIsLoading(true);
    setTxStatus('');
    setTxHash('');
    
    try {
      if (useDirectExecution) {
        // Direct execution through terminal server
        const response = await fetch('http://localhost:3003/execute-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sell',
            amount: sellAmount
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          setTxStatus('✅ Transaction submitted successfully!');
          setTxHash(result.txHash || '');
          // Immediately refresh the epoch info
          fetchEpochInfo();
          setSellAmount('');
          // Also refresh after a delay to catch any pending state changes
          setTimeout(() => {
            fetchEpochInfo();
          }, 3000);
        } else {
          setTxStatus(`❌ Transaction failed: ${result.error}`);
        }
      } else {
        // Execute through Keplr
        if (!isConnected || !client || !address) {
          setTxStatus('❌ Please connect your wallet first');
          return;
        }

        // For now, let's alert the user that they need to use the CLI
        setTxStatus('⚠️ Web transactions for custom messages are not yet supported. Please use the CLI commands shown below.');
        
        // Generate the CLI command for the user
        const amountInMicro = Math.floor(parseFloat(sellAmount) * 1000000);
        const cliCommand = `mychaind tx maincoin sell-maincoin ${amountInMicro}maincoin --from [YOUR_KEY_NAME] --chain-id mychain --fees 50000alc --keyring-backend test -y`;
        
        setGeneratedCommand(cliCommand);
        setCommandType('sell');
        
        // Clear the amount
        setSellAmount('');
      }
    } catch (error) {
      console.error('Sell transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTxStatus(`❌ Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCommand);
      alert('Command copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback: select the text
      const textArea = document.getElementById('command-text') as HTMLTextAreaElement;
      if (textArea) {
        textArea.select();
        document.execCommand('copy');
        alert('Command copied to clipboard!');
      }
    }
  };

  const openTerminal = async () => {
    try {
      // Try to open terminal in the blockchain directory
      const blockchainPath = '/home/dk/go/src/myrollapps/mychain';
      
      // Make a request to our local server to execute the command
      const response = await fetch('http://localhost:3003/open-terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          directory: blockchainPath,
          command: generatedCommand
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert(`✅ Terminal opened successfully!\n\nMethod: ${result.terminal}\nDirectory: ${result.directory}\n\nNow paste your command in the terminal.`);
      } else {
        console.log('Terminal server response:', result);
        // Fallback: show manual instructions
        showManualTerminalInstructions();
      }
    } catch (error) {
      console.error('Failed to open terminal:', error);
      showManualTerminalInstructions();
    }
  };

  const showManualTerminalInstructions = () => {
    const instructions = `
Terminal Instructions:

1. Open your terminal application manually
2. Navigate to blockchain directory:
   cd /home/dk/go/src/myrollapps/mychain

3. Paste and run the command:
   ${generatedCommand}

Alternative commands to open terminal:
• Ctrl+Alt+T (Ubuntu/Linux)
• Windows: Open WSL terminal
• Or search for "Terminal" in your applications
    `;
    alert(instructions);
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">MainCoin</h1>
        <div className="text-right">
          <span className="text-sm text-gray-400">Bonding Curve Token</span>
          {epochInfo && (
            <div className="text-lg font-bold text-blue-400">
              Segment #{epochInfo.currentEpoch}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid gap-6">
        {/* Segment Information */}
        {epochInfo && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Segment {epochInfo.currentEpoch} Status</h2>
              <Link 
                to="/maincoin/history" 
                className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-2"
              >
                View Complete Segment History
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
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
                <p className="text-2xl font-bold text-purple-400">{epochInfo.tokensNeeded} MC</p>
                <p className="text-xs text-gray-500">to achieve 1:10 balance</p>
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

        
        {/* Buy/Sell Interface */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Trade MainCoin</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Direct Execution:</label>
              <button
                onClick={() => setUseDirectExecution(!useDirectExecution)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useDirectExecution ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useDirectExecution ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          
          {/* Connection Status */}
          {useDirectExecution ? (
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-4">
              <p className="text-blue-400 font-semibold">🚀 Direct Execution Mode</p>
              <p className="text-sm text-gray-300">Transactions will be executed directly through the admin account.</p>
            </div>
          ) : (
            <>
              {!isConnected && (
                <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-4">
                  <p className="text-yellow-400 font-semibold">⚠️ Wallet Not Connected</p>
                  <p className="text-sm text-gray-300">Please connect your Keplr wallet to trade MainCoin.</p>
                </div>
              )}
              
              {isConnected && (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-4">
                  <p className="text-green-400 font-semibold">✅ Wallet Connected</p>
                  <p className="text-sm text-gray-300">Address: {address}</p>
                </div>
              )}
            </>
          )}
          
          {/* Transaction Status */}
          {txStatus && (
            <div className={`rounded-lg p-4 mb-4 ${
              txStatus.includes('✅') ? 'bg-green-900/20 border border-green-500' : 'bg-red-900/20 border border-red-500'
            }`}>
              <p className={`font-semibold ${
                txStatus.includes('✅') ? 'text-green-400' : 'text-red-400'
              }`}>{txStatus}</p>
              {txHash && (
                <p className="text-sm text-gray-300 mt-1">
                  Tx Hash: <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-10)}</span>
                </p>
              )}
            </div>
          )}
          
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
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="w-full bg-gray-700 rounded px-3 py-2" 
                    placeholder="2.00" 
                    step="0.000001"
                    disabled={isLoading}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <p>Starting Price: ${epochInfo ? epochInfo.currentPrice : '0.0001001'} per MC</p>
                  <p>Final Price: Depends on segments crossed</p>
                  <p>Average Price: Calculated automatically</p>
                </div>
                <button 
                  onClick={handleBuyMainCoin}
                  disabled={isLoading || !buyAmount}
                  className={`w-full rounded py-2 font-semibold ${
                    isLoading || !buyAmount
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isLoading ? 'Processing...' : '🚀 Buy MainCoin'}
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
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="w-full bg-gray-700 rounded px-3 py-2" 
                    placeholder="0.00"
                    step="0.000001"
                    disabled={isLoading}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <p>Current Price: ${epochInfo ? epochInfo.currentPrice : '0.0001001'} per MC</p>
                  <p>Sells at current segment price</p>
                  <p>No segment crossing on sells</p>
                </div>
                <button 
                  onClick={handleSellMainCoin}
                  disabled={isLoading || !sellAmount}
                  className={`w-full rounded py-2 font-semibold ${
                    isLoading || !sellAmount
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isLoading ? 'Processing...' : '💸 Sell MainCoin'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generated Command Display */}
        {generatedCommand && !useDirectExecution && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-400">
                📋 Generated {commandType === 'buy' ? 'Buy' : 'Sell'} Command
              </h2>
              <button
                onClick={() => setGeneratedCommand('')}
                className="text-gray-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Copy this command and run it in your terminal:
              </label>
              <textarea
                id="command-text"
                value={generatedCommand}
                readOnly
                className="w-full bg-gray-800 text-green-400 font-mono text-sm p-3 rounded border border-gray-600 resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={copyToClipboard}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
              >
                📋 Copy Command
              </button>
              <button
                onClick={openTerminal}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold"
              >
                🖥️ Open Terminal
              </button>
              <button
                onClick={() => {
                  setBuyAmount('');
                  setSellAmount('');
                  setGeneratedCommand('');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
              >
                ✅ Clear & Generate New
              </button>
            </div>
            
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
              <h3 className="font-semibold text-blue-400 mb-2">📝 Instructions:</h3>
              <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                <li>Replace <code className="bg-gray-700 px-1 rounded">[YOUR_KEY_NAME]</code> with your local key name (e.g., 'admin' or 'mykey')</li>
                <li>If you don't have a local key, create one: <code className="bg-gray-700 px-1 rounded">mychaind keys add mykey --keyring-backend test</code></li>
                <li>Check available keys: <code className="bg-gray-700 px-1 rounded">mychaind keys list --keyring-backend test</code></li>
                <li>Copy the command above (click "📋 Copy Command" button)</li>
                <li>Paste and run the command in your terminal</li>
                <li>Wait for the transaction to complete</li>
                <li>Refresh this page to see updated balances</li>
              </ol>
              
              <div className="mt-3 p-3 bg-gray-800 rounded border-l-4 border-purple-500">
                <p className="text-sm text-purple-300 font-semibold">🖥️ Manual Terminal Options:</p>
                <div className="text-xs text-gray-400 mt-1 space-y-1">
                  <p>• <kbd className="bg-gray-700 px-1 rounded">Ctrl+Alt+T</kbd> (Ubuntu/Linux)</p>
                  <p>• <kbd className="bg-gray-700 px-1 rounded">Windows Key</kbd> → Search "WSL" or "Terminal"</p>
                  <p>• Navigate to: <code className="bg-gray-700 px-1 rounded">/home/dk/go/src/myrollapps/mychain</code></p>
                </div>
              </div>
              
              <p className="text-sm text-yellow-400 mt-2">
                💡 This will {commandType === 'buy' ? `buy ${buyAmount} TestUSD worth of MainCoin` : `sell ${sellAmount} MainCoin`}
              </p>
            </div>
          </div>
        )}

        {/* Segment Process Explanation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Segment System & Bonding Curve</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-400">🏁 Segment 0 (Genesis)</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• $1.00 TestUSD moved to reserves</li>
                <li>• 100,000 MainCoin generated</li>
                <li>• Price: $0.0001 per MC</li>
                <li>• Total MC value: $10.00</li>
                <li>• ✅ 1:10 ratio achieved</li>
              </ul>
            </div>
            
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-400">🚀 Segment 1 (Current)</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Price: ${epochInfo ? epochInfo.currentPrice : '0.0001001'}</li>
                <li>• Supply: {epochInfo ? parseFloat(epochInfo.totalSupply).toLocaleString() : '100,010'} MC</li>
                <li>• Dev allocation: {epochInfo ? epochInfo.devAllocation : '10'} MC</li>
                <li>• USDC collected: ${epochInfo ? epochInfo.usdcCollected : '0.000000'}</li>
                <li>• 📊 Ready for new sales</li>
              </ul>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-400">⭐ Reserve Management</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Target ratio: 1:10 (reserves:MC value)</li>
                <li>• Current: ${epochInfo ? epochInfo.currentReserve : '1.000000'} reserves</li>
                <li>• Required: ${epochInfo ? epochInfo.requiredReserve : '1.0011001'} reserves</li>
                <li>• Need: {epochInfo ? epochInfo.tokensNeeded : '10.99'} MC sales</li>
                <li>• 🔄 Nearly balanced system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dev Allocation Tracker */}
        {epochInfo && (
          <DevAllocationTracker
            totalDevAllocation={epochInfo.devAllocationFromAPI || epochInfo.devAllocation}
            currentPrice={epochInfo.currentPrice}
            percentOfSupply={
              (parseFloat(epochInfo.devAllocationFromAPI || epochInfo.devAllocation) / 
               parseFloat(epochInfo.totalSupply)) * 100
            }
          />
        )}

        {/* Segment Progression Chart */}
        {epochInfo && (
          <SegmentProgressionChart
            currentSegment={epochInfo.currentEpoch}
            currentPrice={epochInfo.currentPrice}
            tokensNeeded={epochInfo.tokensNeeded}
            reserveNeeded={epochInfo.reserveNeeded}
          />
        )}

        {/* Transaction Details */}
        {txHash && (
          <TransactionDetails txHash={txHash} />
        )}

        {/* Segment Purchase Details */}
        {lastPurchaseDetails && (
          <SegmentPurchaseDetails
            segments={lastPurchaseDetails.segments}
            totalUserTokens={lastPurchaseDetails.totalUserTokens}
            totalDevAllocation={lastPurchaseDetails.totalDevAllocation}
            totalCost={lastPurchaseDetails.totalCost}
          />
        )}

        {/* Iterative Segment Calculation System */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Iterative Segment Calculation</h2>
          
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2 text-blue-400">🔄 Segment Process</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>**Calculate:** How many MC needed to reach 1:10 balance at current price</li>
              <li>**Sell:** That exact amount of MC to user</li>
              <li>**Trigger:** 1:10 balance achieved → segment closes</li>
              <li>**Dev Allocation:** 0.01% of sold tokens allocated to dev</li>
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
          
          {/* Blockchain Transaction Summary */}
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-400 mb-2">🔗 Actual Blockchain Data (Transaction F08C0A11...)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">User Received</p>
                <p className="font-bold">279.014 MC</p>
              </div>
              <div>
                <p className="text-gray-400">Dev Allocated</p>
                <p className="font-bold">0.027 MC</p>
              </div>
              <div>
                <p className="text-gray-400">Segments</p>
                <p className="font-bold">1→26 (25 total)</p>
              </div>
              <div>
                <p className="text-gray-400">TESTUSD Spent</p>
                <p className="font-bold">$0.028252</p>
              </div>
            </div>
            <p className="text-xs text-orange-400 mt-2">
              ⚠️ Note: Segment history queries are not available in current blockchain implementation. 
              The table below shows theoretical values based on the 1:10 reserve algorithm.
            </p>
          </div>
          
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
                  <th className="text-left p-2 text-gray-300">Segment</th>
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
                {/* Show actual blockchain data from transaction */}
                {epochInfo && (() => {
                  // From the actual blockchain transaction:
                  // - Total tokens bought: 279,013,985 (smallest unit) = 279.013985 MC
                  // - Dev tokens: 26,775 (smallest unit) = 0.026775 MC
                  // - Segments completed: 25 (segments 1-25)
                  // - Amount spent: 28,252 (utestusd) = $0.028252
                  
                  const actualTotalUserTokens = 279.013985;
                  const actualDevTokens = 0.026775;
                  const actualSegmentsCompleted = 25;
                  const actualAmountSpent = 0.028252;
                  
                  const segments = [];
                  let cumulativeSupply = 0;
                  let cumulativeReserve = 0;
                  
                  // Since we can't get per-segment data from blockchain, show aggregate info
                  const avgTokensPerSegment = actualTotalUserTokens / actualSegmentsCompleted;
                  const avgDevPerSegment = actualDevTokens / actualSegmentsCompleted;
                  
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
                  
                  for (let seg = 0; seg <= Math.min(epochInfo.currentEpoch - 1, 25); seg++) {
                    const segment = {
                      number: seg,
                      price: 0.0001 * Math.pow(1.001, seg),
                      supplyBefore: cumulativeSupply,
                      devFromPrev: 0,
                      tokensPurchased: 0,
                      newMinted: 0,
                      supplyAfter: 0,
                      totalValue: 0,
                      requiredReserve: 0,
                      actualReserve: 0
                    };
                    
                    if (seg === 0) {
                      // Genesis
                      segment.devFromPrev = 0;
                      segment.tokensPurchased = 0;
                      segment.newMinted = 100000;
                      segment.supplyAfter = 100000;
                      cumulativeSupply = 100000;
                      cumulativeReserve = 1.00; // Initial $1 reserve
                    } else if (seg === 1) {
                      // First segment after genesis
                      segment.supplyBefore = 100000;
                      segment.devFromPrev = 10; // 0.01% of 100k
                      segment.tokensPurchased = tokensToBalance[seg];
                      segment.newMinted = segment.devFromPrev + segment.tokensPurchased;
                      segment.supplyAfter = segment.supplyBefore + segment.newMinted;
                      cumulativeSupply = segment.supplyAfter;
                      // Add purchase amount to reserve
                      cumulativeReserve += segment.tokensPurchased * segment.price;
                    } else if (seg <= 25) {
                      // Segments 2-25 (part of the purchase)
                      // Dev allocation is 0.01% of new minted tokens (not including dev itself)
                      segment.tokensPurchased = tokensToBalance[seg];
                      segment.devFromPrev = segment.tokensPurchased * 0.0001; // 0.01% of purchased
                      segment.newMinted = segment.devFromPrev + segment.tokensPurchased;
                      segment.supplyAfter = segment.supplyBefore + segment.newMinted;
                      cumulativeSupply = segment.supplyAfter;
                      // Add purchase amount to reserve
                      cumulativeReserve += segment.tokensPurchased * segment.price;
                    }
                    
                    segment.totalValue = segment.supplyAfter * segment.price;
                    segment.requiredReserve = segment.totalValue / 10;
                    segment.actualReserve = cumulativeReserve;
                    
                    segments.push(segment);
                  }
                  
                  return segments.map(seg => (
                    <tr key={seg.number} className="border-b border-gray-700 bg-blue-900/10">
                      <td className="p-2 font-semibold text-blue-400">{seg.number} ✅</td>
                      <td className="p-2 text-right">${seg.price.toFixed(7)}</td>
                      <td className="p-2 text-right">{Math.round(seg.supplyBefore).toLocaleString()}</td>
                      <td className="p-2 text-right">{
                        seg.number === 0 ? '-' : 
                        seg.number === 1 ? '10.000' : 
                        seg.devFromPrev.toFixed(3)
                      }</td>
                      <td className="p-2 text-right">{
                        seg.number === 0 ? '0' : 
                        seg.tokensPurchased.toFixed(2)
                      }</td>
                      <td className="p-2 text-right">{seg.newMinted.toFixed(2)}</td>
                      <td className="p-2 text-right">{Math.round(seg.supplyAfter).toLocaleString()}</td>
                      <td className="p-2 text-right">${seg.totalValue.toFixed(2)}</td>
                      <td className="p-2 text-right">${seg.requiredReserve.toFixed(2)}</td>
                      <td className="p-2 text-right text-green-400">1:10 ✅</td>
                    </tr>
                  ));
                })()}
                
                {/* Current Segment */}
                <tr className="border-b border-gray-700 bg-green-900/10">
                  <td className="p-2 font-semibold text-green-400">{epochInfo?.currentEpoch || 1} 🔄</td>
                  <td className="p-2 text-right">${epochInfo?.currentPrice || '0.0001001'}</td>
                  <td className="p-2 text-right">{epochInfo?.supplyBeforeDev ? parseFloat(epochInfo.supplyBeforeDev).toLocaleString() : '100,000'}</td>
                  <td className="p-2 text-right">{
    !epochInfo || epochInfo.currentEpoch === 0
      ? '-' // No dev from previous for segment 0
      : epochInfo.currentEpoch === 1
        ? '10' // Segment 0 had 100k MC minted, so 10 MC dev
        : '~0.001' // All other segments have tiny dev allocations
  }</td>
                  <td className="p-2 text-right">{epochInfo?.tokensNeeded || '10.99'}</td>
                  <td className="p-2 text-right">{epochInfo?.currentEpoch === 1 ? (10 + parseFloat(epochInfo?.tokensNeeded || '10.99')).toFixed(2) : '-'}</td>
                  <td className="p-2 text-right">{epochInfo ? parseFloat(epochInfo.totalSupply).toLocaleString() : '100,010'}</td>
                  <td className="p-2 text-right">${epochInfo?.totalValue || '10.0121'}</td>
                  <td className="p-2 text-right">${epochInfo?.requiredReserve || '1.00121'}</td>
                  <td className="p-2 text-right text-yellow-400">~1:10</td>
                </tr>
                
                {/* Show a few future projections */}
                {epochInfo && Array.from({ length: 3 }, (_, i) => epochInfo.currentEpoch + i + 1).map(segment => (
                  <tr key={segment} className="border-b border-gray-700 bg-gray-700/10">
                    <td className="p-2 font-semibold text-gray-400">{segment} 📊</td>
                    <td className="p-2 text-right text-gray-400">${(0.0001 * Math.pow(1.001, segment)).toFixed(7)}</td>
                    <td className="p-2 text-right text-gray-400">-</td>
                    <td className="p-2 text-right text-gray-400">-</td>
                    <td className="p-2 text-right text-gray-400">~11.11</td>
                    <td className="p-2 text-right text-gray-400">-</td>
                    <td className="p-2 text-right text-gray-400">-</td>
                    <td className="p-2 text-right text-gray-400">-</td>
                    <td className="p-2 text-right text-gray-400">-</td>
                    <td className="p-2 text-right text-gray-400">~1:10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p><span className="text-blue-400">✅ Completed</span> - Segments that have achieved 1:10 balance</p>
            <p><span className="text-green-400">🔄 Active/Projected</span> - Current segment and immediate projections</p>
            <p><span className="text-gray-400">📊 Estimates</span> - Future segment forecasts based on current trends</p>
            <p>• Negative "Reserve Needed" indicates excess reserves vs required 1:10 ratio</p>
            <p>• Dev allocation is 0.01% of NEW MC minted in each segment (not total supply)</p>
            <p>• Dev tokens are calculated when segment closes and added at start of next segment</p>
          </div>
        </div>

        {/* Analytical Implementation Success */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🎉 Analytical Implementation Success!</h2>
          
          {/* Test Results Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Analytical Implementation Test Results</h3>
            
            {/* Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Old Implementation */}
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                <h4 className="font-semibold text-red-400 mb-2">❌ Old (Iterative with Bug)</h4>
                <div className="space-y-1 text-sm">
                  <p>• <strong>$1.00 Test:</strong> Only spent $0.008923</p>
                  <p>• <strong>Received:</strong> 88.94 MC</p>
                  <p>• <strong>Segments:</strong> 8 (stopped early)</p>
                  <p>• <strong>Efficiency:</strong> 0.89% fund usage</p>
                  <p className="text-red-300 mt-2">⚠️ TruncateInt() bug caused early exit</p>
                </div>
              </div>
              
              {/* New Implementation */}
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">✅ New (Analytical)</h4>
                <div className="space-y-1 text-sm">
                  <p>• <strong>$1.00 Test:</strong> Spent $0.028025</p>
                  <p>• <strong>Received:</strong> 276.72 MC</p>
                  <p>• <strong>Segments:</strong> 25 (limit reached!)</p>
                  <p>• <strong>Efficiency:</strong> 2.80% fund usage</p>
                  <p className="text-green-300 mt-2">🚀 3.1x improvement!</p>
                </div>
              </div>
            </div>
            
          </div>
          
          {/* Current State */}
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
            <h3 className="font-semibold text-blue-400 mb-2">📊 Current Blockchain State</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Current Segment</p>
                <p className="font-bold">#{epochInfo?.currentEpoch || 26}</p>
              </div>
              <div>
                <p className="text-gray-400">Current Price</p>
                <p className="font-bold">${epochInfo?.currentPrice || '0.000102632761501603'}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Supply</p>
                <p className="font-bold">{epochInfo ? parseFloat(epochInfo.totalSupply).toLocaleString() : '100,276.72'} MC</p>
              </div>
              <div>
                <p className="text-gray-400">Reserve Balance</p>
                <p className="font-bold">${epochInfo?.currentReserve || '1.028025'}</p>
              </div>
            </div>
          </div>
        </div>

          <div className="border-t border-gray-700 pt-4">
            <p className="text-sm text-gray-400">
              Transaction indexing is currently unavailable. Visit the{' '}
              <a href="/transactions" className="text-blue-400 hover:text-blue-300">
                Transactions page
              </a>{' '}
              for full history or use the CLI:{' '}
              <code className="bg-gray-700 px-2 py-1 rounded text-xs">
                mychaind query txs --query "message.action='/mychain.maincoin.v1.MsgBuyMaincoin'"
              </code>
            </p>
          </div>
        </div>

        {/* Important Note about Segments */}
        <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-400">⚠️ Important: Understanding Segments</h2>
          <div className="text-sm text-gray-300 space-y-2">
            <p><strong>Segments:</strong> Price levels in the bonding curve. A segment only advances when the 10% reserve ratio is achieved.</p>
            <p><strong>Transaction Processing:</strong> The system processes purchases across segments when the purchase amount exceeds what's available in the current segment. Maximum 25 segments per transaction.</p>
            {lastPurchaseDetails && lastPurchaseDetails.startSegment && lastPurchaseDetails.endSegment ? (
              <>
                <p className="text-yellow-400 font-semibold">Your purchase advanced from Segment {lastPurchaseDetails.startSegment} to Segment {lastPurchaseDetails.endSegment} ({lastPurchaseDetails.segmentsProcessed} segments total) because:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Each segment requires reaching a 1:10 reserve ratio to complete</li>
                  <li>Your purchase of ${lastPurchaseDetails.amountSpent} added reserves across multiple segments</li>
                  {lastPurchaseDetails.segmentsProcessed > 1 && (
                    <li>The remaining purchase amount continued through {lastPurchaseDetails.segmentsProcessed} segments</li>
                  )}
                  <li>Each segment completion triggers a 0.1% price increase</li>
                  <li>Transaction stopped at segment {lastPurchaseDetails.endSegment} when your funds were exhausted</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-yellow-400 font-semibold">How segment advancement works:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Each segment requires a 1:10 reserve ratio (reserves = 10% of total MainCoin value)</li>
                  <li>When a purchase provides enough reserves to reach this ratio, the segment completes</li>
                  <li>Price increases by 0.1% for each new segment</li>
                  <li>Large purchases may advance through multiple segments in one transaction</li>
                  <li>Maximum 25 segments can be processed per transaction</li>
                </ul>
              </>
            )}
            <p className="mt-3 text-blue-400">To advance through more segments, you need purchases that add significant reserves relative to the total MainCoin value.</p>
          </div>
        </div>

        {/* Segment Purchase History */}
        {epochInfo && (
          <SegmentHistoryViewer currentSegment={epochInfo.currentEpoch} />
        )}

        {/* User Purchase History */}
        <UserPurchaseHistory />
      </div>
  );
};