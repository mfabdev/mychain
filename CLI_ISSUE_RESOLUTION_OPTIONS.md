# CLI Issue Resolution Options

## Root Cause Analysis

The issue occurs when autocli tries to parse `cosmos.base.v1beta1.Coin` types from positional arguments. The error:
```
panic: proto: cosmos.base.v1beta1.Coin.denom: field descriptor does not belong to this message
```

This happens because:
1. Autocli expects positional arguments to be simple types
2. `Coin` is a complex type with `denom` and `amount` fields
3. The parser fails when trying to construct the Coin from a string like "100utusd"

## Resolution Options

### Option 1: Use Flags Instead of Positional Arguments (Recommended)
**Approach**: Modify the CLI to use flags for price and amount
```bash
mychaind tx dex create-order 1 --price 100utusd --amount 10000000umc --buy --from admin
```

**Pros**:
- Works with autocli's flag parsing which handles Coins correctly
- Clear and explicit parameter names
- Standard Cosmos SDK pattern

**Cons**:
- Slightly longer commands

**Implementation**:
1. Update autocli configuration to use flags
2. Modify the proto comments to indicate flag usage

### Option 2: Change Proto to Use Simple Types
**Approach**: Modify the proto definition to use separate fields
```proto
message MsgCreateOrder {
  uint64 pair_id = 2;
  string price_amount = 3;  // Amount as string
  string price_denom = 4;   // Denom as string
  string amount_amount = 5; // Amount as string
  string amount_denom = 6;  // Denom as string
  bool is_buy = 7;
}
```

**Pros**:
- Works with positional arguments
- Simple parsing

**Cons**:
- Breaking change to proto
- Less idiomatic than using Coin type
- Requires migration

### Option 3: Custom CLI Command with String Parsing
**Approach**: Enhance the custom CLI to parse coin strings
```go
// Parse "100utusd" into Coin
func ParseCoinString(s string) (sdk.Coin, error) {
    // Custom parsing logic
}
```

**Pros**:
- No proto changes needed
- Maintains current command format

**Cons**:
- Need to fully disable autocli for these commands
- More complex parsing logic

### Option 4: Direct Transaction Construction
**Approach**: Build transactions programmatically without CLI
- Use gRPC/REST API directly
- Construct transaction in code
- Sign and broadcast

**Pros**:
- Bypasses CLI entirely
- Full control over transaction

**Cons**:
- More complex for users
- Requires coding knowledge

### Option 5: Wrapper Script
**Approach**: Create a wrapper script that constructs the proper transaction
```bash
#!/bin/bash
# dex-order.sh
mychaind tx dex create-order \
  --pair-id=$1 \
  --price="{\"denom\":\"$3\",\"amount\":\"$2\"}" \
  --amount="{\"denom\":\"$5\",\"amount\":\"$4\"}" \
  --is-buy=$6 \
  --from=$7
```

**Pros**:
- Quick workaround
- No code changes

**Cons**:
- Additional script to maintain
- Not integrated

## Recommended Solution: Option 1 (Use Flags)

This is the most Cosmos SDK-idiomatic approach and requires minimal changes:

1. Update `x/dex/module/autocli.go` to use flags
2. The command would become:
   ```bash
   mychaind tx dex create-order 1 \
     --price 100utusd \
     --amount 10000000umc \
     --is-buy \
     --from admin \
     --fees 50000ulc \
     --yes
   ```

This approach:
- Works with existing Cosmos SDK patterns
- Is properly supported by autocli
- Maintains type safety
- Is clear and explicit

## Implementation Steps for Option 1

1. Update autocli configuration to use `Flag` instead of `PositionalArgs`
2. Test the new command format
3. Update documentation and examples
4. Update the web dashboard to generate the new format
5. Update terminal server to use the new format