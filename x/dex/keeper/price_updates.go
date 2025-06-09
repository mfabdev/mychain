package keeper

import (
	"context"
	"time"
	
	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// UpdateReferencePrices updates reference prices for all trading pairs
// This should be called every 3 hours
func (k Keeper) UpdateReferencePrices(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Iterate through all trading pairs
	err := k.TradingPairs.Walk(ctx, nil, func(pairID uint64, pair types.TradingPair) (bool, error) {
		// Calculate current market price based on recent trades or order book
		marketPrice := k.CalculateMarketPrice(ctx, pairID)
		
		// Get or create price reference
		priceRef, err := k.PriceReferences.Get(ctx, pairID)
		if err != nil {
			// Create new price reference if it doesn't exist
			priceRef = types.PriceReference{
				PairId:         pairID,
				ReferencePrice: marketPrice,
				LastUpdated: sdkCtx.BlockTime().Unix(),
			}
		} else {
			// Update existing reference
			priceRef.ReferencePrice = marketPrice
			priceRef.LastUpdated = sdkCtx.BlockTime().Unix()
		}
		
		// Save updated price reference
		if err := k.PriceReferences.Set(ctx, pairID, priceRef); err != nil {
			return false, err
		}
		
		k.Logger(ctx).Info("Updated reference price",
			"pairID", pairID,
			"price", marketPrice,
			"time", sdkCtx.BlockTime())
		
		return false, nil
	})
	
	return err
}

// ShouldUpdatePrices checks if 3 hours have passed since last update
func (k Keeper) ShouldUpdatePrices(ctx context.Context) bool {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime()
	
	// Check any price reference to see when last updated
	var shouldUpdate bool
	k.PriceReferences.Walk(ctx, nil, func(pairID uint64, priceRef types.PriceReference) (bool, error) {
		lastUpdate := time.Unix(priceRef.LastUpdated, 0)
		timeSinceUpdate := currentTime.Sub(lastUpdate)
		
		// Update if more than 3 hours have passed
		if timeSinceUpdate >= 3*time.Hour {
			shouldUpdate = true
			return true, nil // Stop walking
		}
		return false, nil
	})
	
	// If no price references exist, should update
	isEmpty := true
	k.PriceReferences.Walk(ctx, nil, func(_ uint64, _ types.PriceReference) (bool, error) {
		isEmpty = false
		return true, nil
	})
	
	return shouldUpdate || isEmpty
}

// CalculateMarketPrice calculates the current market price for a trading pair
// Uses mid-point of best bid/ask or last trade price
func (k Keeper) CalculateMarketPrice(ctx context.Context, pairID uint64) math.LegacyDec {
	// Get best bid and ask prices
	bestBid := k.GetBestBidPrice(ctx, pairID)
	bestAsk := k.GetBestAskPrice(ctx, pairID)
	
	// If both exist, use mid-point
	if !bestBid.IsZero() && !bestAsk.IsZero() {
		return bestBid.Add(bestAsk).Quo(math.LegacyNewDec(2))
	}
	
	// If only one side exists, use that
	if !bestBid.IsZero() {
		return bestBid
	}
	if !bestAsk.IsZero() {
		return bestAsk
	}
	
	// If no orders exist, try to get last trade price
	lastTradePrice := k.GetLastTradePrice(ctx, pairID)
	if !lastTradePrice.IsZero() {
		return lastTradePrice
	}
	
	// Default to initial price based on pair
	pair, err := k.TradingPairs.Get(ctx, pairID)
	if err != nil {
		return math.LegacyZeroDec()
	}
	
	// Default prices based on pair type
	if pair.BaseDenom == "umc" && pair.QuoteDenom == "utusd" {
		return math.LegacyMustNewDecFromStr("100") // 100 utusd per umc = $0.0001 per MC
	} else if pair.BaseDenom == "umc" && pair.QuoteDenom == "ulc" {
		return math.LegacyMustNewDecFromStr("10") // 10 ulc per umc = 0.00001 LC per MC
	}
	
	return math.LegacyOneDec() // Default to 1:1
}

// GetBestBidPrice returns the highest buy order price for a pair
func (k Keeper) GetBestBidPrice(ctx context.Context, pairID uint64) math.LegacyDec {
	var bestPrice math.LegacyDec
	
	k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		if order.PairId == pairID && order.IsBuy && order.Amount.Amount.GT(order.FilledAmount.Amount) {
			orderPrice := math.LegacyNewDecFromInt(order.Price.Amount)
			if bestPrice.IsZero() || orderPrice.GT(bestPrice) {
				bestPrice = orderPrice
			}
		}
		return false, nil
	})
	
	return bestPrice
}

// GetBestAskPrice returns the lowest sell order price for a pair
func (k Keeper) GetBestAskPrice(ctx context.Context, pairID uint64) math.LegacyDec {
	var bestPrice math.LegacyDec
	
	k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		if order.PairId == pairID && !order.IsBuy && order.Amount.Amount.GT(order.FilledAmount.Amount) {
			orderPrice := math.LegacyNewDecFromInt(order.Price.Amount)
			if bestPrice.IsZero() || orderPrice.LT(bestPrice) {
				bestPrice = orderPrice
			}
		}
		return false, nil
	})
	
	return bestPrice
}

// GetLastTradePrice returns the price of the last executed trade
// This would need to be implemented with trade history tracking
func (k Keeper) GetLastTradePrice(ctx context.Context, pairID uint64) math.LegacyDec {
	// TODO: Implement trade history tracking
	// For now, return zero to use default prices
	return math.LegacyZeroDec()
}