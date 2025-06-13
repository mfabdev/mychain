package keeper

import (
	"context"
	"fmt"

	"cosmossdk.io/collections"
	"cosmossdk.io/core/address"
	corestore "cosmossdk.io/core/store"
	"cosmossdk.io/log"
	"cosmossdk.io/math"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"mychain/x/dex/types"
)

type Keeper struct {
	storeService corestore.KVStoreService
	cdc          codec.Codec
	addressCodec address.Codec
	// Address capable of executing a MsgUpdateParams message.
	// Typically, this should be the x/gov module account.
	authority []byte

	Schema collections.Schema
	Params collections.Item[types.Params]
	
	// State management
	NextOrderID      collections.Sequence
	Orders           collections.Map[uint64, types.Order]
	TradingPairs     collections.Map[uint64, types.TradingPair]
	UserRewards      collections.Map[string, types.UserReward]
	OrderRewards     collections.Map[uint64, types.OrderRewardInfo]
	LiquidityTiers   collections.Map[uint32, types.LiquidityTier]
	VolumeTrackers   collections.Map[uint64, types.VolumeTracker]
	PriceReferences  collections.Map[uint64, types.PriceReference]
	LCTotalSupply    collections.Item[math.Int]
	DynamicRewardState collections.Item[types.DynamicRewardState]
	
	// Indexes
	UserOrders       collections.Map[collections.Pair[string, uint64], uint64] // (user, orderID) -> orderID
	PairOrders       collections.Map[collections.Pair[uint64, uint64], uint64] // (pairID, orderID) -> orderID
	
	// Expected keepers
	authKeeper types.AuthKeeper
	bankKeeper types.BankKeeper
	transactionKeeper types.TransactionKeeper
	distrKeeper types.DistributionKeeper
}

func NewKeeper(
	storeService corestore.KVStoreService,
	cdc codec.Codec,
	addressCodec address.Codec,
	authority []byte,
	authKeeper types.AuthKeeper,
	bankKeeper types.BankKeeper,
	transactionKeeper types.TransactionKeeper,
	distrKeeper types.DistributionKeeper,
) Keeper {
	if _, err := addressCodec.BytesToString(authority); err != nil {
		panic(fmt.Sprintf("invalid authority address %s: %s", authority, err))
	}

	sb := collections.NewSchemaBuilder(storeService)

	k := Keeper{
		storeService: storeService,
		cdc:          cdc,
		addressCodec: addressCodec,
		authority:    authority,
		authKeeper:   authKeeper,
		bankKeeper:   bankKeeper,
		transactionKeeper: transactionKeeper,
		distrKeeper:  distrKeeper,

		Params:          collections.NewItem(sb, types.ParamsKey, "params", codec.CollValue[types.Params](cdc)),
		NextOrderID:     collections.NewSequence(sb, types.NextOrderIDKey, "next_order_id"),
		Orders:          collections.NewMap(sb, types.OrdersKey, "orders", collections.Uint64Key, codec.CollValue[types.Order](cdc)),
		TradingPairs:    collections.NewMap(sb, types.TradingPairsKey, "trading_pairs", collections.Uint64Key, codec.CollValue[types.TradingPair](cdc)),
		UserRewards:     collections.NewMap(sb, types.UserRewardsKey, "user_rewards", collections.StringKey, codec.CollValue[types.UserReward](cdc)),
		OrderRewards:    collections.NewMap(sb, types.OrderRewardsKey, "order_rewards", collections.Uint64Key, codec.CollValue[types.OrderRewardInfo](cdc)),
		LiquidityTiers:  collections.NewMap(sb, types.LiquidityTiersKey, "liquidity_tiers", collections.Uint32Key, codec.CollValue[types.LiquidityTier](cdc)),
		VolumeTrackers:  collections.NewMap(sb, types.VolumeTrackersKey, "volume_trackers", collections.Uint64Key, codec.CollValue[types.VolumeTracker](cdc)),
		PriceReferences: collections.NewMap(sb, types.PriceReferencesKey, "price_references", collections.Uint64Key, codec.CollValue[types.PriceReference](cdc)),
		LCTotalSupply:      collections.NewItem(sb, types.LCTotalSupplyKey, "lc_total_supply", sdk.IntValue),
		DynamicRewardState: collections.NewItem(sb, types.DynamicRewardStateKey, "dynamic_reward_state", codec.CollValue[types.DynamicRewardState](cdc)),
		UserOrders:         collections.NewMap(sb, types.UserOrdersKey, "user_orders", collections.PairKeyCodec(collections.StringKey, collections.Uint64Key), collections.Uint64Value),
		PairOrders:         collections.NewMap(sb, types.PairOrdersKey, "pair_orders", collections.PairKeyCodec(collections.Uint64Key, collections.Uint64Key), collections.Uint64Value),
	}

	schema, err := sb.Build()
	if err != nil {
		panic(err)
	}
	k.Schema = schema

	return k
}

// GetAuthority returns the module's authority.
func (k Keeper) GetAuthority() []byte {
	return k.authority
}

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx context.Context) log.Logger {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	return sdkCtx.Logger().With("module", "x/"+types.ModuleName)
}

// SetTransactionKeeper sets the transaction keeper
func (k *Keeper) SetTransactionKeeper(tk types.TransactionKeeper) {
	k.transactionKeeper = tk
}

// GetTransactionKeeper returns the transaction keeper
func (k Keeper) GetTransactionKeeper() types.TransactionKeeper {
	return k.transactionKeeper
}
