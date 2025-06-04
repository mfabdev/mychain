# Keplr Message Type Registration Fix

## Issue
When trying to buy MainCoin through Keplr wallet, received error:
```
Error: Unregistered type url: /mychain.maincoin.v1.MsgBuyMaincoin
```

## Root Cause
The custom message types for MainCoin transactions were not registered with the CosmJS signing client, which prevented Keplr from understanding how to encode these messages.

## Solution Applied

1. **Updated message format to match protobuf definition**:
   - Changed from `paymentAmount` string to `amount` Coin object
   - Fixed both buy and sell message structures

2. **Added Amino type registration in useKeplr hook**:
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

3. **Updated MainCoinPage message construction**:
   ```typescript
   const msg = {
     typeUrl: '/mychain.maincoin.v1.MsgBuyMaincoin',
     value: {
       buyer: address,
       amount: {
         denom: 'utestusd',
         amount: amountInMicro.toString(),
       },
     },
   };
   ```

## Key Changes

### Before:
- Message used incorrect field names (`payment_amount`, `sell_amount`)
- No Amino type registration
- Direct signing attempted without proper type definitions

### After:
- Message uses correct `amount` field as Coin object
- Amino types registered for custom messages
- Proper encoding/decoding functions defined

## Result
Keplr can now properly encode and sign MainCoin buy/sell transactions.

## Files Modified
- `/hooks/useKeplr.ts` - Added AminoTypes registration
- `/pages/MainCoinPage.tsx` - Fixed message format to use Coin objects