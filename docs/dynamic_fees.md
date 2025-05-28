# Dynamic Transaction Fee Implementation

## Overview
Transaction fees in this blockchain are designed to be:
- **Base rate**: 0.5% of transaction value
- **Dynamic adjustment**: Increases when coin value decreases
- **Accepted tokens**: Both LiquidityCoin (LC) and MainCoin

## Implementation Strategy

### 1. AnteHandler Modification
The fee logic needs to be implemented in the AnteHandler decorator chain. Create a custom fee decorator that:

```go
// PercentageFeeDecorator ensures fees are at least 0.5% of transaction value
type PercentageFeeDecorator struct {
    ak AccountKeeper
    bk BankKeeper
    fk FeegrantKeeper
    pk PricingKeeper // Custom keeper to get current prices
}

func (pfd PercentageFeeDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
    feeTx, ok := tx.(sdk.FeeTx)
    if !ok {
        return ctx, errorsmod.Wrap(sdkerrors.ErrTxDecode, "Tx must be a FeeTx")
    }
    
    // Calculate total transaction value
    txValue := pfd.calculateTransactionValue(ctx, tx)
    
    // Get current price multiplier (increases as coin value decreases)
    priceMultiplier := pfd.pk.GetPriceMultiplier(ctx)
    
    // Calculate minimum fee: 0.5% * txValue * priceMultiplier
    minFee := txValue.Mul(sdk.NewDecFromIntWithPrec(5, 3)).Mul(priceMultiplier)
    
    // Verify provided fees meet minimum
    providedFees := feeTx.GetFee()
    if !pfd.meetsMinimumFee(ctx, providedFees, minFee) {
        return ctx, errorsmod.Wrapf(sdkerrors.ErrInsufficientFee, 
            "insufficient fees; got: %s, required: %s", providedFees, minFee)
    }
    
    return next(ctx, tx, simulate)
}
```

### 2. Price Oracle Integration
To adjust fees based on coin value:

1. **Price Reference**: Store reference prices in the DEX module
2. **Price Multiplier**: Calculate based on current vs reference price
   - If current price < reference price: multiplier = reference_price / current_price
   - If current price >= reference price: multiplier = 1.0

### 3. Configuration
- Minimum fee percentage: 0.5% (configurable in params)
- Accepted fee denoms: liquiditycoin, maincoin
- Price update frequency: Every N blocks or based on DEX trades

### 4. Integration Points
1. Update `app/ante.go` to include PercentageFeeDecorator
2. Add price tracking to DEX module
3. Create params for fee percentage and price thresholds
4. Update CLI to show estimated fees based on transaction value

## Current Status
- Basic minimum gas prices configured: 0.0001 LC/MainCoin
- This serves as absolute minimum to prevent spam
- Dynamic percentage-based fees need to be implemented as described above