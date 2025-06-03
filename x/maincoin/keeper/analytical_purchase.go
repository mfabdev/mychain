package keeper

import (
	"context"
	"fmt"
	
	"mychain/x/maincoin/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Constants for high precision calculations
var (
	// Use 18 decimal places for internal calculations
	PRECISION = math.LegacyNewDec(1e18)
	
	// 10 MC in smallest units with precision
	TEN_MC_PRECISE = math.LegacyNewDec(10 * 1e6).Mul(PRECISION)
	
	// One with precision
	ONE_PRECISE = PRECISION
)

// AnalyticalPurchaseResult contains all calculated values for a purchase
type AnalyticalPurchaseResult struct {
	TotalTokens      math.LegacyDec // In smallest units with precision
	TotalCost        math.LegacyDec // In utestusd with precision
	SegmentsCrossed  uint64
	FinalPrice       math.LegacyDec
	DevAllocation    math.LegacyDec
	RemainingFunds   math.LegacyDec
}

// BuyMaincoinAnalytical implements an analytical solution for MainCoin purchases
// This avoids the rounding errors and gas inefficiency of the iterative approach
func (k msgServer) BuyMaincoinAnalytical(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Validate and setup
	if err := k.EnsureInitialized(sdkCtx); err != nil {
		return nil, err
	}
	
	buyerAddr, err := k.addressCodec.StringToBytes(msg.Buyer)
	if err != nil {
		return nil, err
	}
	
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Get current state
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	currentEpoch, err := k.CurrentEpoch.Get(ctx)
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
	
	// Transfer funds from buyer
	if err := k.bankKeeper.SendCoinsFromAccountToModule(
		ctx,
		sdk.AccAddress(buyerAddr),
		types.ModuleName,
		sdk.NewCoins(msg.Amount),
	); err != nil {
		return nil, err
	}
	
	// Calculate purchase analytically
	result, err := k.calculateAnalyticalPurchase(
		ctx,
		math.LegacyNewDecFromInt(msg.Amount.Amount),
		currentPrice,
		totalSupply,
		reserveBalance,
		params,
	)
	if err != nil {
		// Refund on calculation error
		k.bankKeeper.SendCoinsFromModuleToAccount(
			ctx,
			types.ModuleName,
			sdk.AccAddress(buyerAddr),
			sdk.NewCoins(msg.Amount),
		)
		return nil, err
	}
	
	// Convert results to integers
	totalTokensInt := result.TotalTokens.Quo(PRECISION).RoundInt()
	totalCostInt := result.TotalCost.Quo(PRECISION).RoundInt()
	devAllocationInt := result.DevAllocation.Quo(PRECISION).RoundInt()
	remainingFundsInt := result.RemainingFunds.Quo(PRECISION).RoundInt()
	
	// Apply all state changes atomically
	if err := k.applyPurchaseResults(
		ctx,
		totalSupply,
		reserveBalance,
		currentEpoch,
		totalTokensInt,
		totalCostInt,
		devAllocationInt,
		result.SegmentsCrossed,
		result.FinalPrice,
		params,
	); err != nil {
		return nil, err
	}
	
	// Mint and send MainCoins to buyer
	if totalTokensInt.IsPositive() {
		coins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, totalTokensInt))
		if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
			return nil, err
		}
		
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(
			ctx,
			types.ModuleName,
			sdk.AccAddress(buyerAddr),
			coins,
		); err != nil {
			return nil, err
		}
	}
	
	// Return remaining funds if any
	if remainingFundsInt.IsPositive() {
		returnCoins := sdk.NewCoins(sdk.NewCoin(params.PurchaseDenom, remainingFundsInt))
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(
			ctx,
			types.ModuleName,
			sdk.AccAddress(buyerAddr),
			returnCoins,
		); err != nil {
			return nil, err
		}
	}
	
	// Calculate average price
	averagePrice := "0"
	if totalTokensInt.IsPositive() {
		avgPriceDec := math.LegacyNewDecFromInt(totalCostInt).Quo(math.LegacyNewDecFromInt(totalTokensInt))
		averagePrice = avgPriceDec.String()
	}
	
	// Emit event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"buy_maincoin_analytical",
			sdk.NewAttribute("buyer", msg.Buyer),
			sdk.NewAttribute("amount_spent", totalCostInt.String()),
			sdk.NewAttribute("maincoin_received", totalTokensInt.String()),
			sdk.NewAttribute("segments_processed", fmt.Sprintf("%d", result.SegmentsCrossed)),
			sdk.NewAttribute("average_price", averagePrice),
		),
	)
	
	return &types.MsgBuyMaincoinResponse{
		TotalTokensBought: totalTokensInt.String(),
		TotalPaid:         totalCostInt.String(),
		AveragePrice:      averagePrice,
		RemainingFunds:    remainingFundsInt.String(),
	}, nil
}

