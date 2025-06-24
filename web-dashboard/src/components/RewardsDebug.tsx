import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';

export const RewardsDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({
    status: 'Loading...',
    validators: null,
    rewards: null,
    supply: null
  });

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        setDebugInfo((prev: any) => ({ ...prev, status: 'Fetching validators...' }));
        // Get validator
        const validators = await fetchAPI('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED');
        setDebugInfo((prev: any) => ({ ...prev, validators }));
        const validator = validators.validators?.[0];
        
        if (validator) {
          const validatorOp = validator.operator_address;
          // Use the correct delegator address
          const delegatorAddr = 'cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0';
          
          setDebugInfo((prev: any) => ({ ...prev, status: 'Fetching rewards...' }));
          // Get rewards - try direct fetch to bypass any API issues
          let rewards: any;
          try {
            rewards = await fetchAPI(`/cosmos/distribution/v1beta1/delegators/${delegatorAddr}/rewards`);
          } catch (err) {
            console.log('fetchAPI failed, trying direct fetch...');
            // Try direct fetch as fallback
            const response = await fetch(`http://localhost:1317/cosmos/distribution/v1beta1/delegators/${delegatorAddr}/rewards`);
            rewards = await response.json();
          }
          setDebugInfo((prev: any) => ({ ...prev, rewards }));
          
          // Get supply
          const supply = await fetchAPI('/cosmos/bank/v1beta1/supply');
          const lcSupply = supply.supply?.find((s: any) => s.denom === 'ulc');
          
          // Calculate unclaimed from rewards
          let unclaimedLC = 0;
          if (rewards.total && Array.isArray(rewards.total)) {
            const ulcTotal = rewards.total.find((t: any) => t.denom === 'ulc');
            if (ulcTotal && ulcTotal.amount) {
              unclaimedLC = parseFloat(ulcTotal.amount) / 1000000;
            }
          }
          
          setDebugInfo({
            status: 'Success',
            validatorOp,
            delegatorAddr,
            validators,
            rewards,
            supply: lcSupply,
            totalSupply: lcSupply?.amount,
            totalSupplyLC: parseInt(lcSupply?.amount || '0') / 1000000,
            mintedLC: (parseInt(lcSupply?.amount || '0') / 1000000) - 100000,
            unclaimedLC,
            unclaimedMicroLC: rewards.total?.find((t: any) => t.denom === 'ulc')?.amount || '0'
          });
        } else {
          setDebugInfo((prev: any) => ({ ...prev, status: 'No validators found' }));
        }
      } catch (error) {
        console.error('Debug fetch error:', error);
        setDebugInfo((prev: any) => ({ 
          ...prev, 
          status: 'Error',
          error: error instanceof Error ? error.message : String(error)
        }));
      }
    };

    fetchDebugData();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-4">
      <h3 className="text-lg font-bold mb-4">Rewards Debug Info</h3>
      <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-xs">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};