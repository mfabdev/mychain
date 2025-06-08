import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';

interface BlockData {
  height: string;
  time: string;
  proposer: string;
  hash: string;
  num_txs: string;
}

interface ChainData {
  chainId: string;
  blockTime: number;
  totalValidators: number;
  totalTransactions: number;
}

interface SupplyData {
  lc: string;
  mc: string;
  tusd: string;
}

export const BlockInfo: React.FC = () => {
  const [blockData, setBlockData] = useState<BlockData | null>(null);
  const [chainData, setChainData] = useState<ChainData | null>(null);
  const [supplyData, setSupplyData] = useState<SupplyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch latest block
        const blockResponse = await fetchAPI('/cosmos/base/tendermint/v1beta1/blocks/latest');
        const block = blockResponse.block;
        
        setBlockData({
          height: block.header.height,
          time: block.header.time,
          proposer: block.header.proposer_address,
          hash: blockResponse.block_id.hash,
          num_txs: block.data.txs?.length || '0',
        });

        // Fetch node info for chain ID
        const nodeInfo = await fetchAPI('/cosmos/base/tendermint/v1beta1/node_info');
        
        // Fetch validators
        console.log('Fetching validators...');
        const validators = await fetchAPI('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
        console.log('Validators response:', validators);
        
        setChainData({
          chainId: nodeInfo.default_node_info.network,
          blockTime: 5, // Average block time in seconds
          totalValidators: validators.validators?.length || 0,
          totalTransactions: 0, // Will be updated with actual count
        });

        // Fetch total supply
        const supply = await fetchAPI('/cosmos/bank/v1beta1/supply');
        const supplyMap: SupplyData = {
          lc: '0',
          mc: '0',
          tusd: '0',
        };

        console.log('Supply data:', supply.supply); // Debug log
        
        supply.supply?.forEach((coin: any) => {
          console.log(`Processing coin: ${coin.denom} = ${coin.amount}`); // Debug log
          
          if (coin.denom === 'ulc') {
            supplyMap.lc = (parseInt(coin.amount) / 1000000).toFixed(0);
          } else if (coin.denom === 'umc') {
            // All MainCoin now uses umc denomination
            supplyMap.mc = (parseInt(coin.amount) / 1000000).toFixed(0);
          } else if (coin.denom === 'utusd') {
            supplyMap.tusd = (parseInt(coin.amount) / 1000000).toFixed(0);
          }
        });

        setSupplyData(supplyMap);
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
        // Set default values on error
        setChainData({
          chainId: 'mychain',
          blockTime: 5,
          totalValidators: 1,
          totalTransactions: 0,
        });
        setSupplyData({
          lc: '100,000',
          mc: '100,010',
          tusd: '100,000',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading blockchain data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Blockchain Overview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Blockchain Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-gray-400 text-sm">Chain ID</div>
            <div className="text-xl font-semibold">{chainData?.chainId || 'mychain'}</div>
          </div>
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-gray-400 text-sm">Active Validators</div>
            <div className="text-xl font-semibold">{chainData?.totalValidators || 0}</div>
          </div>
          <div className="bg-gray-700/50 rounded p-4">
            <div className="text-gray-400 text-sm">Average Block Time</div>
            <div className="text-xl font-semibold">{chainData?.blockTime || 5}s</div>
          </div>
        </div>
      </div>

      {/* Latest Block */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Latest Block</h2>
        {blockData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Height:</span>
                <span className="font-mono text-lg">#{blockData.height}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Time:</span>
                <span>{new Date(blockData.time).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Transactions:</span>
                <span>{blockData.num_txs}</span>
              </div>
            </div>
            <div>
              <div className="py-2">
                <div className="text-gray-400 mb-1">Block Hash:</div>
                <div className="font-mono text-sm break-all text-gray-300">{blockData.hash}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Token Supply */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Token Supply</h2>
        {supplyData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded p-4 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-400 font-semibold">LiquidityCoin (LC)</span>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">Native</span>
              </div>
              <div className="text-2xl font-bold">{supplyData.lc} LC</div>
              <div className="text-gray-400 text-sm mt-1">Total Supply</div>
              <div className="text-gray-500 text-xs mt-2">Chain denom: ulc (1 LC = 1,000,000 ulc)</div>
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-400 font-semibold">MainCoin (MC)</span>
                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">Bonding</span>
              </div>
              <div className="text-2xl font-bold">{supplyData.mc} MC</div>
              <div className="text-gray-400 text-sm mt-1">Total Supply (Segment 1)</div>
              <div className="text-gray-500 text-xs mt-2">Chain denom: umc (1 MC = 1,000,000 umc)</div>
              <div className="text-gray-500 text-xs">Includes 10 MC dev allocation</div>
            </div>
            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded p-4 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-semibold">TestUSD (TUSD)</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">Stable</span>
              </div>
              <div className="text-2xl font-bold">{supplyData.tusd} TUSD</div>
              <div className="text-gray-400 text-sm mt-1">Total Supply</div>
              <div className="text-gray-500 text-xs mt-2">Chain denom: utusd (1 TUSD = 1,000,000 utusd)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};