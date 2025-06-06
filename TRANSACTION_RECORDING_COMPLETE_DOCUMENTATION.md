# Transaction Recording System - Complete Documentation

## Overview

This document describes the comprehensive transaction recording system implemented in the MyChain blockchain. The system records all types of transactions across various modules and provides a unified transaction history API.

## Architecture

### Core Components

1. **Transaction Recorder** (`x/mychain/keeper/transaction_recorder.go`)
   - Central component that provides methods for recording different types of transactions
   - Implements the `TransactionKeeper` interface used by other modules
   - Supports various transaction types with specialized recording methods

2. **Transaction History Storage** (`x/mychain/keeper/transaction_history.go`)
   - Handles persistence of transaction records in the KVStore
   - Stores transactions with key format: `tx-history/{address}/{height}/{txhash}`
   - Provides retrieval methods with filtering and pagination

3. **Transaction Decorator** (`app/decorators/transaction_recorder_decorator.go`)
   - Ante handler decorator that records bank transfers and staking transactions
   - Runs after transaction execution to ensure only successful transactions are recorded
   - Handles standard Cosmos SDK message types

4. **Module Integration**
   - Each module (MainCoin, DEX, TestUSD) has transaction recording integrated
   - Modules use the `TransactionKeeper` interface to record their specific transactions

## Transaction Types

The system supports the following transaction types:

### Core Transaction Types
- `send` - Bank send transactions
- `receive` - Bank receive transactions  
- `delegate` - Staking delegations
- `undelegate` - Staking undelegations
- `redelegate` - Staking redelegations
- `staking_reward` - Staking reward claims

### MainCoin Module
- `buy_maincoin` - MainCoin purchases through bonding curve
- `sell_maincoin` - MainCoin sales through bonding curve

### DEX Module
- `dex_create_order` - Creating limit orders on DEX
- `dex_cancel_order` - Cancelling existing orders
- `dex_order_filled` - Order match/fill events
- `dex_claim_rewards` - Claiming liquidity rewards

### TestUSD Module
- `bridge_in` - Bridging USDC into TestUSD
- `bridge_out` - Bridging TestUSD out to USDC

## Implementation Details

### Transaction Record Structure

```go
type TransactionHistory struct {
    TxHash      string    // Transaction hash
    Type        string    // Transaction type
    Description string    // Human-readable description
    Amount      sdk.Coins // Amount transferred
    From        string    // Source address
    To          string    // Destination address
    Height      int64     // Block height
    Timestamp   string    // ISO 8601 timestamp
}
```

### Module Wiring

Transaction recording is wired in `app/app.go`:

```go
// Set transaction keeper for all modules
app.MaincoinKeeper.SetTransactionKeeper(&app.MychainKeeper)
app.DexKeeper.SetTransactionKeeper(&app.MychainKeeper)
app.TestusdKeeper.SetTransactionKeeper(&app.MychainKeeper)
```

### Ante Handler Setup

The transaction recorder decorator is integrated via custom ante handler:

```go
anteHandler, err := NewAnteHandler(
    HandlerOptions{
        HandlerOptions: ante.HandlerOptions{
            AccountKeeper:   app.AuthKeeper,
            BankKeeper:      app.BankKeeper,
            SignModeHandler: app.txConfig.SignModeHandler(),
            // ... other options
        },
        MychainKeeper: &app.MychainKeeper,
    },
)
app.SetAnteHandler(anteHandler)
```

## API Endpoints

### REST API

**Get Transaction History**
```
GET /mychain/mychain/v1/transaction-history/{address}?limit={limit}
```

Parameters:
- `address` - The account address to query transactions for
- `limit` - Maximum number of transactions to return (default: 50, max: 100)

Response:
```json
{
  "transactions": [
    {
      "tx_hash": "0A6D0A6B...",
      "type": "buy_maincoin",
      "description": "Bought 277945971 MainCoin for 30987 utestusd",
      "amount": [{"denom": "maincoin", "amount": "277945971"}],
      "from": "cosmos1sn9wjkv38jglqsvtwfk3ae9kzcpkp6vd0j5ptl",
      "to": "maincoin_reserve",
      "height": "2295",
      "timestamp": "2025-06-06T22:20:25Z"
    }
  ]
}
```

## Usage Examples

### Recording a MainCoin Purchase

```go
if tk := ms.GetTransactionKeeper(); tk != nil {
    metadata := fmt.Sprintf(`{"spent":"%s","received":"%s","segments":%d}`, 
        result.TotalCost.String(), 
        result.TotalUserTokens.String(), 
        result.SegmentsProcessed)
    
    err := tk.RecordTransaction(
        ctx,
        msg.Buyer,
        "buy_maincoin",
        fmt.Sprintf("Bought %s MainCoin for %s utestusd", 
            result.TotalUserTokens.String(), 
            result.TotalCost.String()),
        sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, result.TotalUserTokens)),
        msg.Buyer,
        "maincoin_reserve",
        metadata,
    )
}
```

### Recording a DEX Order

