package keeper

import (
	"context"
	"fmt"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/query"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	
	"mychain/x/maincoin/types"
)

// SegmentHistoryAll returns paginated segment history
func (q queryServer) SegmentHistoryAll(goCtx context.Context, req *types.QuerySegmentHistoryAllRequest) (*types.QuerySegmentHistoryAllResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)
	
	// Get all segment history entries
	segments := q.k.GetAllSegmentHistory(ctx)
	
	// Convert to response format
	// For now, return all segments - in production, implement proper pagination
	pageRes := &query.PageResponse{
		Total: uint64(len(segments)),
	}
	
	return &types.QuerySegmentHistoryAllResponse{
		Segments:   segments,
		Pagination: pageRes,
	}, nil
}

// SegmentDetails returns detailed information about a specific segment
func (q queryServer) SegmentDetails(goCtx context.Context, req *types.QuerySegmentDetailsRequest) (*types.QuerySegmentDetailsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)
	
	// Get segment history entry
	segment, found := q.k.GetSegmentHistory(ctx, req.SegmentNumber)
	if !found {
		return nil, status.Error(codes.NotFound, fmt.Sprintf("segment %d not found", req.SegmentNumber))
	}
	
	// Calculate additional details
	var prevSegment *types.SegmentHistoryEntry
	if req.SegmentNumber > 0 {
		prevSeg, found := q.k.GetSegmentHistory(ctx, req.SegmentNumber-1)
		if found {
			prevSegment = &prevSeg
		}
	}
	
	// Get transactions for this segment
	transactions := q.k.GetSegmentTransactions(ctx, req.SegmentNumber)
	
	// Calculate metrics
	details := &types.SegmentDetails{
		Segment:               &segment,
		PreviousSegment:       prevSegment,
		Transactions:          transactions,
		TotalTransactions:     uint64(len(transactions)),
		AveragePurchaseSize:   q.k.calculateAveragePurchaseSize(transactions),
		LargestPurchase:       q.k.findLargestPurchase(transactions),
		SmallestPurchase:      q.k.findSmallestPurchase(transactions),
		TimeToComplete:        q.k.calculateTimeToComplete(&segment, prevSegment),
		ReserveRatioDeviation: q.k.calculateReserveDeviation(&segment),
	}
	
	return &types.QuerySegmentDetailsResponse{
		Details: details,
	}, nil
}

