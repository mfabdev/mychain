package keeper

import (
	"context"

	"mychain/x/maincoin/types"

	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) BuyMaincoin(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	buyerAddr, err := k.addressCodec.StringToBytes(msg.Buyer)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid buyer address")
	}
	
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Validate amount
	if msg.Amount.Amount.IsNegative() || msg.Amount.Amount.IsZero() {
		return nil, types.ErrInvalidAmount
	}
	
	// Check denomination
	if msg.Amount.Denom != params.PurchaseDenom {
		return nil, errorsmod.Wrapf(types.ErrInvalidDenom, "expected %s, got %s", params.PurchaseDenom, msg.Amount.Denom)
	}
	
	// Transfer TestUSD from buyer to module
	if err := k.bankKeeper.SendCoinsFromAccountToModule(
		ctx,
		sdk.AccAddress(buyerAddr),
		types.ModuleName,
		sdk.NewCoins(msg.Amount),
	); err != nil {
		return nil, err
	}
	
	// Process the purchase across potentially multiple segments
	remainingFunds := math.LegacyNewDecFromInt(msg.Amount.Amount)
	totalMaincoinPurchased := math.ZeroInt()
	
	for remainingFunds.IsPositive() {
		// Get current state
		currentPrice, err := k.CurrentPrice.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		currentEpoch, err := k.CurrentEpoch.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		// Calculate tokens available in current segment
		tokensNeeded, err := k.CalculateTokensNeeded(ctx)
		if err != nil {
			return nil, err
		}
		
		// Calculate how many tokens we can buy with remaining funds
		tokensToBuy := remainingFunds.Quo(currentPrice).TruncateInt()
		
		// If we need to rebalance and buyer wants to buy more than needed
		if tokensNeeded.IsPositive() && tokensToBuy.GT(tokensNeeded) {
			// Buy only what's needed for this segment
			tokensToBuy = tokensNeeded
		}
		
		if tokensToBuy.IsZero() {
			break
		}
		
		// Calculate cost for these tokens
		cost := currentPrice.Mul(math.LegacyNewDecFromInt(tokensToBuy))
		
		// Update totals
		totalMaincoinPurchased = totalMaincoinPurchased.Add(tokensToBuy)
		remainingFunds = remainingFunds.Sub(cost)
		
		// Update reserve balance
		currentReserve, err := k.ReserveBalance.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		newReserve := currentReserve.Add(cost.TruncateInt())
		if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
			return nil, err
		}
		
		// Update total supply
		totalSupply, err := k.TotalSupply.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		// Calculate dev allocation for this purchase
		devAllocationDec := math.LegacyNewDecFromInt(tokensToBuy).Mul(params.FeePercentage)
		devAllocation := devAllocationDec.TruncateInt()
		
		newTotalSupply := totalSupply.Add(tokensToBuy).Add(devAllocation)
		if err := k.TotalSupply.Set(ctx, newTotalSupply); err != nil {
			return nil, err
		}
		
		// Update dev allocation total
		if devAllocation.IsPositive() {
			devTotal, err := k.DevAllocationTotal.Get(ctx)
			if err != nil {
				return nil, err
			}
			
			if err := k.DevAllocationTotal.Set(ctx, devTotal.Add(devAllocation)); err != nil {
				return nil, err
			}
			
			// Mint and send dev allocation
			if params.DevAddress != "" {
				devAddr, err := sdk.AccAddressFromBech32(params.DevAddress)
				if err != nil {
					return nil, err
				}
				
				devCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, devAllocation))
				if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, devCoins); err != nil {
					return nil, err
				}
				
				if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, devAddr, devCoins); err != nil {
					return nil, err
				}
			}
		}
		
		// Check if we need to move to next epoch
		newTokensNeeded, err := k.CalculateTokensNeeded(ctx)
		if err != nil {
			return nil, err
		}
		
		if newTokensNeeded.IsPositive() {
			// Move to next epoch
			if err := k.CurrentEpoch.Set(ctx, currentEpoch+1); err != nil {
				return nil, err
			}
			
			// Increase price by 0.1%
			newPrice := currentPrice.Mul(math.LegacyOneDec().Add(params.PriceIncrement))
			if err := k.CurrentPrice.Set(ctx, newPrice); err != nil {
				return nil, err
			}
		}
	}
	
	// Mint and send MainCoins to buyer
	if totalMaincoinPurchased.IsPositive() {
		coins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, totalMaincoinPurchased))
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
	
	// Emit event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"buy_maincoin",
			sdk.NewAttribute("buyer", msg.Buyer),
			sdk.NewAttribute("amount_spent", msg.Amount.String()),
			sdk.NewAttribute("maincoin_received", totalMaincoinPurchased.String()),
		),
	)

	return &types.MsgBuyMaincoinResponse{
		AmountPurchased: sdk.NewCoin(types.MainCoinDenom, totalMaincoinPurchased),
	}, nil
}
