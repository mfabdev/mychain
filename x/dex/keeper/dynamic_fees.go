package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)


// FeeStructure holds all fee rates
type FeeStructure struct {
	TransferFeeRate math.LegacyDec
	MakerFeeRate    math.LegacyDec
	TakerFeeRate    math.LegacyDec
	CancelFeeRate   math.LegacyDec
	SellFeeRate     math.LegacyDec
}

// CalculateDynamicFees calculates all fee rates based on current market conditions
func (k Keeper) CalculateDynamicFees(ctx context.Context) FeeStructure {
	// Get params
	params, _ := k.Params.Get(ctx)
	
	// If fees are not enabled, return zero fees
	if !params.FeesEnabled {
		return FeeStructure{
			TransferFeeRate: math.LegacyZeroDec(),
			MakerFeeRate:    math.LegacyZeroDec(),
			TakerFeeRate:    math.LegacyZeroDec(),
			CancelFeeRate:   math.LegacyZeroDec(),
			SellFeeRate:     math.LegacyZeroDec(),
		}
	}
	
	// Get current price ratio
	priceRatio := k.GetAveragePriceRatio(ctx)
	
	// If price is above threshold, no dynamic adjustment
	if priceRatio.GTE(params.GetPriceThresholdPercentageAsDec()) {
		return FeeStructure{
			TransferFeeRate: params.GetBaseTransferFeePercentageAsDec(),
			MakerFeeRate:    params.GetBaseMakerFeePercentageAsDec(),
			TakerFeeRate:    params.GetBaseTakerFeePercentageAsDec(),
			CancelFeeRate:   params.GetBaseCancelFeePercentageAsDec(),
			SellFeeRate:     params.GetBaseSellFeePercentageAsDec(),
		}
	}
	
	// Calculate price drop from threshold (e.g., 98%)
	// e.g., if price is 96%, drop is 2% = 200 basis points = 20 increments of 10bp
	priceDrop := params.GetPriceThresholdPercentageAsDec().Sub(priceRatio)
	tenBasisPoints := math.LegacyMustNewDecFromStr("0.001") // 0.1%
	increments := priceDrop.Quo(tenBasisPoints).TruncateInt()
	
	// Calculate dynamic fee addition
	dynamicAddition := params.GetFeeIncrementPercentageAsDec().MulInt(increments)
	
	// Apply dynamic rates (no caps - designed to discourage trading during volatility)
	fees := FeeStructure{
		// Transfer fee: base + dynamic
		TransferFeeRate: params.GetBaseTransferFeePercentageAsDec().Add(dynamicAddition),
		// Maker fee: flat 0.01% (no dynamic adjustment)
		MakerFeeRate: params.GetBaseMakerFeePercentageAsDec(),
		// Taker fee: base + dynamic
		TakerFeeRate: params.GetBaseTakerFeePercentageAsDec().Add(dynamicAddition),
		// Cancel fee: flat 0.01% (no dynamic adjustment)
		CancelFeeRate: params.GetBaseCancelFeePercentageAsDec(),
		// Sell fee: base + dynamic
		SellFeeRate: params.GetBaseSellFeePercentageAsDec().Add(dynamicAddition),
	}
	
	k.Logger(ctx).Info("Dynamic fees calculated",
		"priceRatio", priceRatio.String(),
		"increments", increments.String(),
		"transferFee", fees.TransferFeeRate.String(),
		"takerFee", fees.TakerFeeRate.String(),
		"sellFee", fees.SellFeeRate.String(),
	)
	
	return fees
}

// CalculateTransferFee calculates the transfer fee for a given amount
func (k Keeper) CalculateTransferFee(ctx context.Context, amount math.Int) (fee math.Int, netAmount math.Int) {
	params, _ := k.Params.Get(ctx)
	fees := k.CalculateDynamicFees(ctx)
	
	// Calculate fee amount
	amountDec := math.LegacyNewDecFromInt(amount)
	feeDec := amountDec.Mul(fees.TransferFeeRate)
	fee = feeDec.TruncateInt()
	
	// Apply minimum fee
	if fee.LT(params.GetMinTransferFeeAsInt()) {
		fee = params.GetMinTransferFeeAsInt()
	}
	
	// Calculate net amount
	netAmount = amount.Sub(fee)
	if netAmount.IsNegative() {
		netAmount = math.ZeroInt()
	}
	
	return fee, netAmount
}

// CalculateMakerFee calculates the maker fee (flat rate)
func (k Keeper) CalculateMakerFee(ctx context.Context, amount math.Int) math.Int {
	params, _ := k.Params.Get(ctx)
	fees := k.CalculateDynamicFees(ctx)
	
	// Calculate fee amount
	amountDec := math.LegacyNewDecFromInt(amount)
	feeDec := amountDec.Mul(fees.MakerFeeRate)
	fee := feeDec.TruncateInt()
	
	// Apply minimum fee
	if fee.LT(params.GetMinMakerFeeAsInt()) {
		fee = params.GetMinMakerFeeAsInt()
	}
	
	return fee
}

// CalculateTakerFee calculates the taker fee with dynamic adjustment
func (k Keeper) CalculateTakerFee(ctx context.Context, amount math.Int) math.Int {
	params, _ := k.Params.Get(ctx)
	fees := k.CalculateDynamicFees(ctx)
	
	// Calculate fee amount
	amountDec := math.LegacyNewDecFromInt(amount)
	feeDec := amountDec.Mul(fees.TakerFeeRate)
	fee := feeDec.TruncateInt()
	
	// Apply minimum fee
	if fee.LT(params.GetMinTakerFeeAsInt()) {
		fee = params.GetMinTakerFeeAsInt()
	}
	
	return fee
}

