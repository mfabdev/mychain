package keeper

import (
	"context"
	"fmt"
	
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
	// Convert totalSupply from smallest unit to MC (divide by 1,000,000 for 6 decimals)
	totalSupplyInMC := math.LegacyNewDecFromInt(totalSupply).Quo(math.LegacyNewDec(1000000))
	// currentPrice is in TESTUSD per MC, but we need utestusd
	// 0.0001 TESTUSD = 100 utestusd
	currentPriceInUtestusd := currentPrice.Mul(math.LegacyNewDec(1000000))
	totalValueDec := currentPriceInUtestusd.Mul(totalSupplyInMC)
	
	// Required reserve is 10% of total value
	requiredReserveDec := totalValueDec.Quo(math.LegacyNewDec(10))
	
	// Early debug logging
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.Logger().Debug("CalculateTokensNeeded START",
		"totalSupply_smallest", totalSupply.String(),
		"totalSupplyInMC", totalSupplyInMC.String(),
		"currentPrice", currentPrice.String(),
		"currentPriceInUtestusd", currentPriceInUtestusd.String(),
		"totalValueDec_utestusd", totalValueDec.String(),
		"requiredReserveDec", requiredReserveDec.String(),
		"reserveBalance", reserveBalance.String(),
	)
	
	// Calculate reserve needed with decimal precision
	reserveBalanceDec := math.LegacyNewDecFromInt(reserveBalance)
	reserveNeededDec := requiredReserveDec.Sub(reserveBalanceDec)
	
	// More detailed debug logging
	sdkCtx.Logger().Info("CalculateTokensNeeded DETAILED",
		"totalSupply_smallest_unit", totalSupply.String(),
		"totalSupplyInMC", totalSupplyInMC.String(),
		"currentPrice_TESTUSD_per_MC", currentPrice.String(),
		"currentPriceInUtestusd_per_MC", currentPriceInUtestusd.String(),
		"totalValueDec_utestusd", totalValueDec.String(),
		"requiredReserveDec_utestusd", requiredReserveDec.String(),
		"reserveBalance_utestusd", reserveBalance.String(),
		"reserveBalanceDec_utestusd", reserveBalanceDec.String(),
		"reserveNeededDec_utestusd", reserveNeededDec.String(),
		"calculation", fmt.Sprintf("(%s MC * %s utestusd/MC) / 10 - %s utestusd = %s utestusd needed",
			totalSupplyInMC.String(), currentPriceInUtestusd.String(), reserveBalance.String(), reserveNeededDec.String()),
	)
	
	// Check if we need more reserves (with a small epsilon for rounding)
	// Using 2 utestusd as epsilon (0.000002 TESTUSD) to handle precision issues
	epsilon := math.LegacyNewDecWithPrec(2, 0) // 2 utestusd
	sdkCtx.Logger().Info("CalculateTokensNeeded epsilon check",
		"epsilon", epsilon.String(),
		"reserveNeededDec", reserveNeededDec.String(),
		"reserveNeededDec.GT(epsilon)", reserveNeededDec.GT(epsilon),
	)
	
	if reserveNeededDec.GT(epsilon) {
		// CRITICAL: Use correct formula with 0.9 factor
		// When buying X tokens at price P:
		// - Supply increases by X
		// - Reserve increases by X * P
		// - New required reserve = 0.1 * (Supply + X) * P
		// Therefore: X = Reserve Deficit / (0.9 * P)
		//
		// Apply 0.9 factor to the price
		priceWith09Factor := currentPriceInUtestusd.Mul(math.LegacyNewDecWithPrec(9, 1)) // 0.9
		
		// Calculate tokens needed with correct formula
		tokensNeededInMC := reserveNeededDec.Quo(priceWith09Factor)
		// Convert from MC to smallest unit (multiply by 1,000,000 for 6 decimals)
		tokensNeededDec := tokensNeededInMC.Mul(math.LegacyNewDec(1000000))
		// Round up to ensure we meet the requirement
		tokensNeeded := tokensNeededDec.Ceil().TruncateInt()
		
		sdkCtx.Logger().Info("CalculateTokensNeeded result DETAILED",
			"reserveNeededDec_utestusd", reserveNeededDec.String(),
			"currentPriceInUtestusd_per_MC", currentPriceInUtestusd.String(),
			"priceWith09Factor", priceWith09Factor.String(),
			"tokensNeededInMC", tokensNeededInMC.String(),
			"tokensNeededDec_smallest_unit", tokensNeededDec.String(),
			"tokensNeeded_smallest_unit", tokensNeeded.String(),
			"calculation", fmt.Sprintf("%s utestusd / (0.9 * %s utestusd/MC) = %s MC = %s smallest_unit",
				reserveNeededDec.String(), currentPriceInUtestusd.String(), tokensNeededInMC.String(), tokensNeeded.String()),
		)
		
		return tokensNeeded, nil
	}
	
	sdkCtx.Logger().Info("CalculateTokensNeeded result", "tokensNeeded", "0")
	return math.ZeroInt(), nil
}

// GetCurrentEpoch returns the current epoch/segment number
func (k Keeper) GetCurrentEpoch(ctx sdk.Context) uint64 {
	epoch, err := k.CurrentEpoch.Get(ctx)
	if err != nil {
		return 0
	}
	return epoch
}

// GetCurrentPrice returns the current MainCoin price
func (k Keeper) GetCurrentPrice(ctx sdk.Context) math.LegacyDec {
	price, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return math.LegacyZeroDec()
	}
	return price
}

// GetTotalSupply returns the total MainCoin supply
func (k Keeper) GetTotalSupply(ctx sdk.Context) math.Int {
	supply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return math.ZeroInt()
	}
	return supply
}

// GetReserveBalance returns the current reserve balance
func (k Keeper) GetReserveBalance(ctx sdk.Context) math.Int {
	balance, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return math.ZeroInt()
	}
	return balance
}