```go
if tk := k.GetTransactionKeeper(); tk != nil {
    orderType := "buy"
    if !msg.IsBuy {
        orderType = "sell"
    }
    
    description := fmt.Sprintf("Created %s order for %s at %s", 
        orderType, msg.Amount.String(), msg.Price.String())
    metadata := fmt.Sprintf(`{"order_id":%d,"pair_id":%d,"is_buy":%t,"price":"%s"}`, 
        orderID, msg.PairId, msg.IsBuy, msg.Price.String())
    
    tk.RecordTransaction(ctx, msg.Maker, "dex_create_order", 
        description, sdk.NewCoins(msg.Amount), 
        msg.Maker, "dex_orderbook", metadata)
}
```

### Recording a Bridge Transaction

```go
if tk := k.GetTransactionKeeper(); tk != nil {
    description := fmt.Sprintf("Bridged in %s, received %s", 
        usdcCoin.String(), testUsdCoin.String())
    metadata := fmt.Sprintf(`{"usdc_amount":"%s","testusd_amount":"%s","peg_ratio":"%s"}`, 
        usdcCoin.String(), testUsdCoin.String(), pegRatio.String())
    
    tk.RecordTransaction(ctx, msg.Sender, "bridge_in", 
        description, sdk.NewCoins(testUsdCoin), 
        "external_bridge", msg.Sender, metadata)
}
```

## Web Dashboard Integration

The transaction history is displayed in the web dashboard at:
- **User Dashboard** - Shows recent transactions for connected wallet
- **Transactions Page** - Full transaction history with search and filtering

### Transaction History Component

The `TransactionHistory` React component provides:
- Real-time transaction updates
- Type-based filtering
- Transaction type icons and color coding
- Formatted amounts and timestamps
- Address shortening for readability

## Testing

### Manual Testing Steps

1. **Test MainCoin Transactions**
   ```bash
   mychaind tx maincoin buy-maincoin 1000000utestusd --from validator \
     --gas 500000 --gas-prices 0.025ALC --keyring-backend test --chain-id mychain -y
   ```

2. **Test Bank Transfers**
   ```bash
   mychaind tx bank send validator cosmos14mgdq2mkdvdg7kuv783gjey6q96lj9gycwyrny 1000000ALC \
     --from validator --gas 100000 --gas-prices 0.025ALC --keyring-backend test --chain-id mychain -y
   ```

3. **Test Staking Transactions**
   ```bash
   mychaind tx staking delegate cosmosvaloper1sn9wjkv38jglqsvtwfk3ae9kzcpkp6vd2xq58v 10000000ALC \
     --from validator --gas 200000 --gas-prices 0.025ALC --keyring-backend test --chain-id mychain -y
   ```

4. **Test DEX Orders**
   ```bash
   mychaind tx dex create-order 1 buy 1000000maincoin 100utestusd \
     --from validator --gas 150000 --gas-prices 0.025ALC --keyring-backend test --chain-id mychain -y
   ```

5. **Test Bridge Operations**
   ```bash
   mychaind tx testusd bridge-in 1000000uusdc \
     --from validator --gas 100000 --gas-prices 0.025ALC --keyring-backend test --chain-id mychain -y
   ```

### Verification

After executing transactions, verify recording:

```bash
# Check transaction history via REST API
curl http://localhost:1317/mychain/mychain/v1/transaction-history/{address}?limit=10

# Check via web dashboard
http://localhost:3000/transactions
```

## Known Issues and Limitations

1. **Ante Handler Gas Consumption**: The transaction recording decorator may consume gas during simulation, which can cause "out of gas" errors. This needs to be addressed by checking for simulation mode.

2. **Address Filtering**: Currently, the transaction history query correctly filters by address, ensuring privacy and proper data isolation.

3. **AuthZ Support**: Nested message handling in AuthZ transactions is not yet implemented.

4. **Event-based Recording**: Some transaction types still emit events but don't directly record to the transaction history. These need to be migrated to direct recording.

## Future Enhancements

1. **Advanced Querying**
   - Filter by transaction type
   - Date range queries
   - Full-text search in descriptions

2. **Analytics**
   - Transaction volume statistics
   - User activity metrics
   - Gas usage analytics

3. **Export Features**
   - CSV/JSON export
   - Tax reporting formats
   - Integration with portfolio trackers

4. **Performance Optimization**
   - Indexed queries for faster retrieval
   - Caching layer for frequently accessed data
   - Pagination improvements

## Security Considerations

1. **Privacy**: Transaction history is public but filtered by address to prevent unauthorized access to user data
2. **Data Integrity**: Transactions are only recorded after successful execution
3. **Gas Limits**: Proper gas estimation needed to prevent transaction failures
4. **Input Validation**: All transaction data is validated before recording

## Maintenance

### Adding New Transaction Types

1. Add constant to `transaction_recorder.go`:
   ```go
   const TxTypeNewType = "new_type"
   ```

2. Create recording method if needed:
   ```go
   func (tr *TransactionRecorder) RecordNewType(...) error {
       // Implementation
   }
   ```

3. Integrate in relevant module's message handler
4. Update web dashboard to handle new type

### Debugging

Enable debug logging to trace transaction recording:
```bash
mychaind start --log_level debug
```

Check for errors in logs:
```bash
grep "failed to record transaction" ~/.mychain/mychain.log
```

## Conclusion

The transaction recording system provides a comprehensive audit trail for all blockchain activities. It integrates seamlessly with existing modules while maintaining extensibility for future transaction types. The system enhances user experience by providing detailed transaction history through both REST API and web dashboard interfaces.