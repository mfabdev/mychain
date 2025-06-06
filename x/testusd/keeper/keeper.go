package keeper

import (
    "context"

    "cosmossdk.io/core/event"
    "cosmossdk.io/core/store"
    "cosmossdk.io/log"
    "github.com/cosmos/cosmos-sdk/codec"
    sdk "github.com/cosmos/cosmos-sdk/types"
    
    "mychain/x/testusd/types"
	"cosmossdk.io/core/address"
	"cosmossdk.io/collections"
)

type Keeper struct {
    cdc          codec.BinaryCodec
    storeService store.KVStoreService
    logger       log.Logger
    authority    string
    addressCodec address.Codec
    
    // keepers
    accountKeeper types.AccountKeeper
    bankKeeper    types.BankKeeper
    eventService  event.Service
    Params        collections.Item[types.Params]
    transactionKeeper types.TransactionKeeper
}

// NewKeeper creates a new testusd Keeper instance
func NewKeeper(
    cdc codec.BinaryCodec,
    storeService store.KVStoreService,
    logger log.Logger,
    authority string,
    addressCodec address.Codec,
    ak types.AccountKeeper,
    bk types.BankKeeper,
    eventService event.Service,
) Keeper {
    return Keeper{
        cdc:           cdc,
        storeService:  storeService,
        logger:        logger,
        authority:     authority,
        addressCodec:  addressCodec,
        accountKeeper: ak,
        bankKeeper:    bk,
        eventService:  eventService,
    }
}

// GetAuthority returns the module's authority.
func (k Keeper) GetAuthority() string {
    return k.authority
}

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx context.Context) log.Logger {
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    return sdkCtx.Logger().With(log.ModuleKey, "x/"+types.ModuleName)
}


// GetParams returns the module parameters.
func (k Keeper) GetParams(ctx context.Context) (params types.Params) {
    params, _ = k.Params.Get(ctx)
    return params
}

// SetParams sets the module parameters.
func (k Keeper) SetParams(ctx context.Context, params types.Params) error {
    return k.Params.Set(ctx, params)
}

// SetTransactionKeeper sets the transaction keeper
func (k *Keeper) SetTransactionKeeper(tk types.TransactionKeeper) {
    k.transactionKeeper = tk
}

// GetTransactionKeeper returns the transaction keeper
func (k Keeper) GetTransactionKeeper() types.TransactionKeeper {
    return k.transactionKeeper
}
