# CLI Fallback Solution for Custom Message Types

## Issue
The web dashboard cannot send custom MainCoin transactions through Keplr due to the "Unregistered type url" error. This occurs because:
1. CosmJS requires protobuf type definitions to be registered
2. We don't have generated TypeScript types from the protobuf files
3. Even Amino-only signing still requires type registration in the current CosmJS version

## Solution
Generate CLI commands for users to execute manually. This provides a working solution while proper protobuf type generation can be implemented later.

## What the Dashboard Now Does

1. **When user clicks "Buy MainCoin"**:
   - Validates the input amount
   - Generates the appropriate CLI command
   - Shows the command in a copyable text area
   - Provides instructions for execution

2. **Generated Command Format**:
   ```bash
   mychaind tx maincoin buy-maincoin [amount]utestusd --from [address] --chain-id mychain --fees 50000alc
   ```

3. **User Experience**:
   - User enters amount in the web interface
   - Clicks buy/sell button
   - Gets a pre-formatted command with their wallet address
   - Can copy and paste into terminal
   - Transaction executes successfully

## Benefits
- Works immediately without complex protobuf setup
- Users can still interact with MainCoin
- No security risks (users sign in their own terminal)
- Provides transparency about what's being executed

## Future Improvements
To enable direct web transactions, you would need to:

1. **Generate TypeScript types from protobuf**:
   ```bash
   # Install required tools
   npm install -g protoc-gen-ts
   
   # Generate types
   protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto \
          --ts_proto_out=./src/types \
          --ts_proto_opt=esModuleInterop=true \
          ./proto/mychain/maincoin/v1/tx.proto
   ```

2. **Register the generated types with CosmJS**:
   ```typescript
   import { MsgBuyMaincoin } from './types/mychain/maincoin/v1/tx';
   
   const registry = new Registry();
   registry.register('/mychain.maincoin.v1.MsgBuyMaincoin', MsgBuyMaincoin);
   ```

3. **Use the registry in the signing client**:
   ```typescript
   const client = await SigningStargateClient.connectWithSigner(
     rpc,
     signer,
     { registry }
   );
   ```

## Current Status
- ✅ Dashboard displays MainCoin information correctly
- ✅ Wallet connection works properly
- ✅ CLI command generation provides a working transaction method
- ⏳ Direct web transactions pending protobuf type generation