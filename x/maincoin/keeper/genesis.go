package keeper

import (
	"context"

	"mychain/x/maincoin/types"
)

// InitGenesis initializes the module's state from a provided genesis state.
func (k Keeper) InitGenesis(ctx context.Context, genState types.GenesisState) error {
	if err := genState.Validate(); err != nil {
		return err
	}

	if err := k.Params.Set(ctx, genState.Params); err != nil {
		return err
	}
	
	if err := k.CurrentEpoch.Set(ctx, genState.CurrentEpoch); err != nil {
		return err
	}
	
	if err := k.CurrentPrice.Set(ctx, genState.CurrentPrice); err != nil {
		return err
	}
	
	if err := k.TotalSupply.Set(ctx, genState.TotalSupply); err != nil {
		return err
	}
	
	if err := k.ReserveBalance.Set(ctx, genState.ReserveBalance); err != nil {
		return err
	}
	
	if err := k.DevAllocationTotal.Set(ctx, genState.DevAllocationTotal); err != nil {
		return err
	}
	
	return nil
}

// ExportGenesis returns the module's exported genesis.
func (k Keeper) ExportGenesis(ctx context.Context) (*types.GenesisState, error) {
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	currentEpoch, err := k.CurrentEpoch.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	reserveBalance, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	devAllocationTotal, err := k.DevAllocationTotal.Get(ctx)
	if err != nil {
		return nil, err
	}

	return &types.GenesisState{
		Params:             params,
		CurrentEpoch:       currentEpoch,
		CurrentPrice:       currentPrice,
		TotalSupply:        totalSupply,
		ReserveBalance:     reserveBalance,
		DevAllocationTotal: devAllocationTotal,
	}, nil
}
