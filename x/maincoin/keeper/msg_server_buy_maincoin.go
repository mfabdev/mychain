package keeper

import (
	"context"
	"fmt"

	"mychain/x/maincoin/types"

	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const MaxSegmentsPerPurchase = 25 // Limit to prevent gas issues

func (k msgServer) BuyMaincoin(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	// Use the analytical approach for better accuracy and efficiency
	return k.BuyMaincoinAnalytical(ctx, msg)
}

// BuyMaincoinIterative is the original iterative implementation (kept for reference)
func (k msgServer) BuyMaincoinIterative(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	// Ensure all collections are initialized
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	if err := k.EnsureInitialized(sdkCtx); err != nil {
		return nil, errorsmod.Wrap(err, "failed to initialize state")
	}
	
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
		
		// Get current total supply and reserve balance for detailed logging
		totalSupply, err := k.TotalSupply.Get(ctx)
		if err != nil {
			return nil, err
		}
		currentReserve, err := k.ReserveBalance.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		// Debug logging
		sdkCtx.Logger().Info("BuyMaincoin iteration START",
			"iteration", segmentCount+1,
			"remainingFunds_utestusd", remainingFunds.String(),
			"currentPrice_TESTUSD_per_MC", currentPrice.String(),
			"currentEpoch", currentEpoch,
			"totalSupply_smallest_unit", totalSupply.String(),
			"currentReserve_utestusd", currentReserve.String(),
			"totalMaincoinPurchased_so_far", totalMaincoinPurchased.String(),
			"totalSpent_so_far", totalSpent.String(),
		)
		
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
		// remainingFunds is in utestusd, currentPrice is in TESTUSD per MC
		// Convert price to utestusd per MC
		currentPriceInUtestusd := currentPrice.Mul(math.LegacyNewDec(1000000))
		// Calculate MC we can buy
		mainCoinsToBuy := remainingFunds.Quo(currentPriceInUtestusd)
		// Convert to smallest_unit
		tokensToBuy := mainCoinsToBuy.Mul(math.LegacyNewDec(1000000)).TruncateInt()
		
		// Debug: Log calculation details
		sdkCtx.Logger().Info("Token calculation DETAILED",
			"tokensNeeded_smallest_unit", tokensNeeded.String(),
			"tokensNeeded_MC", math.LegacyNewDecFromInt(tokensNeeded).Quo(math.LegacyNewDec(1000000)).String(),
			"remainingFunds_utestusd", remainingFunds.String(),
			"remainingFunds_TESTUSD", remainingFunds.Quo(math.LegacyNewDec(1000000)).String(),
			"currentPrice_TESTUSD_per_MC", currentPrice.String(),
			"currentPriceInUtestusd_per_MC", currentPriceInUtestusd.String(),
			"mainCoinsToBuy_MC", mainCoinsToBuy.String(),
			"tokensToBuy_smallest_unit", tokensToBuy.String(),
			"calculation", fmt.Sprintf("%s utestusd / %s utestusd/MC = %s MC = %s smallest_unit", 
				remainingFunds.String(), currentPriceInUtestusd.String(), mainCoinsToBuy.String(), tokensToBuy.String()),
		)
		
		// If we need to rebalance and buyer wants to buy more than needed
		if tokensNeeded.IsPositive() && tokensToBuy.GT(tokensNeeded) {
			// Buy only what's needed for this segment
			tokensToBuy = tokensNeeded
		}
		
		if tokensToBuy.IsZero() {
			break
		}
		
		// Calculate cost for these tokens
		// tokensToBuy is in smallest_unit, need to convert to MC
		tokensToBuyInMC := math.LegacyNewDecFromInt(tokensToBuy).Quo(math.LegacyNewDec(1000000))
		// currentPriceInUtestusd is already in utestusd per MC
		cost := currentPriceInUtestusd.Mul(tokensToBuyInMC)
		costInt := cost.TruncateInt()
		
		// Debug: Log cost calculation
		sdkCtx.Logger().Info("Cost calculation DETAILED",
			"tokensToBuy_smallest_unit", tokensToBuy.String(),
			"tokensToBuyInMC", tokensToBuyInMC.String(),
			"currentPriceInUtestusd_per_MC", currentPriceInUtestusd.String(),
			"cost_utestusd_dec", cost.String(),
			"costInt_utestusd", costInt.String(),
			"cost_TESTUSD", cost.Quo(math.LegacyNewDec(1000000)).String(),
			"calculation", fmt.Sprintf("%s MC * %s utestusd/MC = %s utestusd",
				tokensToBuyInMC.String(), currentPriceInUtestusd.String(), cost.String()),
		)
		
		// Update totals
		totalMaincoinPurchased = totalMaincoinPurchased.Add(tokensToBuy)
		totalSpent = totalSpent.Add(costInt)
		remainingFunds = remainingFunds.Sub(cost)
		currentSegmentTokensSold = currentSegmentTokensSold.Add(tokensToBuy)
		
		// Debug: Log updated totals
		sdkCtx.Logger().Info("Updated totals",
			"totalMaincoinPurchased", totalMaincoinPurchased.String(),
			"totalSpent", totalSpent.String(),
			"newRemainingFunds", remainingFunds.String(),
			"currentSegmentTokensSold", currentSegmentTokensSold.String(),
		)
		
		// Record segment purchase
		segments = append(segments, &types.SegmentPurchase{
			SegmentNumber: currentEpoch,
			TokensBought:  tokensToBuy.String(),
			PricePerToken: currentPrice.String(),
			SegmentCost:   costInt.String(),
		})
		
		// Update reserve balance
		currentReserve, err = k.ReserveBalance.Get(ctx)
		if err != nil {
			return nil, err
		}
		
		newReserve := currentReserve.Add(costInt)
		if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
			return nil, err
		}
		
		// Update total supply (without dev allocation yet)
		totalSupply, err = k.TotalSupply.Get(ctx)
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
		
		// Debug: Log segment completion check
		sdkCtx.Logger().Info("Segment completion check",
			"newTokensNeeded_smallest_unit", newTokensNeeded.String(),
			"newTokensNeeded_MC", math.LegacyNewDecFromInt(newTokensNeeded).Quo(math.LegacyNewDec(1000000)).String(),
			"isComplete", newTokensNeeded.IsZero() || newTokensNeeded.IsNegative(),
			"newTotalSupply", newTotalSupply.String(),
			"newReserveBalance", newReserve.String(),
		)
		
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
			
			// Debug: Log segment completion
			sdkCtx.Logger().Info("Segment completed",
				"oldEpoch", currentEpoch,
				"newEpoch", currentEpoch+1,
				"oldPrice_TESTUSD_per_MC", currentPrice.String(),
				"newPrice_TESTUSD_per_MC", newPrice.String(),
				"priceIncrement", params.PriceIncrement.String(),
				"segmentTokensSold_smallest_unit", currentSegmentTokensSold.String(),
			)
			
			// Mark that we're in a new segment
			currentSegmentTokensSold = math.ZeroInt()
			currentSegmentStartEpoch = currentEpoch + 1
		}
		
		segmentCount++
		
		// Debug: Log iteration end state
		sdkCtx.Logger().Info("BuyMaincoin iteration END",
			"iteration", segmentCount,
			"newRemainingFunds_utestusd", remainingFunds.String(),
			"newRemainingFunds_TESTUSD", remainingFunds.Quo(math.LegacyNewDec(1000000)).String(),
			"totalMaincoinPurchased", totalMaincoinPurchased.String(),
			"totalSpent_utestusd", totalSpent.String(),
			"totalSpent_TESTUSD", math.LegacyNewDecFromInt(totalSpent).Quo(math.LegacyNewDec(1000000)).String(),
			"shouldContinue", remainingFunds.IsPositive() && segmentCount < MaxSegmentsPerPurchase,
		)
	}
	
	// Debug: Log purchase summary
	sdkCtx.Logger().Info("MainCoin purchase SUMMARY",
		"totalIterations", segmentCount,
		"originalAmount_utestusd", msg.Amount.Amount.String(),
		"originalAmount_TESTUSD", math.LegacyNewDecFromInt(msg.Amount.Amount).Quo(math.LegacyNewDec(1000000)).String(),
		"totalSpent_utestusd", totalSpent.String(),
		"totalSpent_TESTUSD", math.LegacyNewDecFromInt(totalSpent).Quo(math.LegacyNewDec(1000000)).String(),
		"totalMaincoinPurchased_smallest_unit", totalMaincoinPurchased.String(),
		"totalMaincoinPurchased_MC", math.LegacyNewDecFromInt(totalMaincoinPurchased).Quo(math.LegacyNewDec(1000000)).String(),
		"remainingFunds_utestusd", remainingFunds.String(),
		"remainingFunds_TESTUSD", remainingFunds.Quo(math.LegacyNewDec(1000000)).String(),
		"stoppedReason", fmt.Sprintf("remainingFunds.IsPositive=%v, segmentCount=%d, MaxSegments=%d", 
			remainingFunds.IsPositive(), segmentCount, MaxSegmentsPerPurchase),
	)
	
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
			message = fmt.Sprintf("Purchase completed successfully! Processed %d segments (limit reached). Returned %s %s to your account.", 
				segmentCount, 
				math.LegacyNewDecFromInt(remainingAmount).Quo(math.LegacyNewDec(1000000)).String(), 
				"TESTUSD")
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