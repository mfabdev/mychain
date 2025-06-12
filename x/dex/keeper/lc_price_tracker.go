package keeper

import (
	"context"
	"time"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// 72 hours in seconds
	LCPriceUpdateWindow = 72 * 60 * 60
	// Initial LC price: 0.0001 MC per 1 LC
	InitialLCPrice = "0.0001"
)

// LCPriceHistory tracks the minimum price over time windows
type LCPriceHistory struct {
	CurrentPrice     math.LegacyDec
	HistoricalFloor  math.LegacyDec // Never goes down
	WindowStartTime  int64
	WindowMinPrice   math.LegacyDec
	LastUpdateTime   int64
}

// UpdateLCPrice updates the LC reference price based on 72-hour rule
// Price can only increase if no lower price exists in the past 72 hours
func (k Keeper) UpdateLCPrice(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime().Unix()
	
	// Get or initialize LC price history
	history, exists := k.GetLCPriceHistory(ctx)
	if !exists {
		// Initialize with starting price
		initialPrice := math.LegacyMustNewDecFromStr(InitialLCPrice)
		history = LCPriceHistory{
			CurrentPrice:     initialPrice,
			HistoricalFloor:  initialPrice,
			WindowStartTime:  currentTime,
			WindowMinPrice:   initialPrice,
			LastUpdateTime:   currentTime,
		}
		return k.SetLCPriceHistory(ctx, history)
	}
	
	// Get current market price from order book
	marketPrice := k.GetLCMarketPrice(ctx)
	if marketPrice.IsNil() || marketPrice.IsZero() {
		return nil // No market price available
	}
	
	// Check if we need to start a new window
	if currentTime-history.WindowStartTime >= LCPriceUpdateWindow {
		// 72 hours have passed
		// If the minimum price in the window is higher than historical floor, update it
		if history.WindowMinPrice.GT(history.HistoricalFloor) {
			history.HistoricalFloor = history.WindowMinPrice
			history.CurrentPrice = history.WindowMinPrice
			
			k.Logger(ctx).Info("LC price floor increased",
				"newFloor", history.HistoricalFloor,
				"previousFloor", history.CurrentPrice,
			)
		}
		
		// Start new window
		history.WindowStartTime = currentTime
		history.WindowMinPrice = marketPrice
	} else {
		// Update window minimum if market price is lower
		if marketPrice.LT(history.WindowMinPrice) {
			history.WindowMinPrice = marketPrice
		}
	}
	
	// Current price is always the historical floor (never goes down)
	history.CurrentPrice = history.HistoricalFloor
	history.LastUpdateTime = currentTime
	
	return k.SetLCPriceHistory(ctx, history)
}

// GetLCMarketPrice calculates the current LC market price from order book
func (k Keeper) GetLCMarketPrice(ctx context.Context) math.LegacyDec {
	// Get MC/LC trading pair (pair ID 2)
	bestBid := math.LegacyZeroDec()
	bestAsk := math.LegacyZeroDec()
	
	// Walk through orders to find best bid and ask
	_ = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		if order.PairId != 2 { // MC/LC pair
			return false, nil
		}
		
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		priceInMC := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		
		if order.IsBuy {
			// Buy order: someone willing to pay this much MC per LC
			if bestBid.IsZero() || priceInMC.GT(bestBid) {
				bestBid = priceInMC
			}
		} else {
			// Sell order: someone willing to sell LC for this much MC
			if bestAsk.IsZero() || priceInMC.LT(bestAsk) {
				bestAsk = priceInMC
			}
		}
		
		return false, nil
	})
	
	// Use mid-price if both exist, otherwise use whichever exists
	if !bestBid.IsZero() && !bestAsk.IsZero() {
		return bestBid.Add(bestAsk).Quo(math.LegacyNewDec(2))
	} else if !bestBid.IsZero() {
		return bestBid
	} else if !bestAsk.IsZero() {
		return bestAsk
	}
	
	// No market price available
	return math.LegacyZeroDec()
}

// GetLCReferencePrice returns the current LC reference price (never decreases)
func (k Keeper) GetLCReferencePrice(ctx context.Context) math.LegacyDec {
	history, exists := k.GetLCPriceHistory(ctx)
	if !exists {
		return math.LegacyMustNewDecFromStr(InitialLCPrice)
	}
	return history.CurrentPrice
}

// Storage helpers (these would use collections in real implementation)
func (k Keeper) GetLCPriceHistory(ctx context.Context) (LCPriceHistory, bool) {
	// This would retrieve from k.LCPriceHistory collections item
	// For now, returning placeholder
	return LCPriceHistory{}, false
}

func (k Keeper) SetLCPriceHistory(ctx context.Context, history LCPriceHistory) error {
	// This would store to k.LCPriceHistory collections item
	return nil
}