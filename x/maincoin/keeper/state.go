package keeper

import (
	"context"
	
	"cosmossdk.io/math"
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

