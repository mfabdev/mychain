package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// InitDexState initializes the DEX state with default configuration
func (k msgServer) InitDexState(goCtx context.Context, msg *types.MsgInitDexState) (*types.MsgInitDexStateResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// For now, allow the admin account to initialize DEX state
	// In production, this should be restricted to governance
	// TODO: Implement proper governance integration

	// First check if parameters need updating
	params, paramsErr := k.Params.Get(ctx)
	needsParamUpdate := false
	if paramsErr != nil {
		// No params exist, need to set them
		needsParamUpdate = true
	} else if params.GetBaseRewardRateAsInt().IsZero() || params.LcDenom == "" || params.LcDenom == "liquiditycoin" {
		// Parameters are incorrect, need to update
		needsParamUpdate = true
	}

	// Check if DEX is already initialized by checking if any trading pairs exist
	var initialized bool
	err := k.TradingPairs.Walk(ctx, nil, func(id uint64, pair types.TradingPair) (bool, error) {
		initialized = true
		return true, nil // stop iteration
	})
	
	if err != nil {
		return nil, err
	}
	
	// If DEX is already initialized with trading pairs and params are correct
	if initialized && !needsParamUpdate {
		return nil, fmt.Errorf("DEX state is already initialized")
	}

	// Initialize trading pairs only if not already initialized
	if !initialized {
		tradingPairs := []types.TradingPair{
			{
				Id:         1,
				BaseDenom:  "umc",
				QuoteDenom: "utusd",
				Active:     true,
			},
			{
				Id:         2,
				BaseDenom:  "umc",
				QuoteDenom: "ulc",
				Active:     true,
			},
		}

		for _, pair := range tradingPairs {
			if err := k.TradingPairs.Set(ctx, pair.Id, pair); err != nil {
				return nil, err
			}
		}
	}

	// Initialize liquidity tiers
	tiers := []types.LiquidityTier{
		// Buy side tiers (MC buy orders)
		{
			Id:                    1,
			PriceDeviation:        math.LegacyMustNewDecFromStr("0"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.02"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.01"),
			WindowDurationSeconds: 172800, // 48h
		},
		{
			Id:                    2,
			PriceDeviation:        math.LegacyMustNewDecFromStr("-0.03"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.05"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.03"),
			WindowDurationSeconds: 259200, // 72h
		},
		{
			Id:                    3,
			PriceDeviation:        math.LegacyMustNewDecFromStr("-0.08"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.08"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.04"),
			WindowDurationSeconds: 345600, // 96h
		},
		{
			Id:                    4,
			PriceDeviation:        math.LegacyMustNewDecFromStr("-0.12"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.12"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.05"),
			WindowDurationSeconds: 432000, // 120h
		},
		// Sell side tiers (MC sell orders)
		{
			Id:                    5,
			PriceDeviation:        math.LegacyMustNewDecFromStr("0"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.02"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.01"),
			WindowDurationSeconds: 172800, // 48h
		},
		{
			Id:                    6,
			PriceDeviation:        math.LegacyMustNewDecFromStr("-0.08"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.05"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.03"),
			WindowDurationSeconds: 259200, // 72h
		},
		{
			Id:                    7,
			PriceDeviation:        math.LegacyMustNewDecFromStr("-0.12"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.08"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.04"),
			WindowDurationSeconds: 345600, // 96h
		},
		{
			Id:                    8,
			PriceDeviation:        math.LegacyMustNewDecFromStr("-0.16"),
			BidVolumeCap:          math.LegacyMustNewDecFromStr("0.12"),
			AskVolumeCap:          math.LegacyMustNewDecFromStr("0.05"),
			WindowDurationSeconds: 432000, // 120h
		},
	}

	for _, tier := range tiers {
		if err := k.LiquidityTiers.Set(ctx, tier.Id, tier); err != nil {
			return nil, err
		}
	}

	// Initialize price references for MC/TUSD pair
	// Initial MC price is $0.0001
	initialPrice := types.PriceReference{
		PairId:         1, // MC/TUSD
		ReferencePrice: math.LegacyMustNewDecFromStr("0.0001"),
		LastUpdated:    ctx.BlockTime().Unix(),
	}
	
	if err := k.PriceReferences.Set(ctx, initialPrice.PairId, initialPrice); err != nil {
		return nil, err
	}

	// Set next order ID
	if err := k.NextOrderID.Set(ctx, uint64(1)); err != nil {
		return nil, err
	}

	// Only update parameters if they're not properly set
	if needsParamUpdate && !initialized {
		// Use the full default parameters which includes all fee settings
		defaultParams := types.DefaultParams()
		
		// Override specific values if needed
		defaultParams.BaseRewardRate = math.NewIntFromUint64(222) // 7% annual returns
		defaultParams.FeesEnabled = true // Enable fees by default
		defaultParams.LcDenom = "ulc" // Ensure correct denomination
		
		if err := k.Params.Set(ctx, defaultParams); err != nil {
			return nil, err
		}
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			"dex_state_initialized",
			sdk.NewAttribute("trading_pairs", "2"),
			sdk.NewAttribute("liquidity_tiers", "8"),
		),
	)

	return &types.MsgInitDexStateResponse{}, nil
}