package keeper

import (
	"context"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
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
	// Convert totalSupply from umc to MC (divide by 100,000,000)
	totalSupplyInMC := math.LegacyNewDecFromInt(totalSupply).Quo(math.LegacyNewDec(100000000))
	// currentPrice is in TESTUSD per MC, but we need utestusd
	// 0.0001 TESTUSD = 100 utestusd
	currentPriceInUtestusd := currentPrice.Mul(math.LegacyNewDec(1000000))
	totalValueDec := currentPriceInUtestusd.Mul(totalSupplyInMC)
	
	// Required reserve is 10% of total value
	requiredReserveDec := totalValueDec.Quo(math.LegacyNewDec(10))
	
	// Calculate reserve needed with decimal precision
	reserveBalanceDec := math.LegacyNewDecFromInt(reserveBalance)
	reserveNeededDec := requiredReserveDec.Sub(reserveBalanceDec)
	
	// Debug logging
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.Logger().Info("CalculateTokensNeeded",
		"totalSupply", totalSupply.String(),
		"currentPrice", currentPrice.String(),
		"reserveBalance", reserveBalance.String(),
		"totalValue", totalValueDec.String(),
		"requiredReserve", requiredReserveDec.String(),
		"reserveNeeded", reserveNeededDec.String(),
	)
	
	// Check if we need more reserves (with a small epsilon for rounding)
	// Using 2 utestusd as epsilon (0.000002 TESTUSD) to handle precision issues
	epsilon := math.LegacyNewDecWithPrec(2, 0) // 2 utestusd
	if reserveNeededDec.GT(epsilon) {
		// Calculate tokens needed at current price
		// reserveNeededDec is in utestusd, currentPriceInUtestusd is utestusd per MC
		tokensNeededInMC := reserveNeededDec.Quo(currentPriceInUtestusd)
		// Convert from MC to umc
		tokensNeededDec := tokensNeededInMC.Mul(math.LegacyNewDec(100000000))
		// Round up to ensure we meet the requirement
		tokensNeeded := tokensNeededDec.Ceil().TruncateInt()
		
		sdkCtx.Logger().Info("CalculateTokensNeeded result",
			"tokensNeededDec", tokensNeededDec.String(),
			"tokensNeeded", tokensNeeded.String(),
		)
		
		return tokensNeeded, nil
	}
	
	sdkCtx.Logger().Info("CalculateTokensNeeded result", "tokensNeeded", "0")
	return math.ZeroInt(), nil
}

