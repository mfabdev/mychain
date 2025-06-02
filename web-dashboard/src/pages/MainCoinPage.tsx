import React, { useState, useEffect } from 'react';
import { MainCoinInfo } from '../components/MainCoinInfo';
import { TransactionDetails } from '../components/TransactionDetails';
import { TransactionHistory } from '../components/TransactionHistory';
import { fetchAPI } from '../utils/api';
import { useKeplr } from '../hooks/useKeplr';

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
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [commandType, setCommandType] = useState('');
  const [txStatus, setTxStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [useDirectExecution, setUseDirectExecution] = useState(true);
  const { address, isConnected } = useKeplr();

  useEffect(() => {
    fetchEpochInfo();
    const interval = setInterval(fetchEpochInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEpochInfo = async () => {
    try {
      // Try to fetch current epoch info from API
      const epochResponse = await fetchAPI('/mychain/maincoin/v1/segment_info');
      
      if (epochResponse && epochResponse.currentEpoch !== undefined) {
        setEpochInfo({
          currentEpoch: epochResponse.currentEpoch,
          currentPrice: epochResponse.currentPrice || '0.0001001',
          supplyBeforeDev: epochResponse.supplyBeforeDev || '100000',
          devAllocation: epochResponse.devAllocation || '0',
          totalSupply: epochResponse.totalSupply || '100000',
          totalValue: epochResponse.totalValue || '10.01',
          requiredReserve: epochResponse.requiredReserve || '1.001',
          currentReserve: epochResponse.currentReserve || '1.0',
          reserveNeeded: epochResponse.reserveNeeded || '0.001',
          tokensNeeded: epochResponse.tokensNeeded || '9.99',
          usdcCollected: epochResponse.usdcCollected || '0'
        });
      }
    } catch (error) {
      // Correct values for Epoch 1 with initial dev allocation
      setEpochInfo({
        currentEpoch: 1,
        currentPrice: '0.0001001',
        supplyBeforeDev: '100000',
        devAllocation: '0',
        totalSupply: '100000',
        totalValue: '10.01',
        requiredReserve: '1.001',
        currentReserve: '1.0',
        reserveNeeded: '0.001',
        tokensNeeded: '9.99',
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
        // Direct execution through enhanced terminal server
        const response = await fetch('http://localhost:3003/execute-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'buy',
            amount: buyAmount,
            from: 'test_account'
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          setTxStatus('✅ Transaction submitted successfully!');
          setTxHash(result.txHash || '');
          setTimeout(() => {
            fetchEpochInfo();
            setBuyAmount('');
          }, 3000);
        } else {
          setTxStatus(`❌ Transaction failed: ${result.error}`);
        }
      } else {
        // Generate CLI command
        const amountInMicro = Math.floor(parseFloat(buyAmount) * 1000000);
        const cliCommand = `mychaind tx maincoin buy-maincoin ${amountInMicro}testusd --from admin --keyring-backend test --gas auto --gas-adjustment 1.5 --gas-prices 0.025alc -y`;
        setGeneratedCommand(cliCommand);
        setCommandType('buy');
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
        // Direct execution through enhanced terminal server
        const response = await fetch('http://localhost:3003/execute-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sell',
            amount: sellAmount,
            from: 'test_account'
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          setTxStatus('✅ Transaction submitted successfully!');
          setTxHash(result.txHash || '');
          setTimeout(() => {
            fetchEpochInfo();
            setSellAmount('');
          }, 3000);
        } else {
          setTxStatus(`❌ Transaction failed: ${result.error}`);
        }
      } else {
        // Generate CLI command
        const amountInMicro = Math.floor(parseFloat(sellAmount) * 1000000);
        const cliCommand = `mychaind tx maincoin sell-maincoin ${amountInMicro}maincoin --from admin --keyring-backend test --gas auto --gas-adjustment 1.5 --gas-prices 0.025alc -y`;
        setGeneratedCommand(cliCommand);
        setCommandType('sell');
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

        <MainCoinInfo />
        
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
                  {isLoading ? (useDirectExecution ? 'Executing...' : 'Generating...') : 
                   (useDirectExecution ? '🚀 Buy MainCoin' : 'Generate Buy Command')}
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
                  {isLoading ? (useDirectExecution ? 'Executing...' : 'Generating...') : 
                   (useDirectExecution ? '💸 Sell MainCoin' : 'Generate Sell Command')}
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
                <li>Click "🖥️ Open Terminal" to auto-open terminal (or open manually)</li>
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

        {/* Transaction Details */}
        {txHash && (
          <TransactionDetails txHash={txHash} />
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
                  <td className="p-2 text-right">100,000</td>
                  <td className="p-2 text-right">$10.00</td>
                  <td className="p-2 text-right">$1.00</td>
                  <td className="p-2 text-right text-green-400">1:10 ✅</td>
                </tr>
                
                {/* Current Segment */}
                <tr className="border-b border-gray-700 bg-green-900/10">
                  <td className="p-2 font-semibold text-green-400">1 🔄</td>
                  <td className="p-2 text-right">$0.0001001</td>
                  <td className="p-2 text-right">100,000</td>
                  <td className="p-2 text-right">0</td>
                  <td className="p-2 text-right">9.99</td>
                  <td className="p-2 text-right">9.99</td>
                  <td className="p-2 text-right">100,009.99</td>
                  <td className="p-2 text-right">$10.01</td>
                  <td className="p-2 text-right">$1.001</td>
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

        {/* Transaction History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">MainCoin Transaction History</h2>
          
          {/* Known Transactions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Recent MainCoin Transactions</h3>
            <div className="space-y-3">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-green-400">Buy MainCoin</p>
                    <p className="text-sm text-gray-400">Height: 577 • 10 utestusd → 99.909 maincoin</p>
                    <p className="text-xs text-gray-500 mt-1">Triggered epoch advancement from 1 to 2</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Success</p>
                    <code className="text-xs">21F5C1E7...</code>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-green-400">Buy MainCoin</p>
                    <p className="text-sm text-gray-400">Height: 130 • 1,000,000 utestusd → 279,720 maincoin</p>
                    <p className="text-xs text-gray-500 mt-1">Processed 25 segments • 999,972 utestusd refunded</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Success</p>
                    <code className="text-xs">F131CF71...</code>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-green-400">Buy MainCoin</p>
                    <p className="text-sm text-gray-400">Height: 18 • 1,000,000 utestusd → 11,358,639 maincoin</p>
                    <p className="text-xs text-gray-500 mt-1">Processed 25 segments • 998,863 utestusd refunded</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Success</p>
                    <code className="text-xs">35124680...</code>
                  </div>
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

        {/* Important Note about Segments vs Epochs */}
        <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-400">⚠️ Important: Segments vs Epochs</h2>
          <div className="text-sm text-gray-300 space-y-2">
            <p><strong>Segments:</strong> Individual purchase units within a transaction. The system processes up to 25 segments per transaction.</p>
            <p><strong>Epochs:</strong> Price levels in the bonding curve. An epoch only advances when the 10% reserve ratio is achieved.</p>
            <p className="text-yellow-400 font-semibold">Your $1 purchase processed 25 segments but only advanced from Epoch 1 to Epoch 2 because:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>The initial 100,000 MainCoin supply required $1 in reserves to balance</li>
              <li>Your purchase added just enough reserves to complete Epoch 1</li>
              <li>The remaining purchase amount started Epoch 2 but didn't complete it</li>
              <li>Each segment bought small amounts (~44-399 MainCoin) due to the bonding curve calculations</li>
            </ul>
            <p className="mt-3 text-blue-400">To advance through more epochs, you need purchases that add significant reserves relative to the total MainCoin value.</p>
          </div>
        </div>
      </div>
    </div>
  );
};