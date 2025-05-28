package testusd

import (
        "cosmossdk.io/core/address"
        "cosmossdk.io/core/appmodule"
        "cosmossdk.io/core/store"
        "cosmossdk.io/depinject"
        "cosmossdk.io/depinject/appconfig"
        "cosmossdk.io/log"
        storetypes "cosmossdk.io/store/types"
        "cosmossdk.io/core/event"
        "github.com/cosmos/cosmos-sdk/codec"
        authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
        govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"

        "mychain/x/testusd/keeper"
        "mychain/x/testusd/types"
)

var _ depinject.OnePerModuleType = AppModule{}

// IsOnePerModuleType implements the depinject.OnePerModuleType interface.
func (AppModule) IsOnePerModuleType() {}

func init() {
        appconfig.Register(
                &types.Module{},
                appconfig.Provide(ProvideModule),
        )
}

type ModuleInputs struct {
        depinject.In

        Config       *types.Module
        StoreService store.KVStoreService
        StoreKey     *storetypes.KVStoreKey
        Cdc          codec.Codec
        AddressCodec address.Codec
        Logger       log.Logger
        EventService event.Service

        AccountKeeper types.AccountKeeper
        BankKeeper    types.BankKeeper
}
// End of ModuleInputs

type ModuleOutputs struct {
        depinject.Out

        TestusdKeeper keeper.Keeper
        Module        appmodule.AppModule
}

func ProvideModule(in ModuleInputs) ModuleOutputs {
        // default to governance authority if not provided
        authority := authtypes.NewModuleAddress(govtypes.ModuleName)
        if in.Config.Authority != "" {
                authority = authtypes.NewModuleAddressOrBech32Address(in.Config.Authority)
        }
        k := keeper.NewKeeper(
                in.Cdc,
                in.StoreService,
                in.StoreKey,
                in.Logger,
                authority.String(),
                in.AddressCodec,
                in.AccountKeeper,
                in.BankKeeper,
                in.EventService,
        )
        m := NewAppModule(in.Cdc, k, in.BankKeeper)

        return ModuleOutputs{TestusdKeeper: k, Module: m}
}