// CalculateTakerFeeWithLiquidity calculates taker fee including liquidity impact
func (k Keeper) CalculateTakerFeeWithLiquidity(
	ctx context.Context, 
	tradeValue math.Int,
	pairID uint64,
	isBuyOrder bool,
) math.Int {
	params, _ := k.Params.Get(ctx)
	baseFees := k.CalculateDynamicFees(ctx)
	
	// Apply liquidity impact multiplier
	adjustedFees := k.ApplyLiquidityImpactToFees(ctx, baseFees, tradeValue, pairID, isBuyOrder)
	
	// Calculate fee amount
	amountDec := math.LegacyNewDecFromInt(tradeValue)
	feeDec := amountDec.Mul(adjustedFees.TakerFeeRate)
	fee := feeDec.TruncateInt()
	
	// Apply minimum fee
	if fee.LT(params.GetMinTakerFeeAsInt()) {
		fee = params.GetMinTakerFeeAsInt()
	}
	
	return fee
}

// CalculateCancelFee calculates the order cancellation fee (flat rate)
func (k Keeper) CalculateCancelFee(ctx context.Context, orderValue math.Int) math.Int {
	params, _ := k.Params.Get(ctx)
	fees := k.CalculateDynamicFees(ctx)
	
	// Calculate fee amount based on remaining order value
	amountDec := math.LegacyNewDecFromInt(orderValue)
	feeDec := amountDec.Mul(fees.CancelFeeRate)
	fee := feeDec.TruncateInt()
	
	// Apply minimum fee
	if fee.LT(params.GetMinCancelFeeAsInt()) {
		fee = params.GetMinCancelFeeAsInt()
	}
	
	return fee
}

// CalculateSellFee calculates the sell fee with dynamic adjustment
func (k Keeper) CalculateSellFee(ctx context.Context, amount math.Int) (fee math.Int, netAmount math.Int) {
	params, _ := k.Params.Get(ctx)
	fees := k.CalculateDynamicFees(ctx)
	
	// Calculate fee amount
	amountDec := math.LegacyNewDecFromInt(amount)
	feeDec := amountDec.Mul(fees.SellFeeRate)
	fee = feeDec.TruncateInt()
	
	// Apply minimum fee
	if fee.LT(params.GetMinSellFeeAsInt()) {
		fee = params.GetMinSellFeeAsInt()
	}
	
	// Calculate net amount
	netAmount = amount.Sub(fee)
	if netAmount.IsNegative() {
		netAmount = math.ZeroInt()
	}
	
	return fee, netAmount
}

// CollectFee collects a fee from the user and holds it for burning
func (k Keeper) CollectFee(ctx context.Context, payer sdk.AccAddress, fee math.Int, feeType string) error {
	if fee.IsZero() {
		return nil
	}
	
	// Create fee coins
	feeCoins := sdk.NewCoins(sdk.NewCoin("ulc", fee))
	
	// Send fee to DEX module account (will be burned at end of block)
	err := k.bankKeeper.SendCoinsFromAccountToModule(ctx, payer, types.ModuleName, feeCoins)
	if err != nil {
		return fmt.Errorf("failed to collect %s fee: %w", feeType, err)
	}
	
	// Track fee collection
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"fee_collected",
			sdk.NewAttribute("type", feeType),
			sdk.NewAttribute("amount", fee.String()),
			sdk.NewAttribute("payer", payer.String()),
			sdk.NewAttribute("destination", "burn"),
		),
	)
	
	// Update fee statistics (could be stored in state)
	k.UpdateFeeStatistics(ctx, feeType, fee)
	
	return nil
}

// BurnCollectedFees burns all fees collected by the DEX module
func (k Keeper) BurnCollectedFees(ctx context.Context) error {
	// Get module account address
	moduleAddr := k.authKeeper.GetModuleAddress(types.ModuleName)
	if moduleAddr == nil {
		return fmt.Errorf("module account not found")
	}
	balance := k.bankKeeper.GetBalance(ctx, moduleAddr, "ulc")
	
	if balance.IsZero() {
		return nil
	}
	
	// Burn all collected fees
	coins := sdk.NewCoins(balance)
	err := k.bankKeeper.BurnCoins(ctx, types.ModuleName, coins)
	if err != nil {
		return fmt.Errorf("failed to burn collected fees: %w", err)
	}
	
	// Update burn statistics
	k.UpdateBurnStatistics(ctx, balance.Amount)
	
	// Emit burn event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"fees_burned",
			sdk.NewAttribute("amount", balance.String()),
			sdk.NewAttribute("module", types.ModuleName),
			sdk.NewAttribute("block_height", fmt.Sprintf("%d", sdkCtx.BlockHeight())),
		),
	)
	
	k.Logger(ctx).Info("Burned collected fees",
		"amount", balance.String(),
		"block_height", sdkCtx.BlockHeight(),
	)
	
	return nil
}

// GetAveragePriceRatio returns the current price ratio for dynamic fee calculation
func (k Keeper) GetAveragePriceRatio(ctx context.Context) math.LegacyDec {
	// For now, return 1.0 (100%) - no dynamic fees triggered
	// In production, this would calculate from actual market prices
	return math.LegacyOneDec()
}

// UpdateFeeStatistics updates fee collection statistics
func (k Keeper) UpdateFeeStatistics(ctx context.Context, feeType string, amount math.Int) {
	// For now, just log
	k.Logger(ctx).Info("Fee collected",
		"type", feeType,
		"amount", amount.String(),
	)
}

// UpdateBurnStatistics updates fee burn statistics
func (k Keeper) UpdateBurnStatistics(ctx context.Context, amount math.Int) {
	// For now, just log
	k.Logger(ctx).Info("Fees burned",
		"amount", amount.String(),
	)
}

