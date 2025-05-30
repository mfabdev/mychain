package keeper

import (
	"context"
	"fmt"

	"mychain/x/maincoin/types"

	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const MaxSegmentsPerPurchase = 25

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
	totalSpent := math.ZeroInt()
	segmentCount := 0
	segments := []*types.SegmentPurchase{}
	
	// Track tokens sold in current segment for dev allocation
	currentSegmentTokensSold := math.ZeroInt()
	currentSegmentStartEpoch := uint64(0)
	
	for remainingFunds.IsPositive() && segmentCount < MaxSegmentsPerPurchase {
		// Get current state
		currentPrice, err := k.CurrentPrice.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		currentEpoch, err := k.CurrentEpoch.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		// Track if this is a new segment
		if currentSegmentStartEpoch != currentEpoch {
			// If not the first segment, process dev allocation for previous segment
			if currentSegmentStartEpoch > 0 && currentSegmentTokensSold.IsPositive() {
				devAllocationDec := math.LegacyNewDecFromInt(currentSegmentTokensSold).Mul(params.FeePercentage)
				devAllocation := devAllocationDec.TruncateInt()
				
				if devAllocation.IsPositive() {
					// Update total supply with dev allocation
					totalSupply, err := k.TotalSupply.Get(ctx)
					if err != nil {
						return nil, err
					}
					
					newTotalSupply := totalSupply.Add(devAllocation)
					if err := k.TotalSupply.Set(ctx, newTotalSupply); err != nil {
						return nil, err
					}
					
					// Update dev allocation total
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
			}
			
			// Reset for new segment
			currentSegmentTokensSold = math.ZeroInt()
			currentSegmentStartEpoch = currentEpoch
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
		costInt := cost.TruncateInt()
		
		// Update totals
		totalMaincoinPurchased = totalMaincoinPurchased.Add(tokensToBuy)
		totalSpent = totalSpent.Add(costInt)
		remainingFunds = remainingFunds.Sub(cost)
		currentSegmentTokensSold = currentSegmentTokensSold.Add(tokensToBuy)
		
		// Record segment purchase
		segments = append(segments, &types.SegmentPurchase{
			SegmentNumber: currentEpoch,
			TokensBought:  tokensToBuy.String(),
			PricePerToken: currentPrice.String(),
			SegmentCost:   costInt.String(),
		})
		
		// Update reserve balance
		currentReserve, err := k.ReserveBalance.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		newReserve := currentReserve.Add(costInt)
		if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
			return nil, err
		}
		
		// Update total supply (without dev allocation yet)
		totalSupply, err := k.TotalSupply.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		newTotalSupply := totalSupply.Add(tokensToBuy)
		if err := k.TotalSupply.Set(ctx, newTotalSupply); err != nil {
			return nil, err
		}
		
		// Check if segment is complete
		newTokensNeeded, err := k.CalculateTokensNeeded(ctx)
		if err != nil {
			return nil, err
		}
		
		// If segment is complete (reached 1:10 balance)
		if newTokensNeeded.IsZero() || newTokensNeeded.IsNegative() {
			// Calculate and apply dev allocation for this segment
			if currentSegmentTokensSold.IsPositive() {
				devAllocationDec := math.LegacyNewDecFromInt(currentSegmentTokensSold).Mul(params.FeePercentage)
				devAllocation := devAllocationDec.TruncateInt()
				
				if devAllocation.IsPositive() {
					// Update total supply with dev allocation
					totalSupply, err = k.TotalSupply.Get(ctx)
					if err != nil {
						return nil, err
					}
					
					newTotalSupply = totalSupply.Add(devAllocation)
					if err := k.TotalSupply.Set(ctx, newTotalSupply); err != nil {
						return nil, err
					}
					
					// Update dev allocation total
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
			}
			
			// Move to next epoch
			if err := k.CurrentEpoch.Set(ctx, currentEpoch+1); err != nil {
				return nil, err
			}
			
			// Increase price by 0.1%
			newPrice := currentPrice.Mul(math.LegacyOneDec().Add(params.PriceIncrement))
			if err := k.CurrentPrice.Set(ctx, newPrice); err != nil {
				return nil, err
			}
			
			// Mark that we're in a new segment
			currentSegmentTokensSold = math.ZeroInt()
			currentSegmentStartEpoch = currentEpoch + 1
		}
		
		segmentCount++
	}
	
	// Return any remaining funds to buyer
	remainingAmount := math.ZeroInt()
	message := ""
	if remainingFunds.IsPositive() && segmentCount >= MaxSegmentsPerPurchase {
		remainingAmount = remainingFunds.TruncateInt()
		if remainingAmount.IsPositive() {
			returnCoins := sdk.NewCoins(sdk.NewCoin(params.PurchaseDenom, remainingAmount))
			if err := k.bankKeeper.SendCoinsFromModuleToAccount(
				ctx,
				types.ModuleName,
				sdk.AccAddress(buyerAddr),
				returnCoins,
			); err != nil {
				return nil, err
			}
			message = fmt.Sprintf("Purchase completed across %d segments (maximum limit). %s %s returned.", 
				MaxSegmentsPerPurchase, remainingAmount.String(), params.PurchaseDenom)
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
	
	// Calculate average price
	averagePrice := "0"
	if totalMaincoinPurchased.IsPositive() {
		avgPriceDec := math.LegacyNewDecFromInt(totalSpent).Quo(math.LegacyNewDecFromInt(totalMaincoinPurchased))
		averagePrice = avgPriceDec.String()
	}
	
	// Emit event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"buy_maincoin",
			sdk.NewAttribute("buyer", msg.Buyer),
			sdk.NewAttribute("amount_spent", totalSpent.String()),
			sdk.NewAttribute("maincoin_received", totalMaincoinPurchased.String()),
			sdk.NewAttribute("segments_processed", fmt.Sprintf("%d", segmentCount)),
			sdk.NewAttribute("average_price", averagePrice),
		),
	)

	return &types.MsgBuyMaincoinResponse{
		TotalTokensBought: totalMaincoinPurchased.String(),
		TotalPaid:         totalSpent.String(),
		AveragePrice:      averagePrice,
		Segments:          segments,
		RemainingFunds:    remainingAmount.String(),
		Message:           message,
	}, nil
}