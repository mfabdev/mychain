package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/collections"
	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) ClaimRewards(ctx context.Context, msg *types.MsgClaimRewards) (*types.MsgClaimRewardsResponse, error) {
	userAddr, err := k.addressCodec.StringToBytes(msg.User)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid user address")
	}

	// First, accumulate any recent rewards for this user
	recentRewards, err := k.CalculateRewardsSinceLastUpdate(ctx, msg.User)
	if err != nil {
		k.Logger(ctx).Error("failed to calculate recent rewards", "user", msg.User, "error", err)
		recentRewards = math.ZeroInt()
	}

	// Get stored user rewards
	userRewards, err := k.UserRewards.Get(ctx, msg.User)
	if err != nil {
		// No stored rewards, check if there are recent rewards
		if recentRewards.IsZero() {
			return nil, errorsmod.Wrapf(types.ErrNoRewardsAvailable, "no rewards found for user %s", msg.User)
		}
		// Create new user rewards entry
		userRewards = types.UserReward{
			Address:         msg.User,
			TotalRewards:    recentRewards,
			ClaimedRewards:  math.ZeroInt(),
		}
	} else {
		// Add recent rewards to stored rewards
		userRewards.TotalRewards = userRewards.TotalRewards.Add(recentRewards)
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
	lcCoins := sdk.NewCoins(sdk.NewCoin("ulc", requestedAmount))
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

	// Update order reward info timestamps for all user orders
	// This prevents double counting of recent rewards
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime()
	err = k.UserOrders.Walk(ctx, collections.NewPrefixedPairRange[string, uint64](msg.User), 
		func(key collections.Pair[string, uint64], orderID uint64) (bool, error) {
			// Get order reward info
			orderRewardInfo, err := k.OrderRewards.Get(ctx, orderID)
			if err != nil {
				return false, nil // Skip if no reward info
			}
			
			// Update last claim time
			orderRewardInfo.LastClaimedTime = currentTime.Unix()
			orderRewardInfo.LastUpdated = currentTime.Unix()
			
			// Save updated info
			if err := k.OrderRewards.Set(ctx, orderID, orderRewardInfo); err != nil {
				k.Logger(ctx).Error("failed to update order reward info after claim", "orderID", orderID, "error", err)
			}
			
			return false, nil
		})
	
	if err != nil {
		k.Logger(ctx).Error("failed to update order timestamps after claim", "user", msg.User, "error", err)
	}

	// Emit event
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
