package keeper

import (
	"context"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	
	"mychain/x/maincoin/types"
)

// CalculateTokensNeeded calculates tokens needed to maintain 1:10 reserve ratio
func (k Keeper) CalculateTokensNeeded(ctx context.Context) (math.Int, error) {
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return math.Int{}, err
	}
	
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return math.Int{}, err
	}
	
	reserveBalance, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return math.Int{}, err
	}
	
	// Calculate total value of current supply
	totalValueDec := currentPrice.Mul(math.LegacyNewDecFromInt(totalSupply))
	
	// Required reserve is 10% of total value
	requiredReserveDec := totalValueDec.Quo(math.LegacyNewDec(10))
	requiredReserve := requiredReserveDec.TruncateInt()
	
	// Calculate reserve needed
	reserveNeeded := requiredReserve.Sub(reserveBalance)
	
	if reserveNeeded.IsPositive() {
		// Calculate tokens needed at current price
		tokensNeededDec := math.LegacyNewDecFromInt(reserveNeeded).Quo(currentPrice)
		return tokensNeededDec.TruncateInt(), nil
	}
	
	return math.ZeroInt(), nil
}

// Rebalance performs the rebalancing logic
func (k Keeper) Rebalance(ctx context.Context) error {
	params, err := k.Params.Get(ctx)
	if err != nil {
		return err
	}
	
	tokensNeeded, err := k.CalculateTokensNeeded(ctx)
	if err != nil {
		return err
	}
	
	if tokensNeeded.IsZero() {
		return nil
	}
	
	// Calculate dev allocation
	devAllocationDec := math.LegacyNewDecFromInt(tokensNeeded).Mul(params.FeePercentage)
	devAllocation := devAllocationDec.TruncateInt()
	
	// Update total supply
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return err
	}
	
	newTotalSupply := totalSupply.Add(tokensNeeded).Add(devAllocation)
	
	// Check max supply if set
	if params.MaxSupply.IsPositive() && newTotalSupply.GT(params.MaxSupply) {
		return types.ErrMaxSupplyReached
	}
	
	if err := k.TotalSupply.Set(ctx, newTotalSupply); err != nil {
		return err
	}
	
	// Update dev allocation total
	devTotal, err := k.DevAllocationTotal.Get(ctx)
	if err != nil {
		return err
	}
	
	if err := k.DevAllocationTotal.Set(ctx, devTotal.Add(devAllocation)); err != nil {
		return err
	}
	
	// Update reserve balance
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return err
	}
	
	reserveIncrease := currentPrice.Mul(math.LegacyNewDecFromInt(tokensNeeded)).TruncateInt()
	currentReserve, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return err
	}
	
	if err := k.ReserveBalance.Set(ctx, currentReserve.Add(reserveIncrease)); err != nil {
		return err
	}
	
	// Mint dev allocation if any
	if devAllocation.IsPositive() {
		devAddr, err := sdk.AccAddressFromBech32(params.DevAddress)
		if err != nil {
			return err
		}
		
		coins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, devAllocation))
		if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
			return err
		}
		
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, devAddr, coins); err != nil {
			return err
		}
	}
	
	return nil
}

// CheckAndUpdateEpoch checks if we need to move to next epoch
func (k Keeper) CheckAndUpdateEpoch(ctx context.Context) error {
	// First perform rebalancing
	if err := k.Rebalance(ctx); err != nil {
		return err
	}
	
	// Check if we still need tokens after rebalancing
	tokensNeeded, err := k.CalculateTokensNeeded(ctx)
	if err != nil {
		return err
	}
	
	// If we still need tokens, increment epoch and price
	if tokensNeeded.IsPositive() {
		currentEpoch, err := k.CurrentEpoch.Get(ctx)
		if err != nil {
			return err
		}
		
		if err := k.CurrentEpoch.Set(ctx, currentEpoch+1); err != nil {
			return err
		}
		
		// Increase price by 0.1%
		currentPrice, err := k.CurrentPrice.Get(ctx)
		if err != nil {
			return err
		}
		
		params, err := k.Params.Get(ctx)
		if err != nil {
			return err
		}
		
		newPrice := currentPrice.Mul(math.LegacyOneDec().Add(params.PriceIncrement))
		if err := k.CurrentPrice.Set(ctx, newPrice); err != nil {
			return err
		}
		
		// Recursively rebalance at new price
		return k.CheckAndUpdateEpoch(ctx)
	}
	
	return nil
}