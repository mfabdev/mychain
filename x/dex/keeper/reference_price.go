package keeper

import (
	"context"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// GetReferencePrice returns the reference price for a trading pair
// Reference = MAX(latest segment price, 24-hour low)
func (k Keeper) GetReferencePrice(ctx context.Context, pairID uint64) math.LegacyDec {
	// Get latest segment price (for MC/TUSD pair)
	segmentPrice := k.GetLatestSegmentPrice(ctx)
	
	// Get 24-hour low from price references
	priceRef, err := k.PriceReferences.Get(ctx, pairID)
	if err != nil {
		// If no price reference exists, use segment price
		return segmentPrice
	}
	
	// Return the higher of segment price or 24h low
	if segmentPrice.GT(priceRef.ReferencePrice) {
		return segmentPrice
	}
	return priceRef.ReferencePrice
}

// GetLatestSegmentPrice returns the latest segment price
func (k Keeper) GetLatestSegmentPrice(ctx context.Context) math.LegacyDec {
	// Get the actual MainCoin price from the MainCoin module
	if k.maincoinKeeper != nil {
		sdkCtx := sdk.UnwrapSDKContext(ctx)
		currentPrice := k.maincoinKeeper.GetCurrentPrice(sdkCtx)
		if !currentPrice.IsZero() {
			return currentPrice
		}
	}
	
	// Fallback to initial price if MainCoin keeper not available
	return math.LegacyMustNewDecFromStr("0.0001")
}