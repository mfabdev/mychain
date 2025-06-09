package types

import (
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/msgservice"
)

func RegisterInterfaces(registrar codectypes.InterfaceRegistry) {
	registrar.RegisterImplementations((*sdk.Msg)(nil),
		&MsgClaimRewards{},
	)

	registrar.RegisterImplementations((*sdk.Msg)(nil),
		&MsgCancelOrder{},
	)

	registrar.RegisterImplementations((*sdk.Msg)(nil),
		&MsgCreateOrder{},
	)

	registrar.RegisterImplementations((*sdk.Msg)(nil),
		&MsgUpdateParams{},
	)

	registrar.RegisterImplementations((*sdk.Msg)(nil),
		&MsgCreateTradingPair{},
	)

	registrar.RegisterImplementations((*sdk.Msg)(nil),
		&MsgInitDexState{},
	)

	registrar.RegisterImplementations((*sdk.Msg)(nil),
		&MsgUpdateDexParams{},
	)
	msgservice.RegisterMsgServiceDesc(registrar, &_Msg_serviceDesc)
}
