package keeper

import (
	"mychain/x/dex/types"
)

type msgServer struct {
	Keeper
	authority string
}

// NewMsgServerImpl returns an implementation of the MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	authority, err := keeper.addressCodec.BytesToString(keeper.GetAuthority())
	if err != nil {
		panic(err)
	}
	return &msgServer{
		Keeper:    keeper,
		authority: authority,
	}
}

var _ types.MsgServer = msgServer{}
