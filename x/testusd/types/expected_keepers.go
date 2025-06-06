package types

import (
    "context"
    
    sdk "github.com/cosmos/cosmos-sdk/types"
)

// AccountKeeper defines the expected interface for the Account module.
type AccountKeeper interface {
    GetAccount(context.Context, sdk.AccAddress) sdk.AccountI
    SetAccount(context.Context, sdk.AccountI)
    NewAccountWithAddress(ctx context.Context, addr sdk.AccAddress) sdk.AccountI
    GetModuleAddress(name string) sdk.AccAddress
    GetModuleAccount(ctx context.Context, moduleName string) sdk.ModuleAccountI
    SetModuleAccount(context.Context, sdk.ModuleAccountI)
}

// BankKeeper defines the expected interface for the Bank module.
type BankKeeper interface {
    MintCoins(ctx context.Context, moduleName string, amt sdk.Coins) error
    BurnCoins(ctx context.Context, moduleName string, amt sdk.Coins) error
    SendCoinsFromModuleToAccount(ctx context.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins) error
    SendCoinsFromAccountToModule(ctx context.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error
    GetBalance(ctx context.Context, addr sdk.AccAddress, denom string) sdk.Coin
    SpendableCoins(ctx context.Context, addr sdk.AccAddress) sdk.Coins
    GetSupply(ctx context.Context, denom string) sdk.Coin
}

// ParamSubspace defines the expected Subspace interface for parameters.
type ParamSubspace interface {
    Get(context.Context, []byte, interface{})
    Set(context.Context, []byte, interface{})
}

// TransactionKeeper defines the expected interface for transaction recording
type TransactionKeeper interface {
    RecordTransaction(ctx context.Context, address string, txType string, description string, amount sdk.Coins, from string, to string, metadata string) error
}
