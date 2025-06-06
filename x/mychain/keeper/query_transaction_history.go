package keeper

import (
	"context"
	
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	
	"mychain/x/mychain/types"
)

func (q queryServer) TransactionHistory(ctx context.Context, req *types.QueryTransactionHistoryRequest) (*types.QueryTransactionHistoryResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	
	if req.Address == "" {
		return nil, status.Error(codes.InvalidArgument, "address cannot be empty")
	}
	
	// Default limit
	limit := req.Limit
	if limit == 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Get transaction history
	txHistory, err := q.k.GetTransactionHistory(sdkCtx, req.Address, limit)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	// Convert to proto format
	var transactions []types.TransactionRecord
	for _, tx := range txHistory {
		transactions = append(transactions, types.TransactionRecord{
			TxHash:      tx.TxHash,
			Type:        tx.Type,
			Description: tx.Description,
			Amount:      tx.Amount,
			From:        tx.From,
			To:          tx.To,
			Height:      tx.Height,
			Timestamp:   tx.Timestamp,
		})
	}
	
	return &types.QueryTransactionHistoryResponse{
		Transactions: transactions,
	}, nil
}