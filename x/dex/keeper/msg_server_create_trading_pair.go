package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// CreateTradingPair creates a new trading pair
func (k msgServer) CreateTradingPair(goCtx context.Context, msg *types.MsgCreateTradingPair) (*types.MsgCreateTradingPairResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// For now, allow the admin account to create trading pairs
	// In production, this should be restricted to governance
	// TODO: Implement proper governance integration

	// Check if trading pair already exists
	exists := false
	var nextID uint64 = 1
	
	err := k.TradingPairs.Walk(ctx, nil, func(id uint64, pair types.TradingPair) (bool, error) {
		if nextID <= id {
			nextID = id + 1
		}
		if (pair.BaseDenom == msg.BaseDenom && pair.QuoteDenom == msg.QuoteDenom) ||
		   (pair.BaseDenom == msg.QuoteDenom && pair.QuoteDenom == msg.BaseDenom) {
			exists = true
			return true, nil // stop iteration
		}
		return false, nil
	})
	
	if err != nil {
		return nil, err
	}
	
	if exists {
		return nil, fmt.Errorf("trading pair already exists for %s/%s", msg.BaseDenom, msg.QuoteDenom)
	}

	// Create new trading pair
	newPair := types.TradingPair{
		Id:         nextID,
		BaseDenom:  msg.BaseDenom,
		QuoteDenom: msg.QuoteDenom,
		Active:     true,
	}

	// Save trading pair
	if err := k.TradingPairs.Set(ctx, newPair.Id, newPair); err != nil {
		return nil, err
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			"trading_pair_created",
			sdk.NewAttribute("pair_id", fmt.Sprintf("%d", newPair.Id)),
			sdk.NewAttribute("base_denom", msg.BaseDenom),
			sdk.NewAttribute("quote_denom", msg.QuoteDenom),
		),
	)

	return &types.MsgCreateTradingPairResponse{
		PairId: newPair.Id,
	}, nil
}