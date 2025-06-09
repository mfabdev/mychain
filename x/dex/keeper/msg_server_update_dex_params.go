package keeper

import (
	"context"

	"mychain/x/dex/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// UpdateDexParams updates the DEX parameters (admin only for now)
func (k msgServer) UpdateDexParams(goCtx context.Context, msg *types.MsgUpdateDexParams) (*types.MsgUpdateDexParamsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// For now, allow the admin account to update DEX params
	// In production, this should be restricted to governance
	// TODO: Implement proper governance integration

	if err := msg.Params.Validate(); err != nil {
		return nil, err
	}

	if err := k.Params.Set(ctx, msg.Params); err != nil {
		return nil, err
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			"dex_params_updated",
			sdk.NewAttribute("base_reward_rate", msg.Params.BaseRewardRate.String()),
			sdk.NewAttribute("base_transfer_fee_percentage", msg.Params.BaseTransferFeePercentage.String()),
			sdk.NewAttribute("min_order_amount", msg.Params.MinOrderAmount.String()),
		),
	)

	return &types.MsgUpdateDexParamsResponse{}, nil
}