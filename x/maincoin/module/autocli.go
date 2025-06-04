package maincoin

import (
	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"

	"mychain/x/maincoin/types"
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
					RpcMethod:      "CurrentPrice",
					Use:            "current-price",
					Short:          "Query current-price",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{},
				},

				{
					RpcMethod:      "SegmentInfo",
					Use:            "segment-info",
					Short:          "Query segment-info",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{},
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
					RpcMethod: "BuyMaincoin",
					Skip:      true, // using custom handler
				},
				{
					RpcMethod: "SellMaincoin",
					Skip:      true, // using custom handler
				},
				// this line is used by ignite scaffolding # autocli/tx
			},
		},
	}
}
