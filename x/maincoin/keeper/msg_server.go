package keeper

import (
	"fmt"
	"mychain/x/maincoin/types"
)

type msgServer struct {
	*Keeper
}

// NewMsgServerImpl returns an implementation of the MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper *Keeper) types.MsgServer {
	fmt.Printf("NewMsgServerImpl: Creating msgServer with keeper %p, transactionKeeper: %v\n", keeper, keeper.transactionKeeper != nil)
	ms := &msgServer{Keeper: keeper}
	fmt.Printf("NewMsgServerImpl: msgServer created, checking access: %v\n", ms.transactionKeeper != nil)
	return ms
}

var _ types.MsgServer = msgServer{}
