package keeper

import (
	"context"
	"fmt"
	"os"

	sdkmath "cosmossdk.io/math"
	"mychain/x/maincoin/types"
)

// InitGenesis initializes the module's state from a provided genesis state.
func (k Keeper) InitGenesis(ctx context.Context, genState types.GenesisState) error {
	// Write to stderr so we can see it in logs
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: InitGenesis called\n")

	if err := genState.Validate(); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Validation failed: %v\n", err)
		return err
	}

	if err := k.Params.Set(ctx, genState.Params); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Failed to set Params: %v\n", err)
		return err
	}
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Params set successfully\n")

	if err := k.CurrentEpoch.Set(ctx, genState.CurrentEpoch); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Failed to set CurrentEpoch: %v\n", err)
		return err
	}
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: CurrentEpoch set to %d\n", genState.CurrentEpoch)

	if err := k.CurrentPrice.Set(ctx, genState.CurrentPrice); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Failed to set CurrentPrice: %v\n", err)
		return err
	}
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: CurrentPrice set to %s\n", genState.CurrentPrice.String())

	// Check if bank module already has MainCoin supply
	bankSupply := k.bankKeeper.GetSupply(ctx, "maincoin")
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Bank module has existing supply: %s\n", bankSupply.String())

	// Validate that bank supply matches our genesis state
	if !bankSupply.IsZero() && !bankSupply.Amount.Equal(genState.TotalSupply) {
		// If there's a mismatch, this is a serious error
		return fmt.Errorf("MAINCOIN ERROR: Bank supply (%s) doesn't match genesis total supply (%s). "+
			"The MainCoin module must be the sole authority on MainCoin supply. "+
			"Please fix the genesis file to remove pre-minted MainCoin from bank module.",
			bankSupply.Amount.String(), genState.TotalSupply.String())
	}

	// If both are zero, we're starting fresh (correct)
	if bankSupply.IsZero() && genState.TotalSupply.IsZero() {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Starting with zero supply (correct initialization)\n")
	} else if !bankSupply.IsZero() && bankSupply.Amount.Equal(genState.TotalSupply) {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Bank supply matches genesis total supply, state is synchronized\n")
	}

	if err := k.TotalSupply.Set(ctx, genState.TotalSupply); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Failed to set TotalSupply: %v\n", err)
		return err
	}
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: TotalSupply set to %s\n", genState.TotalSupply.String())

	if err := k.ReserveBalance.Set(ctx, genState.ReserveBalance); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Failed to set ReserveBalance: %v\n", err)
		return err
	}
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: ReserveBalance set to %s\n", genState.ReserveBalance.String())

	if err := k.DevAllocationTotal.Set(ctx, genState.DevAllocationTotal); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Failed to set DevAllocationTotal: %v\n", err)
		return err
	}
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: DevAllocationTotal set to %s\n", genState.DevAllocationTotal.String())

	// Initialize PendingDevAllocation based on genesis state
	// For Segment 0 start: No pending dev allocation
	// When starting at epoch 0 with 0 supply, there's no pending dev
	pendingDev := sdkmath.ZeroInt()
	if err := k.PendingDevAllocation.Set(ctx, pendingDev); err != nil {
		fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: Failed to set PendingDevAllocation: %v\n", err)
		return err
	}
	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: PendingDevAllocation set to %s\n", pendingDev.String())

	fmt.Fprintf(os.Stderr, "MAINCOIN DEBUG: InitGenesis completed successfully\n")
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

	// Note: PendingDevAllocation is not exported as it's calculated from genesis supply

	return &types.GenesisState{
		Params:             params,
		CurrentEpoch:       currentEpoch,
		CurrentPrice:       currentPrice,
		TotalSupply:        totalSupply,
		ReserveBalance:     reserveBalance,
		DevAllocationTotal: devAllocationTotal,
	}, nil
}
