import { getRestEndpoint, getRpcEndpoint } from '../utils/endpoints';
import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../utils/api';
import { SigningStargateClient } from '@cosmjs/stargate';

interface StakingManagerProps {
  address: string;
}

interface DelegationInfo {
  validator: string;
  amount: string;
  rewards: string;
}

export const StakingManager: React.FC<StakingManagerProps> = ({ address }) => {
  const [delegations, setDelegations] = useState<DelegationInfo[]>([]);
  const [validators, setValidators] = useState<any[]>([]);
  const [validatorsLoaded, setValidatorsLoaded] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [selectedValidator, setSelectedValidator] = useState<string>('');
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchStakingData();
    const interval = setInterval(fetchStakingData, 10000);
    return () => clearInterval(interval);
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStakingData = async () => {
    if (!address) return;

    try {
      // Fetch user balance
      const balanceRes = await fetchAPI(`/cosmos/bank/v1beta1/balances/${address}`);
      const alcBalance = balanceRes.balances?.find((b: any) => b.denom === 'ulc');
      setBalance(alcBalance?.amount || '0');

      // Fetch validators
      try {
        const validatorsRes = await fetchAPI('/cosmos/staking/v1beta1/validators');
        console.log('Validators response:', validatorsRes);
        if (validatorsRes && validatorsRes.validators && Array.isArray(validatorsRes.validators)) {
          console.log('Setting validators:', validatorsRes.validators);
          setValidators(validatorsRes.validators);
          setValidatorsLoaded(true);
        } else {
          console.log('No validators found in response');
          setValidators([]);
          setValidatorsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to fetch validators:', err);
        setValidators([]);
        setValidatorsLoaded(true);
      }

      // Fetch user delegations
      const delegationsRes = await fetchAPI(`/cosmos/staking/v1beta1/delegations/${address}`);
      const delegationData = await Promise.all(
        (delegationsRes.delegation_responses || []).map(async (del: any) => {
          // Get rewards for this delegation
          const rewardsRes = await fetchAPI(
            `/cosmos/distribution/v1beta1/delegators/${address}/rewards/${del.delegation.validator_address}`
          ).catch(() => ({ rewards: [] }));
          
          const alcReward = rewardsRes.rewards?.find((r: any) => r.denom === 'ulc');
          
          return {
            validator: del.delegation.validator_address,
            amount: del.balance.amount,
            rewards: alcReward?.amount || '0'
          };
        })
      );
      
      setDelegations(delegationData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching staking data:', error);
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!window.keplr || !selectedValidator || !stakeAmount) return;

    setTxLoading(true);
    setTxResult(null);

    try {
      // First, add the chain to Keplr if it doesn't exist
      try {
        await window.keplr.enable('mychain');
      } catch (error) {
        // Chain not found, add it
        await window.keplr.experimentalSuggestChain({
          chainId: 'mychain',
          chainName: 'MyChain',
          rpc: getRpcEndpoint(),
          rest: getRestEndpoint(),
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
              coinDenom: 'LC',
              coinMinimalDenom: 'ulc',
              coinDecimals: 6,
            },
          ],
          feeCurrencies: [
            {
              coinDenom: 'LC',
              coinMinimalDenom: 'ulc',
              coinDecimals: 6,
            },
          ],
          stakeCurrency: {
            coinDenom: 'LC',
            coinMinimalDenom: 'ulc',
            coinDecimals: 6,
          }
        });
        
        // Try enabling again after adding the chain
        await window.keplr.enable('mychain');
      }
      
      const offlineSigner = await window.keplr.getOfflineSignerOnlyAmino('mychain');
      const client = await SigningStargateClient.connectWithSigner(
        getRpcEndpoint(),
        offlineSigner
      );

      const amount = {
        denom: 'ulc',
        amount: (parseFloat(stakeAmount) * 1000000).toString()
      };

      const fee = {
        amount: [{ denom: 'ulc', amount: '50000' }],
        gas: '300000'
      };

      const result = await client.delegateTokens(
        address,
        selectedValidator,
        amount,
        fee,
        'Staking via MyChain Dashboard'
      );

      if (result.code === 0) {
        setTxResult({ success: true, message: 'Successfully staked tokens!' });
        setStakeAmount('');
        fetchStakingData();
      } else {
        setTxResult({ success: false, message: `Transaction failed: ${result.rawLog}` });
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Failed to stake tokens' });
    } finally {
      setTxLoading(false);
    }
  };

  const handleUnstake = async (validatorAddress: string) => {
    if (!window.keplr || !unstakeAmount) return;

    setTxLoading(true);
    setTxResult(null);

    try {
      // First, add the chain to Keplr if it doesn't exist
      try {
        await window.keplr.enable('mychain');
      } catch (error) {
        // Chain not found, add it
        await window.keplr.experimentalSuggestChain({
          chainId: 'mychain',
          chainName: 'MyChain',
          rpc: getRpcEndpoint(),
          rest: getRestEndpoint(),
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
              coinDenom: 'LC',
              coinMinimalDenom: 'ulc',
              coinDecimals: 6,
            },
          ],
          feeCurrencies: [
            {
              coinDenom: 'LC',
              coinMinimalDenom: 'ulc',
              coinDecimals: 6,
            },
          ],
          stakeCurrency: {
            coinDenom: 'LC',
            coinMinimalDenom: 'ulc',
            coinDecimals: 6,
          }
        });
        
        // Try enabling again after adding the chain
        await window.keplr.enable('mychain');
      }
      
      const offlineSigner = await window.keplr.getOfflineSignerOnlyAmino('mychain');
      const client = await SigningStargateClient.connectWithSigner(
        getRpcEndpoint(),
        offlineSigner
      );

      const amount = {
        denom: 'ulc',
        amount: (parseFloat(unstakeAmount) * 1000000).toString()
      };

      const fee = {
        amount: [{ denom: 'ulc', amount: '50000' }],
        gas: '300000'
      };

      const result = await client.undelegateTokens(
        address,
        validatorAddress,
        amount,
        fee,
        'Unstaking via MyChain Dashboard'
      );

      if (result.code === 0) {
        setTxResult({ 
          success: true, 
          message: 'Successfully initiated unstaking! Tokens will be available after 21 days unbonding period.' 
        });
        setUnstakeAmount('');
        fetchStakingData();
      } else {
        setTxResult({ success: false, message: `Transaction failed: ${result.rawLog}` });
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Failed to unstake tokens' });
    } finally {
      setTxLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!window.keplr || delegations.length === 0) return;

    setTxLoading(true);
    setTxResult(null);

    try {
      // First, add the chain to Keplr if it doesn't exist
      try {
        await window.keplr.enable('mychain');
      } catch (error) {
        // Chain not found, add it
        await window.keplr.experimentalSuggestChain({
          chainId: 'mychain',
          chainName: 'MyChain',
          rpc: getRpcEndpoint(),
          rest: getRestEndpoint(),
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
              coinDenom: 'LC',
              coinMinimalDenom: 'ulc',
              coinDecimals: 6,
            },
          ],
          feeCurrencies: [
            {
              coinDenom: 'LC',
              coinMinimalDenom: 'ulc',
              coinDecimals: 6,
            },
          ],
          stakeCurrency: {
            coinDenom: 'LC',
            coinMinimalDenom: 'ulc',
            coinDecimals: 6,
          }
        });
        
        // Try enabling again after adding the chain
        await window.keplr.enable('mychain');
      }
      
      const offlineSigner = await window.keplr.getOfflineSignerOnlyAmino('mychain');
      const client = await SigningStargateClient.connectWithSigner(
        getRpcEndpoint(),
        offlineSigner
      );

      const fee = {
        amount: [{ denom: 'ulc', amount: '50000' }],
        gas: '300000'
      };

      // Claim rewards from all validators
      const validatorAddresses = delegations
        .filter(del => parseFloat(del.rewards) > 0)
        .map(del => del.validator);

      if (validatorAddresses.length === 0) {
        setTxResult({ success: false, message: 'No rewards to claim' });
        return;
      }

      const msgs = validatorAddresses.map(validatorAddress => ({
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: {
          delegatorAddress: address,
          validatorAddress: validatorAddress
        }
      }));

      const result = await client.signAndBroadcast(
        address,
        msgs,
        fee,
        'Claiming staking rewards'
      );

      if (result.code === 0) {
        setTxResult({ success: true, message: 'Successfully claimed all rewards!' });
        fetchStakingData();
      } else {
        setTxResult({ success: false, message: `Transaction failed: ${result.rawLog}` });
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Failed to claim rewards' });
    } finally {
      setTxLoading(false);
    }
  };

  const formatAmount = (amount: string): string => {
    return (parseInt(amount) / 1000000).toFixed(6);
  };

  const getTotalStaked = (): string => {
    const total = delegations.reduce((sum, del) => sum + parseInt(del.amount), 0);
    return formatAmount(total.toString());
  };

  const getTotalRewards = (): string => {
    const total = delegations.reduce((sum, del) => sum + parseFloat(del.rewards), 0);
    return (total / 1000000).toFixed(6);
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Staking Manager</h2>
      
      {/* Notice about current staking situation */}
      {parseFloat(balance) === 0 && (
        <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 font-semibold mb-2">No LC Balance Available</p>
          <p className="text-sm text-yellow-300">
            Currently, most LC tokens (100,000) are in the genesis account. To stake:
          </p>
          <ol className="text-sm text-yellow-300 mt-2 ml-4 list-decimal">
            <li>Import the genesis account with the mnemonic/private key</li>
            <li>Or request a transfer from someone who has LC tokens</li>
            <li>Once you have LC, you can stake them here to earn 10% APR</li>
          </ol>
          <p className="text-xs text-gray-400 mt-2">
            Genesis account: cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4
          </p>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Available Balance</p>
          <p className="text-2xl font-bold">{formatAmount(balance)} LC</p>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <p className="text-sm text-purple-400 mb-1">Total Staked</p>
          <p className="text-2xl font-bold text-purple-300">{getTotalStaked()} LC</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-400 mb-1">Unclaimed Rewards</p>
          <p className="text-2xl font-bold text-green-300">{getTotalRewards()} LC</p>
          {parseFloat(getTotalRewards()) > 0 && (
            <button
              onClick={handleClaimRewards}
              disabled={txLoading}
              className="mt-2 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              Claim All
            </button>
          )}
        </div>
      </div>

      {/* Transaction Result */}
      {txResult && (
        <div className={`mb-4 p-3 rounded ${
          txResult.success 
            ? 'bg-green-900/30 border border-green-500/30 text-green-300' 
            : 'bg-red-900/30 border border-red-500/30 text-red-300'
        }`}>
          {txResult.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-4 bg-gray-700/30 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('stake')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'stake' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Stake LC
        </button>
        <button
          onClick={() => setActiveTab('unstake')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'unstake' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Unstake LC
        </button>
      </div>

      {/* Stake Tab */}
      {activeTab === 'stake' && (
        <div className="space-y-4">
          {/* Show validator status */}
          {validators.length === 0 && (
            <div className="text-yellow-400 text-sm mb-4 p-2 bg-yellow-900/20 rounded">
              No validators available. Make sure the blockchain is running and validators are active.
            </div>
          )}
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Select Validator</label>
            <select
              value={selectedValidator}
              onChange={(e) => setSelectedValidator(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Choose a validator...</option>
              {validators.map((val) => (
                <option key={val.operator_address} value={val.operator_address}>
                  {val.description?.moniker || 'Unknown'} - Commission: {(parseFloat(val.commission?.commission_rates?.rate || '0') * 100).toFixed(2)}%
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount to Stake</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="0.00"
                step="0.000001"
                min="0"
                max={formatAmount(balance)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => setStakeAmount(formatAmount(balance))}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Available: {formatAmount(balance)} LC
            </p>
          </div>

          <button
            onClick={handleStake}
            disabled={!selectedValidator || !stakeAmount || parseFloat(stakeAmount) <= 0 || txLoading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {txLoading ? 'Processing...' : 'Stake LC'}
          </button>
        </div>
      )}

      {/* Unstake Tab */}
      {activeTab === 'unstake' && (
        <div className="space-y-4">
          {delegations.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No active delegations</p>
          ) : (
            <>
              <div className="space-y-2">
                {delegations.map((del) => {
                  const validator = validators.find(v => v.operator_address === del.validator);
                  return (
                    <div key={del.validator} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{validator?.description?.moniker || 'Unknown Validator'}</p>
                          <p className="text-sm text-gray-400">Staked: {formatAmount(del.amount)} LC</p>
                          {parseFloat(del.rewards) > 0 && (
                            <p className="text-sm text-green-400">Rewards: {formatAmount(del.rewards)} LC</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount to Unstake</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                    max={getTotalStaked()}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => setUnstakeAmount(getTotalStaked())}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total staked: {getTotalStaked()} LC
                </p>
              </div>

              <button
                onClick={() => handleUnstake(delegations[0].validator)}
                disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || txLoading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
              >
                {txLoading ? 'Processing...' : 'Unstake LC'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Note: Unstaked tokens will be locked for 21 days before becoming available
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};