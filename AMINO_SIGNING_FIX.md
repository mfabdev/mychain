# Amino Signing Fix for Custom Message Types

## Issue
Error: "Unregistered type url: /mychain.maincoin.v1.MsgBuyMaincoin" when trying to sign transactions with Keplr.

## Root Cause
CosmJS was attempting to use Direct (protobuf) signing, which requires registered protobuf type definitions that we don't have for our custom messages.

## Solution
Force Keplr to use Amino-only signing by calling `getOfflineSignerOnlyAmino()` instead of `getOfflineSigner()`.

## Changes Made

1. **Updated useKeplr hook**:
   ```typescript
   // Force Amino-only signing to avoid protobuf registration issues
   const offlineSigner = wallet.getOfflineSignerOnlyAmino(CHAIN_INFO.chainId);
   ```

2. **Registered Amino types**:
   ```typescript
   const aminoTypes = new AminoTypes({
     '/mychain.maincoin.v1.MsgBuyMaincoin': {
       aminoType: 'mychain/MsgBuyMaincoin',
       toAmino: (msg: any) => ({
         buyer: msg.buyer,
         amount: msg.amount,
       }),
       fromAmino: (msg: any) => ({
         buyer: msg.buyer,
         amount: msg.amount,
       }),
     },
     // Similar for sell message
   });
   ```

## Benefits
- No need for protobuf type generation
- Simpler implementation
- Works with Keplr's legacy signing mode
- Compatible with custom message types

## Note
This approach uses Amino JSON encoding instead of protobuf binary encoding. While slightly less efficient, it's more compatible with custom chains that don't have generated protobuf types available in the frontend.