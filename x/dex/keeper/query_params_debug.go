package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"
)

// DebugParams returns all params with explicit field access
func (k Keeper) DebugParams(ctx context.Context) (*types.QueryParamsResponse, error) {
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}

	// Log each field to ensure they're being read correctly
	k.Logger(ctx).Info("Debug params retrieval",
		"base_transfer_fee", params.BaseTransferFeePercentage,
		"min_order_amount", params.MinOrderAmount,
		"lc_initial_supply", params.LcInitialSupply,
		"lc_exchange_rate", params.LcExchangeRate,
		"base_reward_rate", params.BaseRewardRate,
		"lc_denom", params.LcDenom,
		"base_maker_fee", params.BaseMakerFeePercentage,
		"base_taker_fee", params.BaseTakerFeePercentage,
		"base_cancel_fee", params.BaseCancelFeePercentage,
		"base_sell_fee", params.BaseSellFeePercentage,
		"fee_increment", params.FeeIncrementPercentage,
		"price_threshold", params.PriceThresholdPercentage,
		"min_transfer_fee", params.MinTransferFee,
		"min_maker_fee", params.MinMakerFee,
		"min_taker_fee", params.MinTakerFee,
		"min_cancel_fee", params.MinCancelFee,
		"min_sell_fee", params.MinSellFee,
		"fees_enabled", fmt.Sprintf("%v", params.FeesEnabled),
		"liquidity_threshold", params.LiquidityThreshold,
		"price_multiplier_alpha", params.PriceMultiplierAlpha,
		"max_liquidity_multiplier", params.MaxLiquidityMultiplier,
		"burn_rate_percentage", params.BurnRatePercentage)

	return &types.QueryParamsResponse{Params: params}, nil
}