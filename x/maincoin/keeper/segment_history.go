package keeper

import (
	"context"
	
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

// GetSegmentHistory retrieves a segment history entry
func (k Keeper) GetSegmentHistory(ctx sdk.Context, segmentNumber uint64) (types.SegmentHistoryEntry, bool) {
	// For now, try to get from SegmentHistories collection and convert
	history, err := k.SegmentHistories.Get(ctx, segmentNumber)
	if err != nil {
		return types.SegmentHistoryEntry{}, false
	}
	
	// Convert SegmentHistory to SegmentHistoryEntry
	entry := types.SegmentHistoryEntry{
		SegmentNumber:  history.SegmentNumber,
		TokensMinted:   history.TotalTokensSold,
		DevDistributed: history.TotalDevAllocation,
		TotalSupply:    math.ZeroInt(), // Need to calculate this
		Price:          math.LegacyZeroDec(), // Need to calculate this
		Reserves:       math.ZeroInt(), // Need to calculate this
		CompletedAt:    history.CompletedAtHeight,
		TxHash:         "", // Need to get from last transaction
	}
	
	return entry, true
}

// SetSegmentHistory stores a segment history entry
func (k Keeper) SetSegmentHistory(ctx sdk.Context, entry types.SegmentHistoryEntry) {
	// For now, store as a simple key-value pair using storeService
	// In production, this should be properly integrated with collections
	store := k.storeService.OpenKVStore(ctx)
	key := types.GetSegmentHistoryKey(entry.SegmentNumber)
	bz := k.cdc.MustMarshal(&entry)
	store.Set(key, bz)
}

// GetAllSegmentHistory retrieves all segment history entries
func (k Keeper) GetAllSegmentHistory(ctx sdk.Context) []types.SegmentHistoryEntry {
	// For now, return empty slice
	// In production, this should iterate over stored entries
	return []types.SegmentHistoryEntry{}
}

// GetSegmentTransactions retrieves all transactions for a specific segment
func (k Keeper) GetSegmentTransactions(ctx sdk.Context, segmentNumber uint64) []*types.SegmentTransaction {
	// For now, return empty slice - this would be implemented with proper transaction tracking
	return []*types.SegmentTransaction{}
}

// RecordSegmentCompletion records when a segment is completed
func (k Keeper) RecordSegmentCompletion(ctx sdk.Context, segmentNumber uint64, totalSupply, reserves math.Int, price math.LegacyDec) {
	entry := types.SegmentHistoryEntry{
		SegmentNumber:  segmentNumber,
		TokensMinted:   math.NewInt(10), // Fixed amount per segment
		DevDistributed: math.NewInt(10), // Fixed dev allocation
		TotalSupply:    totalSupply,
		Price:          price,
		Reserves:       reserves,
		CompletedAt:    ctx.BlockTime().Unix(),
		TxHash:         "", // Will be set by the transaction handler
	}
	
	k.SetSegmentHistory(ctx, entry)
}