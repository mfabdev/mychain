package keeper

import (
	"context"
	"time"
	
	"mychain/x/maincoin/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// RecordSegmentPurchases records the segment purchases from a transaction
func (k Keeper) RecordSegmentPurchases(
	ctx sdk.Context,
	buyer string,
	txHash string,
	segmentDetails []SegmentPurchaseDetail,
) error {
	blockHeight := ctx.BlockHeight()
	timestamp := ctx.BlockTime()
	
	for _, detail := range segmentDetails {
		// Create purchase record
		record := types.SegmentPurchaseRecord{
			SegmentNumber:  detail.SegmentNumber,
			Buyer:          buyer,
			TokensBought:   detail.TokensBought,
			UserTokens:     detail.UserTokens,
			DevAllocation:  detail.DevAllocation,
			PricePerToken:  detail.Price,
			Cost:           detail.Cost,
			IsComplete:     detail.IsComplete,
			TxHash:         txHash,
			BlockHeight:    blockHeight,
			Timestamp:      timestamp,
		}
		
		// Update segment history
		if err := k.updateSegmentHistory(ctx, record); err != nil {
			return err
		}
		
		// Update user history
		if err := k.updateUserHistory(ctx, buyer, record); err != nil {
			return err
		}
	}
	
	return nil
}

// updateSegmentHistory updates the history for a specific segment
func (k Keeper) updateSegmentHistory(ctx context.Context, record types.SegmentPurchaseRecord) error {
	// Get existing history or create new
	history, err := k.SegmentHistories.Get(ctx, record.SegmentNumber)
	if err != nil {
		// Create new history if doesn't exist
		history = types.SegmentHistory{
			SegmentNumber:      record.SegmentNumber,
			Purchases:          []types.SegmentPurchaseRecord{},
			TotalTokensSold:    math.ZeroInt(),
			TotalDevAllocation: math.ZeroInt(),
			TotalRevenue:       math.ZeroInt(),
			IsComplete:         false,
		}
	}
	
	// Add purchase record
	history.Purchases = append(history.Purchases, record)
	
	// Update totals
	history.TotalTokensSold = history.TotalTokensSold.Add(record.TokensBought)
	history.TotalDevAllocation = history.TotalDevAllocation.Add(record.DevAllocation)
	history.TotalRevenue = history.TotalRevenue.Add(record.Cost)
	
	// Update completion status
	if record.IsComplete && !history.IsComplete {
		history.IsComplete = true
		history.CompletedAtHeight = record.BlockHeight
		history.CompletedAt = &record.Timestamp
	}
	
	// Save updated history
	return k.SegmentHistories.Set(ctx, record.SegmentNumber, history)
}

// updateUserHistory updates the purchase history for a specific user
func (k Keeper) updateUserHistory(ctx context.Context, buyer string, record types.SegmentPurchaseRecord) error {
	// Get existing history or create new
	history, err := k.UserHistories.Get(ctx, buyer)
	if err != nil {
		// Create new history if doesn't exist
		history = types.UserPurchaseHistory{
			Address:           buyer,
			Purchases:         []types.SegmentPurchaseRecord{},
			TotalTokensBought: math.ZeroInt(),
			TotalSpent:        math.ZeroInt(),
		}
	}
	
	// Add purchase record
	history.Purchases = append(history.Purchases, record)
	
	// Update totals
	history.TotalTokensBought = history.TotalTokensBought.Add(record.UserTokens)
	history.TotalSpent = history.TotalSpent.Add(record.Cost)
	
	// Save updated history
	return k.UserHistories.Set(ctx, buyer, history)
}

// GetSegmentHistory retrieves the purchase history for a specific segment
func (k Keeper) GetSegmentHistory(ctx context.Context, segmentNumber uint64) (*types.SegmentHistory, error) {
	history, err := k.SegmentHistories.Get(ctx, segmentNumber)
	if err != nil {
		// Return empty history if not found
		return &types.SegmentHistory{
			SegmentNumber:      segmentNumber,
			Purchases:          []types.SegmentPurchaseRecord{},
			TotalTokensSold:    math.ZeroInt(),
			TotalDevAllocation: math.ZeroInt(),
			TotalRevenue:       math.ZeroInt(),
			IsComplete:         false,
		}, nil
	}
	return &history, nil
}

// GetUserPurchaseHistory retrieves the purchase history for a specific user
func (k Keeper) GetUserPurchaseHistory(ctx context.Context, address string) (*types.UserPurchaseHistory, error) {
	history, err := k.UserHistories.Get(ctx, address)
	if err != nil {
		// Return empty history if not found
		return &types.UserPurchaseHistory{
			Address:           address,
			Purchases:         []types.SegmentPurchaseRecord{},
			TotalTokensBought: math.ZeroInt(),
			TotalSpent:        math.ZeroInt(),
		}, nil
	}
	return &history, nil
}

// GetRecentSegmentPurchases gets the most recent purchases across all segments
func (k Keeper) GetRecentSegmentPurchases(ctx context.Context, limit int) ([]types.SegmentPurchaseRecord, error) {
	var allPurchases []types.SegmentPurchaseRecord
	
	// Iterate through segment histories
	err := k.SegmentHistories.Walk(ctx, nil, func(segmentNum uint64, history types.SegmentHistory) (bool, error) {
		allPurchases = append(allPurchases, history.Purchases...)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	// Sort by block height (most recent first)
	// Note: In production, you'd want a more efficient way to get recent purchases
	sortPurchasesByBlockHeight(allPurchases)
	
	// Return limited results
	if len(allPurchases) > limit {
		return allPurchases[:limit], nil
	}
	return allPurchases, nil
}

// Helper function to sort purchases by block height (most recent first)
func sortPurchasesByBlockHeight(purchases []types.SegmentPurchaseRecord) {
	// Simple bubble sort - in production use sort.Slice
	for i := 0; i < len(purchases); i++ {
		for j := i + 1; j < len(purchases); j++ {
			if purchases[j].BlockHeight > purchases[i].BlockHeight {
				purchases[i], purchases[j] = purchases[j], purchases[i]
			}
		}
	}
}