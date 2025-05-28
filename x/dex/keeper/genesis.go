package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/collections"
)

// InitGenesis initializes the module's state from a provided genesis state.
func (k Keeper) InitGenesis(ctx context.Context, genState types.GenesisState) error {
	if err := genState.Validate(); err != nil {
		return err
	}
	
	if err := k.Params.Set(ctx, genState.Params); err != nil {
		return err
	}
	
	// Set next order ID
	if err := k.NextOrderID.Set(ctx, genState.NextOrderId); err != nil {
		return err
	}
	
	// Set trading pairs
	for _, pair := range genState.TradingPairs {
		if err := k.TradingPairs.Set(ctx, pair.Id, pair); err != nil {
			return err
		}
	}
	
	// Set orders
	for _, order := range genState.Orders {
		if err := k.Orders.Set(ctx, order.Id, order); err != nil {
			return err
		}
		
		// Set indexes
		userOrderKey := collections.Join(order.Maker, order.Id)
		if err := k.UserOrders.Set(ctx, userOrderKey, order.Id); err != nil {
			return err
		}
		
		pairOrderKey := collections.Join(order.PairId, order.Id)
		if err := k.PairOrders.Set(ctx, pairOrderKey, order.Id); err != nil {
			return err
		}
	}
	
	// Set user rewards
	for _, userReward := range genState.UserRewards {
		if err := k.UserRewards.Set(ctx, userReward.Address, userReward); err != nil {
			return err
		}
	}
	
	// Set liquidity tiers
	for _, tier := range genState.LiquidityTiers {
		if err := k.LiquidityTiers.Set(ctx, tier.Id, tier); err != nil {
			return err
		}
	}
	
	// Set order rewards
	for _, orderReward := range genState.OrderRewards {
		if err := k.OrderRewards.Set(ctx, orderReward.OrderId, orderReward); err != nil {
			return err
		}
	}
	
	// Set price references
	for _, priceRef := range genState.PriceReferences {
		if err := k.PriceReferences.Set(ctx, priceRef.PairId, priceRef); err != nil {
			return err
		}
	}
	
	// Set volume trackers
	for _, volumeTracker := range genState.VolumeTrackers {
		if err := k.VolumeTrackers.Set(ctx, volumeTracker.PairId, volumeTracker); err != nil {
			return err
		}
	}
	
	return nil
}

// ExportGenesis returns the module's exported genesis.
func (k Keeper) ExportGenesis(ctx context.Context) (*types.GenesisState, error) {
	genesis := &types.GenesisState{}
	
	// Get params
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	genesis.Params = params
	
	// Get next order ID
	nextOrderID, err := k.NextOrderID.Peek(ctx)
	if err != nil {
		// If not set, use 1
		nextOrderID = 1
	}
	genesis.NextOrderId = nextOrderID
	
	// Get trading pairs
	genesis.TradingPairs = []types.TradingPair{}
	err = k.TradingPairs.Walk(ctx, nil, func(id uint64, pair types.TradingPair) (bool, error) {
		genesis.TradingPairs = append(genesis.TradingPairs, pair)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	// Get orders
	genesis.Orders = []types.Order{}
	err = k.Orders.Walk(ctx, nil, func(id uint64, order types.Order) (bool, error) {
		genesis.Orders = append(genesis.Orders, order)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	// Get user rewards
	genesis.UserRewards = []types.UserReward{}
	err = k.UserRewards.Walk(ctx, nil, func(address string, rewards types.UserReward) (bool, error) {
		genesis.UserRewards = append(genesis.UserRewards, rewards)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	// Get liquidity tiers
	genesis.LiquidityTiers = []types.LiquidityTier{}
	err = k.LiquidityTiers.Walk(ctx, nil, func(id uint32, tier types.LiquidityTier) (bool, error) {
		genesis.LiquidityTiers = append(genesis.LiquidityTiers, tier)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	// Get order rewards
	genesis.OrderRewards = []types.OrderRewardInfo{}
	err = k.OrderRewards.Walk(ctx, nil, func(orderId uint64, rewards types.OrderRewardInfo) (bool, error) {
		genesis.OrderRewards = append(genesis.OrderRewards, rewards)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	// Get price references
	genesis.PriceReferences = []types.PriceReference{}
	err = k.PriceReferences.Walk(ctx, nil, func(pairId uint64, priceRef types.PriceReference) (bool, error) {
		genesis.PriceReferences = append(genesis.PriceReferences, priceRef)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	// Get volume trackers
	genesis.VolumeTrackers = []types.VolumeTracker{}
	err = k.VolumeTrackers.Walk(ctx, nil, func(pairId uint64, tracker types.VolumeTracker) (bool, error) {
		genesis.VolumeTrackers = append(genesis.VolumeTrackers, tracker)
		return false, nil
	})
	if err != nil {
		return nil, err
	}
	
	return genesis, nil
}