// calculateAnalyticalPurchase performs the analytical calculation for a purchase
func (k Keeper) calculateAnalyticalPurchase(
	ctx context.Context,
	fundsAvailable math.LegacyDec, // in utestusd
	currentPrice math.LegacyDec,   // in TESTUSD per MC
	totalSupply math.Int,
	reserveBalance math.Int,
	params types.Params,
) (*AnalyticalPurchaseResult, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Convert to high precision
	funds := fundsAvailable.Mul(PRECISION)
	price := currentPrice.Mul(math.LegacyNewDec(1e6)).Mul(PRECISION) // Convert to utestusd per MC with precision
	
	result := &AnalyticalPurchaseResult{
		TotalTokens:     math.ZeroDec(),
		TotalCost:       math.ZeroDec(),
		SegmentsCrossed: 0,
		FinalPrice:      currentPrice,
		DevAllocation:   math.ZeroDec(),
		RemainingFunds:  funds,
	}
	
	// Phase 1: Complete current segment if needed
	tokensNeeded, err := k.CalculateTokensNeeded(ctx)
	if err != nil {
		return nil, err
	}
	
	if tokensNeeded.IsPositive() {
		tokensNeededDec := math.LegacyNewDecFromInt(tokensNeeded).Mul(PRECISION)
		costForCurrent := price.Mul(tokensNeededDec.Quo(math.LegacyNewDec(1e6))).Quo(PRECISION)
		
		sdkCtx.Logger().Info("Analytical: Current segment calculation",
			"tokensNeeded", tokensNeeded.String(),
			"costForCurrent", costForCurrent.Quo(PRECISION).String(),
			"fundsAvailable", funds.Quo(PRECISION).String(),
		)
		
		if funds.GTE(costForCurrent) {
			// Can complete current segment
			result.TotalTokens = result.TotalTokens.Add(tokensNeededDec)
			result.TotalCost = result.TotalCost.Add(costForCurrent)
			result.RemainingFunds = funds.Sub(costForCurrent)
			result.SegmentsCrossed++
			
			// Update price for next segment
			price = price.Mul(ONE_PRECISE.Add(params.PriceIncrement.Mul(PRECISION))).Quo(PRECISION)
			result.FinalPrice = result.FinalPrice.Mul(math.LegacyOneDec().Add(params.PriceIncrement))
		} else {
			// Partial purchase in current segment
			tokensAffordable := funds.Mul(math.LegacyNewDec(1e6)).Quo(price)
			result.TotalTokens = tokensAffordable
			result.TotalCost = funds
			result.RemainingFunds = math.ZeroDec()
			return result, nil
		}
	}
	
	// Phase 2: Calculate complete segments using geometric series
	if result.RemainingFunds.IsPositive() && result.SegmentsCrossed > 0 {
		// Cost for one complete segment at current price
		segmentCost := price.Mul(TEN_MC_PRECISE.Quo(math.LegacyNewDec(1e6))).Quo(PRECISION)
		
		// Calculate how many complete segments we can afford
		// Using geometric series: Sum = a(1 - r^n) / (1 - r)
		// where a = segmentCost, r = 1 + priceIncrement
		
		r := ONE_PRECISE.Add(params.PriceIncrement.Mul(PRECISION)).Quo(PRECISION)
		n := uint64(0)
		
		// Binary search for maximum segments we can afford
		low, high := uint64(0), uint64(1000) // Max 1000 segments to prevent overflow
		
		for low <= high {
			mid := (low + high) / 2
			cost := calculateGeometricSeriesSum(segmentCost, r, mid)
			
			if cost.LTE(result.RemainingFunds) {
				n = mid
				low = mid + 1
			} else {
				high = mid - 1
			}
		}
		
		if n > 0 {
			totalSegmentCost := calculateGeometricSeriesSum(segmentCost, r, n)
			result.TotalTokens = result.TotalTokens.Add(TEN_MC_PRECISE.MulInt64(int64(n)))
			result.TotalCost = result.TotalCost.Add(totalSegmentCost)
			result.RemainingFunds = result.RemainingFunds.Sub(totalSegmentCost)
			result.SegmentsCrossed += n
			
			// Update final price
			for i := uint64(0); i < n; i++ {
				result.FinalPrice = result.FinalPrice.Mul(math.LegacyOneDec().Add(params.PriceIncrement))
			}
			price = price.Mul(r.Power(n))
		}
	}
	
	// Phase 3: Handle remaining funds in final partial segment
	if result.RemainingFunds.GT(PRECISION) { // More than 1 unit with precision
		tokensAffordable := result.RemainingFunds.Mul(math.LegacyNewDec(1e6)).Quo(price)
		result.TotalTokens = result.TotalTokens.Add(tokensAffordable)
		result.TotalCost = result.TotalCost.Add(result.RemainingFunds)
		result.RemainingFunds = math.ZeroDec()
	}
	
	// Calculate dev allocation
	result.DevAllocation = result.TotalTokens.Mul(params.FeePercentage.Mul(PRECISION)).Quo(PRECISION)
	
	sdkCtx.Logger().Info("Analytical purchase complete",
		"totalTokens", result.TotalTokens.Quo(PRECISION).String(),
		"totalCost", result.TotalCost.Quo(PRECISION).String(),
		"segmentsCrossed", result.SegmentsCrossed,
		"devAllocation", result.DevAllocation.Quo(PRECISION).String(),
	)
	
	return result, nil
}

