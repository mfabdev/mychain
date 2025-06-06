package keeper

import (
	"fmt"
	
	"mychain/x/maincoin/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// RecordSegmentPurchasesOptimized records segment purchases with minimal gas usage
// This version only stores aggregate data and emits events for detailed tracking
func (k Keeper) RecordSegmentPurchasesOptimized(
	ctx sdk.Context,
	buyer string,
	txHash string,
	segmentDetails []SegmentPurchaseDetail,
) error {
	// Process each segment
	for _, detail := range segmentDetails {
		// Only update aggregate data for completed segments
		if detail.IsComplete {
			if err := k.recordSegmentCompletion(ctx, detail); err != nil {
				return err
			}
		}
		
		// Emit event for each segment purchase (instead of storing full records)
		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				"segment_purchase",
				sdk.NewAttribute("segment", fmt.Sprintf("%d", detail.SegmentNumber)),
				sdk.NewAttribute("buyer", buyer),
				sdk.NewAttribute("tokens", detail.TokensBought.String()),
				sdk.NewAttribute("user_tokens", detail.UserTokens.String()),
				sdk.NewAttribute("dev_tokens", detail.DevAllocation.String()),
				sdk.NewAttribute("price", detail.Price.String()),
				sdk.NewAttribute("cost", detail.Cost.String()),
				sdk.NewAttribute("complete", fmt.Sprintf("%t", detail.IsComplete)),
				sdk.NewAttribute("tx_hash", txHash),
			),
		)
	}
	
	return nil
}

// recordSegmentCompletion only records aggregate data when a segment completes
func (k Keeper) recordSegmentCompletion(ctx sdk.Context, detail SegmentPurchaseDetail) error {
	// Create a lightweight segment summary
	entry := types.SegmentHistoryEntry{
		SegmentNumber:  detail.SegmentNumber,
		TokensMinted:   detail.TokensBought,
		DevDistributed: detail.DevAllocation,
		TotalSupply:    math.ZeroInt(), // Can be retrieved from state
		Price:          detail.Price,
		Reserves:       math.ZeroInt(), // Can be retrieved from state
		CompletedAt:    ctx.BlockTime().Unix(),
		TxHash:         "", // Not storing individual tx hashes to save gas
	}
	
	// Store using efficient key-value storage
	store := k.storeService.OpenKVStore(ctx)
	key := types.GetSegmentHistoryKey(entry.SegmentNumber)
	
	// Check if segment already exists (to prevent duplicate recording)
	exists, err := store.Has(key)
	if err != nil {
		return err
	}
	if exists {
		// Segment already recorded, skip
		return nil
	}
	
	// Marshal and store
	bz := k.cdc.MustMarshal(&entry)
	return store.Set(key, bz)
}

// GetSegmentHistoryOptimized retrieves a segment history entry efficiently
func (k Keeper) GetSegmentHistoryOptimized(ctx sdk.Context, segmentNumber uint64) (types.SegmentHistoryEntry, bool) {
	store := k.storeService.OpenKVStore(ctx)
	key := types.GetSegmentHistoryKey(segmentNumber)
	
	bz, err := store.Get(key)
	if err != nil || bz == nil {
		return types.SegmentHistoryEntry{}, false
	}
	
	var entry types.SegmentHistoryEntry
	k.cdc.MustUnmarshal(bz, &entry)
	
	// Fill in current state data
	entry.TotalSupply = k.GetTotalSupply(ctx)
	entry.Reserves = k.GetReserveBalance(ctx)
	
	return entry, true
}

// GetAllSegmentHistoryOptimized retrieves all segment history entries efficiently
func (k Keeper) GetAllSegmentHistoryOptimized(ctx sdk.Context) []types.SegmentHistoryEntry {
	var entries []types.SegmentHistoryEntry
	store := k.storeService.OpenKVStore(ctx)
	
	// Get current state for calculations
	currentSupply := k.GetTotalSupply(ctx)
	currentReserves := k.GetReserveBalance(ctx)
	currentEpoch := k.GetCurrentEpoch(ctx)
	
	// Iterate through stored segments
	for i := uint64(0); i < currentEpoch; i++ {
		key := types.GetSegmentHistoryKey(i)
		bz, err := store.Get(key)
		if err != nil || bz == nil {
			// If not found, create a calculated entry
			price := math.LegacyNewDecWithPrec(1, 4) // 0.0001
			for j := uint64(0); j < i; j++ {
				price = price.Mul(math.LegacyNewDecWithPrec(1001, 3)) // 1.001x per segment
			}
			
			entry := types.SegmentHistoryEntry{
				SegmentNumber:  i,
				TokensMinted:   math.ZeroInt(),
				DevDistributed: math.ZeroInt(),
				TotalSupply:    currentSupply,
				Price:          price,
				Reserves:       currentReserves,
				CompletedAt:    0,
				TxHash:         "",
			}
			entries = append(entries, entry)
			continue
		}
		
		var entry types.SegmentHistoryEntry
		k.cdc.MustUnmarshal(bz, &entry)
		
		// Update with current state
		entry.TotalSupply = currentSupply
		entry.Reserves = currentReserves
		
		entries = append(entries, entry)
	}
	
	return entries
}

// CleanupOldSegmentData removes detailed purchase records to save space
// This can be called periodically to clean up old data
func (k Keeper) CleanupOldSegmentData(ctx sdk.Context, keepLastNSegments uint64) error {
	currentEpoch := k.GetCurrentEpoch(ctx)
	if currentEpoch <= keepLastNSegments {
		return nil
	}
	
	cleanupBefore := currentEpoch - keepLastNSegments
	
	// Remove old segment histories (if using the old format)
	err := k.SegmentHistories.Walk(ctx, nil, func(segmentNum uint64, history types.SegmentHistory) (bool, error) {
		if segmentNum < cleanupBefore {
			// Remove the detailed history
			return false, k.SegmentHistories.Remove(ctx, segmentNum)
		}
		return false, nil
	})
	
	return err
}

// Helper to get segment history key
func GetSegmentHistoryKeyPrefix() []byte {
	return []byte("segment_history/")
}

// GetUserPurchaseHistoryFromEvents reconstructs user history from events
// This is more gas-efficient than storing full history
func (k Keeper) GetUserPurchaseHistoryFromEvents(ctx sdk.Context, address string) types.UserPurchaseHistory {
	// In a real implementation, this would query historical events
	// For now, return empty history
	return types.UserPurchaseHistory{
		Address:           address,
		Purchases:         []types.SegmentPurchaseRecord{},
		TotalTokensBought: math.ZeroInt(),
		TotalSpent:        math.ZeroInt(),
	}
}