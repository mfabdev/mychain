package keeper

import (
	"fmt"

	"cosmossdk.io/collections"
	"cosmossdk.io/core/address"
	corestore "cosmossdk.io/core/store"
	"cosmossdk.io/math"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"mychain/x/maincoin/types"
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
	CurrentEpoch         collections.Item[uint64]
	CurrentPrice         collections.Item[math.LegacyDec]
	TotalSupply          collections.Item[math.Int]
	ReserveBalance       collections.Item[math.Int]
	DevAllocationTotal   collections.Item[math.Int]
	PendingDevAllocation collections.Item[math.Int]

	// Segment history tracking
	SegmentHistories collections.Map[uint64, types.SegmentHistory]
	UserHistories    collections.Map[string, types.UserPurchaseHistory]

	// Expected keepers
	bankKeeper types.BankKeeper
}

func NewKeeper(
	storeService corestore.KVStoreService,
	cdc codec.Codec,
	addressCodec address.Codec,
	authority []byte,
	bankKeeper types.BankKeeper,
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
		bankKeeper:   bankKeeper,

		Params:               collections.NewItem(sb, types.ParamsKey, "params", codec.CollValue[types.Params](cdc)),
		CurrentEpoch:         collections.NewItem(sb, types.CurrentEpochKey, "current_epoch", collections.Uint64Value),
		CurrentPrice:         collections.NewItem(sb, types.CurrentPriceKey, "current_price", sdk.LegacyDecValue),
		TotalSupply:          collections.NewItem(sb, types.TotalSupplyKey, "total_supply", sdk.IntValue),
		ReserveBalance:       collections.NewItem(sb, types.ReserveBalanceKey, "reserve_balance", sdk.IntValue),
		DevAllocationTotal:   collections.NewItem(sb, types.DevAllocationTotalKey, "dev_allocation_total", sdk.IntValue),
		PendingDevAllocation: collections.NewItem(sb, collections.NewPrefix(10), "pending_dev_allocation", sdk.IntValue),
		SegmentHistories:     collections.NewMap(sb, collections.NewPrefix(8), "segment_histories", collections.Uint64Key, codec.CollValue[types.SegmentHistory](cdc)),
		UserHistories:        collections.NewMap(sb, collections.NewPrefix(9), "user_histories", collections.StringKey, codec.CollValue[types.UserPurchaseHistory](cdc)),
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