// calculateGeometricSeriesSum calculates the sum of a geometric series
// Sum = a(1 - r^n) / (1 - r) for r != 1
func calculateGeometricSeriesSum(a, r math.LegacyDec, n uint64) math.LegacyDec {
	if n == 0 {
		return math.ZeroDec()
	}
	
	if r.Equal(ONE_PRECISE) {
		// Special case: r = 1, sum = n * a
		return a.MulInt64(int64(n))
	}
	
	// Calculate r^n
	rPowerN := r.Power(n)
	
	// Sum = a * (1 - r^n) / (1 - r)
	numerator := a.Mul(ONE_PRECISE.Sub(rPowerN))
	denominator := ONE_PRECISE.Sub(r)
	
	return numerator.Quo(denominator)
}

// applyPurchaseResults applies all state changes from a purchase atomically
func (k Keeper) applyPurchaseResults(
	ctx context.Context,
	oldTotalSupply math.Int,
	oldReserveBalance math.Int,
	oldEpoch uint64,
	totalTokens math.Int,
	totalCost math.Int,
	devAllocation math.Int,
	segmentsCrossed uint64,
	finalPrice math.LegacyDec,
	params types.Params,
) error {
	// Update total supply (including dev allocation)
	newTotalSupply := oldTotalSupply.Add(totalTokens).Add(devAllocation)
	if err := k.TotalSupply.Set(ctx, newTotalSupply); err != nil {
		return err
	}
	
	// Update reserve balance
	newReserveBalance := oldReserveBalance.Add(totalCost)
	if err := k.ReserveBalance.Set(ctx, newReserveBalance); err != nil {
		return err
	}
	
	// Update epoch
	newEpoch := oldEpoch + segmentsCrossed
	if err := k.CurrentEpoch.Set(ctx, newEpoch); err != nil {
		return err
	}
	
	// Update price
	if err := k.CurrentPrice.Set(ctx, finalPrice); err != nil {
		return err
	}
	
	// Update dev allocation total
	if devAllocation.IsPositive() {
		devTotal, err := k.DevAllocationTotal.Get(ctx)
		if err != nil {
			return err
		}
		
		if err := k.DevAllocationTotal.Set(ctx, devTotal.Add(devAllocation)); err != nil {
			return err
		}
		
		// Mint and send dev allocation
		if params.DevAddress != "" {
			devAddr, err := sdk.AccAddressFromBech32(params.DevAddress)
			if err != nil {
				return err
			}
			
			devCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, devAllocation))
			if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, devCoins); err != nil {
				return err
			}
			
			if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, devAddr, devCoins); err != nil {
				return err
			}
		}
	}
	
	return nil
}