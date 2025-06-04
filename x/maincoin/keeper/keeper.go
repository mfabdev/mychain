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
	CurrentEpoch       collections.Item[uint64]
	CurrentPrice       collections.Item[math.LegacyDec]
	TotalSupply        collections.Item[math.Int]
	ReserveBalance     collections.Item[math.Int]
	DevAllocationTotal collections.Item[math.Int]
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

		Params:             collections.NewItem(sb, types.ParamsKey, "params", codec.CollValue[types.Params](cdc)),
		CurrentEpoch:       collections.NewItem(sb, types.CurrentEpochKey, "current_epoch", collections.Uint64Value),
		CurrentPrice:       collections.NewItem(sb, types.CurrentPriceKey, "current_price", sdk.LegacyDecValue),
		TotalSupply:        collections.NewItem(sb, types.TotalSupplyKey, "total_supply", sdk.IntValue),
		ReserveBalance:     collections.NewItem(sb, types.ReserveBalanceKey, "reserve_balance", sdk.IntValue),
		DevAllocationTotal: collections.NewItem(sb, types.DevAllocationTotalKey, "dev_allocation_total", sdk.IntValue),
		PendingDevAllocation: collections.NewItem(sb, collections.NewPrefix(10), "pending_dev_allocation", sdk.IntValue),
		SegmentHistories:   collections.NewMap(sb, collections.NewPrefix(8), "segment_histories", collections.Uint64Key, codec.CollValue[types.SegmentHistory](cdc)),
		UserHistories:      collections.NewMap(sb, collections.NewPrefix(9), "user_histories", collections.StringKey, codec.CollValue[types.UserPurchaseHistory](cdc)),
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

// EnsureInitialized ensures all collections have values, setting defaults if needed
func (k Keeper) EnsureInitialized(ctx sdk.Context) error {
	// Only set defaults if params don't exist at all (error from Get)
	params, err := k.Params.Get(ctx)
	
	if err != nil {
		fmt.Printf("MAINCOIN DEBUG: Params not found, setting defaults at height %d\n", ctx.BlockHeight())
		// Set default params
		defaultParams := types.DefaultParams()
		fmt.Printf("MAINCOIN DEBUG: Default params: %+v\n", defaultParams)
		if err := k.Params.Set(ctx, defaultParams); err != nil {
			fmt.Printf("MAINCOIN DEBUG: Failed to set params: %v\n", err)
			return err
		}
		params = defaultParams
		fmt.Printf("MAINCOIN DEBUG: Successfully set default params\n")
	}
	
	// Check if CurrentEpoch exists, if not set to 1
	_, err = k.CurrentEpoch.Get(ctx)
	if err != nil {
		if err := k.CurrentEpoch.Set(ctx, 1); err != nil {
			return err
		}
	}
	
	// Check if CurrentPrice exists, if not set to initial price from params
	_, err = k.CurrentPrice.Get(ctx)
	if err != nil {
		// Calculate price for epoch 1 (initial_price * 1.001)
		price := params.InitialPrice.Mul(math.LegacyNewDecWithPrec(1001, 3))
		if err := k.CurrentPrice.Set(ctx, price); err != nil {
			return err
		}
	}
	
	// Check if TotalSupply exists, if not set to 100000000000 (100000 * 10^6)
	_, err = k.TotalSupply.Get(ctx)
	if err != nil {
		if err := k.TotalSupply.Set(ctx, math.NewInt(100000000000)); err != nil {
			return err
		}
	}
	
	// Check if ReserveBalance exists, if not set to 1000000 (1 * 10^6)
	_, err = k.ReserveBalance.Get(ctx)
	if err != nil {
		if err := k.ReserveBalance.Set(ctx, math.NewInt(1000000)); err != nil {
			return err
		}
	}
	
	// Check if DevAllocationTotal exists, if not set to 0
	_, err = k.DevAllocationTotal.Get(ctx)
	if err != nil {
		if err := k.DevAllocationTotal.Set(ctx, math.ZeroInt()); err != nil {
			return err
		}
	}
	
	return nil
}
