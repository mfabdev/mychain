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
	
	// Calculate reserve needed with decimal precision
	reserveBalanceDec := math.LegacyNewDecFromInt(reserveBalance)
	reserveNeededDec := requiredReserveDec.Sub(reserveBalanceDec)
	
	// Check if we need more reserves (with a small epsilon for rounding)
	// Using 2 utestusd as epsilon (0.000002 TESTUSD) to handle precision issues
	epsilon := math.LegacyNewDecWithPrec(2, 0) // 2 utestusd
	if reserveNeededDec.GT(epsilon) {
		// Calculate tokens needed at current price
		tokensNeededDec := reserveNeededDec.Quo(currentPrice)
		// Round up to ensure we meet the requirement
		return tokensNeededDec.Ceil().TruncateInt(), nil
	}
	
	return math.ZeroInt(), nil
}

