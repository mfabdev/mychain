package main

// This file contains the fix for DEX parameter initialization
// The issue is that params.BaseRewardRate.IsZero() check happens after 
// the "already initialized" check, so parameters never get updated.

// To fix this, we need to modify msg_server_init_dex_state.go to:
// 1. Check parameters BEFORE checking if trading pairs exist
// 2. Allow parameter updates even if trading pairs exist
// 3. Use correct default values (ulc instead of liquiditycoin)

/*
The fix in msg_server_init_dex_state.go should be:

func (k msgServer) InitDexState(goCtx context.Context, msg *types.MsgInitDexState) (*types.MsgInitDexStateResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// First check if parameters need updating
	params, paramsErr := k.Params.Get(ctx)
	needsParamUpdate := false
	if paramsErr != nil {
		// No params exist, need to set them
		needsParamUpdate = true
	} else if params.BaseRewardRate.IsZero() || params.LcDenom == "" || params.LcDenom == "liquiditycoin" {
		// Parameters are incorrect, need to update
		needsParamUpdate = true
	}

	// Check if trading pairs exist
	var initialized bool
	err := k.TradingPairs.Walk(ctx, nil, func(id uint64, pair types.TradingPair) (bool, error) {
		initialized = true
		return true, nil // stop iteration
	})
	
	if err != nil {
		return nil, err
	}

	// If everything is already properly initialized
	if initialized && !needsParamUpdate {
		return nil, fmt.Errorf("DEX state is already initialized")
	}

	// Always update parameters if needed
	if needsParamUpdate {
		defaultParams := types.DefaultParams()
		// Override with correct values
		defaultParams.BaseRewardRate = math.NewInt(222) // 7% annual returns
		defaultParams.FeesEnabled = true
		defaultParams.LcDenom = "ulc" // Fix the denomination
		
		if err := k.Params.Set(ctx, defaultParams); err != nil {
			return nil, err
		}
	}

	// ... rest of the function remains the same
}
*/

// Also fix in types/params.go:
// Change: DefaultLCDenom = "liquiditycoin"
// To:     DefaultLCDenom = "ulc"