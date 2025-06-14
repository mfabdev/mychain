package keeper

import (
	"mychain/x/dex/types"
)

var _ types.QueryServer = queryServer{}

// NewQueryServerImpl returns an implementation of the QueryServer interface
// for the provided Keeper.
func NewQueryServerImpl(k Keeper) types.QueryServer {
	return queryServer{k}
}

type queryServer struct {
	k Keeper
}

// Ensure all query methods are implemented
var _ types.QueryServer = (*queryServer)(nil)
