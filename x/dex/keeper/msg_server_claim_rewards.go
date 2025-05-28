package keeper

import (
	"context"

	"mychain/x/dex/types"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) ClaimRewards(ctx context.Context, msg *types.MsgClaimRewards) (*types.MsgClaimRewardsResponse, error) {
	userAddr, err := k.addressCodec.StringToBytes(msg.User)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid user address")
	}

	// Get user rewards
	userRewards, err := k.UserRewards.Get(ctx, msg.User)
	if err != nil {
		return nil, errorsmod.Wrapf(types.ErrNoRewardsAvailable, "no rewards found for user %s", msg.User)
	}

	// Calculate claimable rewards
	claimableRewards := userRewards.TotalRewards.Sub(userRewards.ClaimedRewards)
	if claimableRewards.IsZero() || claimableRewards.IsNegative() {
		return nil, errorsmod.Wrapf(types.ErrNoRewardsAvailable, "no claimable rewards for user %s", msg.User)
	}

	// Check if amount requested is valid
	requestedAmount := msg.Amount
	if requestedAmount.IsZero() || requestedAmount.GT(claimableRewards) {
		// If no amount specified or too much, claim all available
		requestedAmount = claimableRewards
	}

	// Mint LC tokens to the user
	lcCoins := sdk.NewCoins(sdk.NewCoin("liquiditycoin", requestedAmount))
	if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, lcCoins); err != nil {
		return nil, err
	}

	// Send minted LC tokens to the user
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(
		ctx,
		types.ModuleName,
		sdk.AccAddress(userAddr),
		lcCoins,
	); err != nil {
		return nil, err
	}

	// Update user rewards
	userRewards.ClaimedRewards = userRewards.ClaimedRewards.Add(requestedAmount)
	if err := k.UserRewards.Set(ctx, msg.User, userRewards); err != nil {
		return nil, err
	}

	// Emit event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"claim_rewards",
			sdk.NewAttribute("user", msg.User),
			sdk.NewAttribute("amount", requestedAmount.String()),
			sdk.NewAttribute("remaining", claimableRewards.Sub(requestedAmount).String()),
		),
	)

	return &types.MsgClaimRewardsResponse{
		ClaimedAmount: requestedAmount,
	}, nil
}
