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
				{
					RpcMethod:      "EstimateFees",
					Use:            "estimate-fees [pair-id] [is-buy-order] [order-amount] [order-price]",
					Short:          "Estimate fees for an order",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{
						{ProtoField: "pair_id"},
						{ProtoField: "is_buy_order"},
						{ProtoField: "order_amount"},
						{ProtoField: "order_price"},
					},
				},
				{
					RpcMethod: "FeeStatistics",
					Use:       "fee-statistics",
					Short:     "Query fee collection statistics",
				},
				{
					RpcMethod:      "LiquidityBalance",
					Use:            "liquidity-balance",
					Short:          "Query liquidity balance and multipliers",
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
					RpcMethod: "CreateOrder",
					Skip:      true, // Skip autocli due to Coin parsing issues
				},
				{
					RpcMethod: "CancelOrder",
					Skip:      true, // Using custom CLI implementation
				},
				{
					RpcMethod: "ClaimRewards",
					Skip:      true, // Using custom CLI implementation
				},
				{
					RpcMethod:      "CreateTradingPair",
					Use:            "create-trading-pair [base-denom] [quote-denom]",
					Short:          "Create a new trading pair (admin only)",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "base_denom"}, {ProtoField: "quote_denom"}},
				},
				{
					RpcMethod:      "InitDexState",
					Use:            "init-dex-state",
					Short:          "Initialize DEX state with default configuration (admin only)",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{},
				},
				{
					RpcMethod:      "UpdateDexParams",
					Use:            "update-dex-params",
					Short:          "Update DEX parameters (admin only)",
					Skip:           true, // We'll implement a custom command for this
				},
				// this line is used by ignite scaffolding # autocli/tx
			},
		},
	}
}