// SegmentStatistics returns aggregated statistics across all segments
func (q queryServer) SegmentStatistics(goCtx context.Context, req *types.QuerySegmentStatisticsRequest) (*types.QuerySegmentStatisticsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)
	
	// Get all segments
	segments := q.k.GetAllSegmentHistory(ctx)
	if len(segments) == 0 {
		return &types.QuerySegmentStatisticsResponse{
			Stats: &types.SegmentStatistics{},
		}, nil
	}
	
	// Calculate statistics
	stats := &types.SegmentStatistics{
		TotalSegments:        uint64(len(segments)),
		TotalMcPurchased:     math.ZeroInt(),
		TotalDevAllocated:    math.ZeroInt(),
		TotalReserves:        math.ZeroInt(),
		AverageSegmentTime:   0,
		FastestSegment:       0,
		SlowestSegment:       0,
		PerfectRatioSegments: 0,
		DeficitSegments:      0,
		SurplusSegments:      0,
	}
	
	var totalTime int64
	var fastestTime int64 = 999999999
	var slowestTime int64
	
	for i, segment := range segments {
		// Sum totals
		stats.TotalMcPurchased = stats.TotalMcPurchased.Add(segment.TokensMinted)
		stats.TotalDevAllocated = stats.TotalDevAllocated.Add(segment.DevDistributed)
		stats.TotalReserves = stats.TotalReserves.Add(segment.Reserves)
		
		// Check reserve ratio
		deviation := q.k.calculateReserveDeviation(&segment)
		if deviation.Abs().LT(math.NewInt(10)) { // Within 0.01%
			stats.PerfectRatioSegments++
		} else if deviation.IsNegative() {
			stats.DeficitSegments++
		} else {
			stats.SurplusSegments++
		}
		
		// Calculate segment completion time
		if i > 0 && segment.CompletedAt > 0 {
			prevSegment := segments[i-1]
			if prevSegment.CompletedAt > 0 {
				timeDiff := segment.CompletedAt - prevSegment.CompletedAt
				totalTime += timeDiff
				
				if timeDiff < fastestTime {
					fastestTime = timeDiff
					stats.FastestSegment = segment.SegmentNumber
				}
				if timeDiff > slowestTime {
					slowestTime = timeDiff
					stats.SlowestSegment = segment.SegmentNumber
				}
			}
		}
	}
	
	// Calculate averages
	if stats.TotalSegments > 1 {
		stats.AverageSegmentTime = totalTime / int64(stats.TotalSegments-1)
	}
	
	// Current state
	currentEpoch := q.k.GetCurrentEpoch(ctx)
	currentPrice := q.k.GetCurrentPrice(ctx)
	totalSupply := q.k.GetTotalSupply(ctx)
	
	stats.CurrentSegment = currentEpoch
	stats.CurrentPrice = currentPrice
	stats.CurrentSupply = totalSupply
	stats.LatestSegmentTime = segments[len(segments)-1].CompletedAt
	
	return &types.QuerySegmentStatisticsResponse{
		Stats: stats,
	}, nil
}

// Helper functions

func (k Keeper) calculateAveragePurchaseSize(transactions []*types.SegmentTransaction) math.Int {
	if len(transactions) == 0 {
		return math.ZeroInt()
	}
	
	total := math.ZeroInt()
	for _, tx := range transactions {
		total = total.Add(tx.TokensBought)
	}
	
	return total.Quo(math.NewInt(int64(len(transactions))))
}

func (k Keeper) findLargestPurchase(transactions []*types.SegmentTransaction) math.Int {
	largest := math.ZeroInt()
	for _, tx := range transactions {
		if tx.TokensBought.GT(largest) {
			largest = tx.TokensBought
		}
	}
	return largest
}

func (k Keeper) findSmallestPurchase(transactions []*types.SegmentTransaction) math.Int {
	if len(transactions) == 0 {
		return math.ZeroInt()
	}
	
	smallest := transactions[0].TokensBought
	for _, tx := range transactions[1:] {
		if tx.TokensBought.LT(smallest) {
			smallest = tx.TokensBought
		}
	}
	return smallest
}

func (k Keeper) calculateTimeToComplete(segment, prevSegment *types.SegmentHistoryEntry) int64 {
	if segment == nil || prevSegment == nil {
		return 0
	}
	if segment.CompletedAt == 0 || prevSegment.CompletedAt == 0 {
		return 0
	}
	return segment.CompletedAt - prevSegment.CompletedAt
}

func (k Keeper) calculateReserveDeviation(segment *types.SegmentHistoryEntry) math.Int {
	if segment.TotalSupply.IsZero() {
		return math.ZeroInt()
	}
	
	// Calculate required reserves (10% of total value)
	// Convert supply to decimal and multiply by price
	supplyDec := math.LegacyNewDecFromInt(segment.TotalSupply)
	totalValueDec := supplyDec.Mul(segment.Price)
	// Required reserves is 10% of total value
	requiredReservesDec := totalValueDec.Quo(math.LegacyNewDec(10))
	// Convert back to Int
	requiredReserves := requiredReservesDec.TruncateInt()
	
	// Calculate deviation in basis points (1 bp = 0.01%)
	deviation := segment.Reserves.Sub(requiredReserves)
	deviationBps := deviation.Mul(math.NewInt(10000)).Quo(requiredReserves)
	
	return deviationBps
}