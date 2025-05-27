package dex

import (
	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"

	"mychain/x/dex/types"
)

// AutoCLIOptions implements the autocli.HasAutoCLIConfig interface.
func (am AppModule) AutoCLIOptions() *autocliv1.ModuleOptions {
	return &autocliv1.ModuleOptions{
		Query: &autocliv1.ServiceCommandDescriptor{
			Service: types.Query_serviceDesc.ServiceName,
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				{
					RpcMethod: "Params",
					Use:       "params",
					Short:     "Shows the parameters of the module",
				},
				{
					RpcMethod:      "OrderBook",
					Use:            "order-book [pair-id]",
					Short:          "Query order-book",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "pair_id"}},
				},

				{
					RpcMethod:      "UserRewards",
					Use:            "user-rewards [address]",
					Short:          "Query user-rewards",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "address"}},
				},

				// this line is used by ignite scaffolding # autocli/query
			},
		},
		Tx: &autocliv1.ServiceCommandDescriptor{
			Service:              types.Msg_serviceDesc.ServiceName,
			EnhanceCustomCommand: true, // only required if you want to use the custom command
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				{
					RpcMethod: "UpdateParams",
					Skip:      true, // skipped because authority gated
				},
				{
					RpcMethod:      "CreateOrder",
					Use:            "create-order [pair-id] [price] [amount] [is-buy]",
					Short:          "Send a create-order tx",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "pair_id"}, {ProtoField: "price"}, {ProtoField: "amount"}, {ProtoField: "is_buy"}},
				},
				{
					RpcMethod:      "CancelOrder",
					Use:            "cancel-order [order-id]",
					Short:          "Send a cancel-order tx",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "order_id"}},
				},
				{
					RpcMethod:      "ClaimRewards",
					Use:            "claim-rewards ",
					Short:          "Send a claim-rewards tx",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{},
				},
				// this line is used by ignite scaffolding # autocli/tx
			},
		},
	}
}
