import React, { useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';

interface QuickStakeProps {
  address: string;
  balance: string;
}

export const QuickStake: React.FC<QuickStakeProps> = ({ address, balance }) => {
  const [amount, setAmount] = useState('90000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Hardcode the validator address since there's only one
  const VALIDATOR_ADDRESS = 'cosmosvaloper19rl4cm2hmr8afy4kldpxz3fka4jguq0ae5egnx';

  const handleStake = async () => {
    if (!window.keplr || !amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    setResult(null);

    try {
      // First, add the chain to Keplr if it doesn't exist
      try {
        await window.keplr.enable('mychain');
      } catch (error) {
        // Chain not found, add it
        await window.keplr.experimentalSuggestChain({
          chainId: 'mychain',
          chainName: 'MyChain',
          rpc: 'http://localhost:26657',
          rest: 'http://localhost:1317',
          bip44: {
            coinType: 118,
          },
          bech32Config: {
            bech32PrefixAccAddr: 'cosmos',
            bech32PrefixAccPub: 'cosmospub',
            bech32PrefixValAddr: 'cosmosvaloper',
            bech32PrefixValPub: 'cosmosvaloperpub',
            bech32PrefixConsAddr: 'cosmosvalcons',
            bech32PrefixConsPub: 'cosmosvalconspub',
          },
          currencies: [
            {
              coinDenom: 'ALC',
              coinMinimalDenom: 'alc',
              coinDecimals: 6,
              coinGeckoId: 'cosmos',
            },
          ],
          feeCurrencies: [
            {
              coinDenom: 'ALC',
              coinMinimalDenom: 'alc',
              coinDecimals: 6,
              coinGeckoId: 'cosmos',
            },
          ],
          stakeCurrency: {
            coinDenom: 'ALC',
            coinMinimalDenom: 'alc',
            coinDecimals: 6,
            coinGeckoId: 'cosmos',
          },
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.04,
          },
        });
        
        // Try enabling again after adding the chain
        await window.keplr.enable('mychain');
      }
      
      const offlineSigner = await window.keplr.getOfflineSignerAuto('mychain');
      const client = await SigningStargateClient.connectWithSigner(
        'http://localhost:26657',
        offlineSigner
      );

      const stakeAmount = {
        denom: 'alc',
        amount: (parseFloat(amount) * 1000000).toString()
      };

      const fee = {
        amount: [{ denom: 'alc', amount: '5000' }],
        gas: '200000'
      };

      const result = await client.delegateTokens(
        address,
        VALIDATOR_ADDRESS,
        stakeAmount,
        fee,
        'Staking via MyChain Dashboard'
      );

      if (result.code === 0) {
        setResult({ 
          success: true, 
          message: `Successfully staked ${amount} ALC! You'll start earning ~${(parseFloat(amount) * 0.1 / 365).toFixed(2)} ALC per day.` 
        });
        setAmount('');
      } else {
        setResult({ success: false, message: `Transaction failed: ${result.rawLog}` });
      }
    } catch (error: any) {
      console.error('Staking error:', error);
      setResult({ success: false, message: error.message || 'Failed to stake tokens' });
    } finally {
      setLoading(false);
    }
  };

  const balanceInALC = (parseInt(balance) / 1000000).toFixed(2);

  return (
    <div className="bg-gradient-to-r from-purple-800 to-purple-600 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        🚀 Quick Stake to Start Earning Rewards
      </h2>
      
      <div className="bg-black/20 rounded-lg p-4 mb-4">
        <p className="text-lg mb-2">
          You have <span className="font-bold text-2xl">{balanceInALC} ALC</span> available
        </p>
        <p className="text-sm opacity-90">
          Stake your ALC with the "test" validator to earn 10% APR
        </p>
      </div>

      {result && (
        <div className={`mb-4 p-3 rounded ${
          result.success 
            ? 'bg-green-500/30 border border-green-400 text-green-100' 
            : 'bg-red-500/30 border border-red-400 text-red-100'
        }`}>
          {result.message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Amount to Stake (ALC)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              disabled={loading}
            />
            <button
              onClick={() => setAmount('90000')}
              className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors"
              disabled={loading}
            >
              90,000
            </button>
            <button
              onClick={() => setAmount(balanceInALC)}
              className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors"
              disabled={loading}
            >
              MAX
            </button>
          </div>
          <p className="text-xs mt-1 opacity-80">
            Recommended: 90,000 ALC (keeping 10,000 for transactions)
          </p>
        </div>

        <button
          onClick={handleStake}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full py-4 bg-white text-purple-700 hover:bg-gray-100 disabled:bg-gray-500 disabled:text-gray-300 rounded-lg font-bold text-lg transition-colors disabled:cursor-not-allowed"
        >
          {loading ? 'Processing Transaction...' : `Stake ${amount || '0'} ALC Now`}
        </button>

        <div className="text-sm opacity-90 space-y-1">
          <p>✓ Validator: test (cosmosvaloper15se...gry88t)</p>
          <p>✓ Commission: 10%</p>
          <p>✓ Your effective APR: 9%</p>
          <p>✓ Unbonding period: 21 days</p>
        </div>
      </div>
    </div>
  );
};