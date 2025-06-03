package keeper

import (
	"context"
	
	"mychain/x/maincoin/types"
	
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// SegmentHistory implements the Query/SegmentHistory gRPC method
func (q queryServer) SegmentHistory(ctx context.Context, req *types.QuerySegmentHistoryRequest) (*types.QuerySegmentHistoryResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	
	if req.SegmentNumber == 0 {
		return nil, status.Error(codes.InvalidArgument, "segment number must be greater than 0")
	}
	
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Get segment history
	history, err := q.k.GetSegmentHistory(sdkCtx, req.SegmentNumber)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	// Apply pagination if requested
	// Note: In a real implementation, you'd want to paginate at the storage level
	// This is a simplified approach
	start := 0
	end := len(history.Purchases)
	
	if req.Pagination != nil && req.Pagination.Offset > 0 {
		start = int(req.Pagination.Offset)
		if start >= len(history.Purchases) {
			// Return empty result if offset is beyond the data
			history.Purchases = []types.SegmentPurchaseRecord{}
		}
	}
	
	if req.Pagination != nil && req.Pagination.Limit > 0 && start < len(history.Purchases) {
		proposedEnd := start + int(req.Pagination.Limit)
		if proposedEnd < end {
			end = proposedEnd
		}
		history.Purchases = history.Purchases[start:end]
	} else if start < len(history.Purchases) {
		history.Purchases = history.Purchases[start:]
	}
	
	return &types.QuerySegmentHistoryResponse{
		SegmentHistory: history,
		// Pagination response would be set here in a real implementation
	}, nil
}

// UserPurchaseHistory implements the Query/UserPurchaseHistory gRPC method
func (q queryServer) UserPurchaseHistory(ctx context.Context, req *types.QueryUserPurchaseHistoryRequest) (*types.QueryUserPurchaseHistoryResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	
	if req.Address == "" {
		return nil, status.Error(codes.InvalidArgument, "address cannot be empty")
	}
	
	// Validate address
	if _, err := sdk.AccAddressFromBech32(req.Address); err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid address")
	}
	
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Get user history
	history, err := q.k.GetUserPurchaseHistory(sdkCtx, req.Address)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	// Apply pagination if requested
	start := 0
	end := len(history.Purchases)
	
	if req.Pagination != nil && req.Pagination.Offset > 0 {
		start = int(req.Pagination.Offset)
		if start >= len(history.Purchases) {
			// Return empty result if offset is beyond the data
			history.Purchases = []types.SegmentPurchaseRecord{}
		}
	}
	
	if req.Pagination != nil && req.Pagination.Limit > 0 && start < len(history.Purchases) {
		proposedEnd := start + int(req.Pagination.Limit)
		if proposedEnd < end {
			end = proposedEnd
		}
		history.Purchases = history.Purchases[start:end]
	} else if start < len(history.Purchases) {
		history.Purchases = history.Purchases[start:]
	}
	
	return &types.QueryUserPurchaseHistoryResponse{
		UserHistory: history,
		// Pagination response would be set here in a real implementation
	}, nil
}