import React, { useState, useEffect } from 'react';
import { StakingManager } from '../components/StakingManager';
import { QuickStake } from '../components/QuickStake';
import { StakingRewardsHistory } from '../components/StakingRewardsHistory';
import { SDKMintingDisplay } from '../components/SDKMintingDisplay';
import { useKeplr } from '../hooks/useKeplr';
import { fetchAPI } from '../utils/api';

export const StakingPage: React.FC = () => {
  const { address, isConnected } = useKeplr();
  const [userBalance, setUserBalance] = useState<string>('0');

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (isConnected && address) {
        try {
          const balanceRes = await fetchAPI(`/cosmos/bank/v1beta1/balances/${address}`);
          const alcBalance = balanceRes.balances?.find((b: any) => b.denom === 'ulc');
          setUserBalance(alcBalance?.amount || '0');
        } catch (err) {
          console.error('Error fetching user balance:', err);
        }
      }
    };

    fetchUserBalance();
  }, [isConnected, address]);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Staking</h1>
        <span className="text-sm text-gray-400">SDK Minting with Dynamic Inflation</span>
      </div>
      
      <div className="grid gap-6">
        {/* SDK Minting Display - Always show */}
        <SDKMintingDisplay />

        {/* Connection Notice */}
        {!isConnected && (
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 text-center">
            <p className="text-yellow-400 font-semibold mb-2">Wallet Not Connected</p>
            <p className="text-gray-300">Connect your Keplr wallet to access staking features.</p>
          </div>
        )}

        {/* Quick Stake Interface - Only show when connected */}
        {isConnected && address && (
          <QuickStake address={address} balance={userBalance} />
        )}
        
        {/* Staking Manager - Only show when connected */}
        {isConnected && address && (
          <StakingManager address={address} />
        )}
        
        {/* Staking Rewards History */}
        <StakingRewardsHistory />

        {/* Validator Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Validator Information</h2>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Active Validator</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-400">Moniker:</span> mychain-node</p>
                  <p><span className="text-gray-400">Commission:</span> 10%</p>
                  <p><span className="text-gray-400">Status:</span> <span className="text-green-400">Active</span></p>
                  <p><span className="text-gray-400">Uptime:</span> 100%</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Delegation Stats</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-400">Total Delegated:</span> 90,000 LC</p>
                  <p><span className="text-gray-400">Self Delegation:</span> 90,000 LC</p>
                  <p><span className="text-gray-400">Voting Power:</span> 100%</p>
                  <p><span className="text-gray-400">Rewards Rate:</span> SDK Minting</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Staking Guide */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Staking Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-400">How to Stake</h3>
              <ol className="text-sm text-gray-300 space-y-1">
                <li>1. Connect your Keplr wallet</li>
                <li>2. Choose amount to stake</li>
                <li>3. Validator is automatically selected (mychain-node)</li>
                <li>4. Confirm transaction</li>
                <li>5. Start earning rewards!</li>
              </ol>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-400">Staking Benefits</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Earn SDK minting rewards (7-100% inflation)</li>
                <li>• Help secure the network</li>
                <li>• Participate in governance</li>
                <li>• Rewards distributed each block</li>
                <li>• No slashing on testnet</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Unbonding Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Unbonding Information</h2>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-yellow-400">Unbonding Period</h3>
                <p className="text-sm text-gray-300">21 days (1,814,400 seconds)</p>
              </div>
              <div>
                <h3 className="font-semibold text-orange-400">Important Notes</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Tokens are locked during unbonding period</li>
                  <li>• No rewards earned during unbonding</li>
                  <li>• Can have up to 7 unbonding entries</li>
                  <li>• Tokens automatically return after period ends</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};