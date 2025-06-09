# Keplr Integration Guide for MainCoin

## The Problem
Custom Cosmos SDK modules (like MainCoin) need special configuration to work with Keplr.

## Solution: Register Custom Messages

### 1. Add Message Types to Registry
Create a file `web-dashboard/src/utils/maincoin-registry.ts`:

```typescript
import { Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';

// Define the message type
export interface MsgBuyMaincoin {
  buyer: string;
  amount: {
    denom: string;
    amount: string;
  };
}

// Create custom registry
export function createMaincoinRegistry(): Registry {
  const registry = new Registry(defaultRegistryTypes);
  
  // Register custom message types
  registry.register("/mychain.maincoin.v1.MsgBuyMaincoin", MsgBuyMaincoin);
  registry.register("/mychain.maincoin.v1.MsgSellMaincoin", MsgSellMaincoin);
  
  return registry;
}
```

### 2. Update Keplr Hook
In `hooks/useKeplr.ts`, add custom registry:

```typescript
import { createMaincoinRegistry } from '../utils/maincoin-registry';

// When creating signing client
const client = await SigningStargateClient.connectWithSigner(
  RPC_ENDPOINT,
  offlineSigner,
  {
    registry: createMaincoinRegistry(),
  }
);
```

### 3. Implement Keplr Transaction
In MainCoinPage.tsx:

```typescript
const handleBuyWithKeplr = async () => {
  if (!client || !address) {
    alert('Please connect Keplr wallet first');
    return;
  }

  const msg = {
    typeUrl: "/mychain.maincoin.v1.MsgBuyMaincoin",
    value: {
      buyer: address,
      amount: {
        denom: "utusd",
        amount: String(Math.floor(parseFloat(buyAmount) * 1000000))
      }
    }
  };

  try {
    const fee = {
      amount: [{ denom: "ulc", amount: "50000" }],
      gas: "200000"
    };

    const result = await client.signAndBroadcast(
      address,
      [msg],
      fee,
      "Buying MainCoin"
    );

    if (result.code === 0) {
      setTxStatus('✅ Transaction successful!');
      setTxHash(result.transactionHash);
    } else {
      setTxStatus(`❌ Transaction failed: ${result.rawLog}`);
    }
  } catch (error) {
    console.error('Transaction error:', error);
    setTxStatus(`❌ Error: ${error.message}`);
  }
};
```

### 4. Add Amino Support (Required for Ledger)
Create `web-dashboard/src/utils/amino-types.ts`:

```typescript
export function createAminoTypes() {
  return {
    "/mychain.maincoin.v1.MsgBuyMaincoin": {
      aminoType: "maincoin/BuyMaincoin",
      toAmino: ({ buyer, amount }) => ({
        buyer,
        amount
      }),
      fromAmino: ({ buyer, amount }) => ({
        buyer,
        amount
      })
    }
  };
}
```

## Why Direct Execution Exists

The "Direct Execution" mode exists because:
1. **Complex Setup**: Keplr integration requires protobuf definitions
2. **Development Speed**: Faster to test without wallet setup
3. **Demo Purposes**: Easier to showcase without wallet installation

## Security Comparison

### Direct Execution (Current)
- ❌ No user authentication
- ❌ Shared admin account
- ❌ Server holds private keys
- ✅ Easy to use
- ✅ No wallet setup

### Keplr Integration (Secure)
- ✅ User controls their keys
- ✅ Each user has own account  
- ✅ Explicit consent for each tx
- ✅ Production-ready
- ❌ Requires wallet setup
- ❌ More complex implementation

## Recommendation

1. **For Development**: Keep direct execution with added security:
   - Password protect the dashboard
   - Limit to localhost
   - Add rate limiting

2. **For Production**: Implement full Keplr integration:
   - Remove direct execution
   - Use proper message registration
   - Each user signs their own transactions

3. **Hybrid Approach**: 
   - Keep both modes
   - Clear warning on direct execution
   - Default to Keplr for production