package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) ClaimOrderRewards(ctx context.Context, msg *types.MsgClaimOrderRewards) (*types.MsgClaimOrderRewardsResponse, error) {
	userAddr, err := k.addressCodec.StringToBytes(msg.User)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid user address")
	}

	totalClaimed := math.ZeroInt()
	claimedOrders := []uint64{}

	// Process each order
	for _, orderID := range msg.OrderIds {
		// Get the order
		order, err := k.Orders.Get(ctx, orderID)
		if err != nil {
			k.Logger(ctx).Error("order not found for reward claim", "orderID", orderID)
			continue
		}

		// Verify the user owns this order
		if order.Maker != msg.User {
			k.Logger(ctx).Error("order does not belong to user", "orderID", orderID, "user", msg.User)
			continue
		}

		// Get order reward info
		orderRewardInfo, err := k.OrderRewards.Get(ctx, orderID)
		if err != nil {
			k.Logger(ctx).Error("no reward info for order", "orderID", orderID)
			continue
		}

		// Calculate current rewards
		currentRewards, err := k.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
		if err != nil {
			k.Logger(ctx).Error("failed to calculate rewards", "orderID", orderID, "error", err)
			continue
		}

		if currentRewards.IsZero() {
			continue
		}

		// Update order reward info
		sdkCtx := sdk.UnwrapSDKContext(ctx)
		orderRewardInfo.TotalRewards = orderRewardInfo.TotalRewards.Add(currentRewards)
		orderRewardInfo.LastClaimedTime = sdkCtx.BlockTime().Unix()
		orderRewardInfo.LastUpdated = sdkCtx.BlockTime().Unix()
		orderRewardInfo.AccumulatedTime = sdkCtx.BlockTime().Unix() - orderRewardInfo.StartTime

		if err := k.OrderRewards.Set(ctx, orderID, orderRewardInfo); err != nil {
			k.Logger(ctx).Error("failed to update order reward info", "orderID", orderID, "error", err)
			continue
		}

		totalClaimed = totalClaimed.Add(currentRewards)
		claimedOrders = append(claimedOrders, orderID)
	}

	if totalClaimed.IsZero() {
		return nil, errorsmod.Wrapf(types.ErrNoRewardsAvailable, "no rewards to claim for specified orders")
	}

	// Mint LC tokens
	lcCoins := sdk.NewCoins(sdk.NewCoin("liquiditycoin", totalClaimed))
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

	// Update user total rewards
	userRewards, err := k.UserRewards.Get(ctx, msg.User)
	if err != nil {
		// Create new user rewards
		userRewards = types.UserReward{
			Address:        msg.User,
			TotalRewards:   totalClaimed,
			ClaimedRewards: totalClaimed,
		}
	} else {
		userRewards.TotalRewards = userRewards.TotalRewards.Add(totalClaimed)
		userRewards.ClaimedRewards = userRewards.ClaimedRewards.Add(totalClaimed)
	}

	if err := k.UserRewards.Set(ctx, msg.User, userRewards); err != nil {
		return nil, err
	}

	// Emit event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"claim_order_rewards",
			sdk.NewAttribute("user", msg.User),
			sdk.NewAttribute("amount", totalClaimed.String()),
			sdk.NewAttribute("orders_claimed", fmt.Sprintf("%v", claimedOrders)),
		),
	)

	return &types.MsgClaimOrderRewardsResponse{
		ClaimedAmount: totalClaimed,
		ClaimedOrders: claimedOrders,
	}, nil
}