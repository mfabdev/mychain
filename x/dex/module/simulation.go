package dex

import (
	"math/rand"

	"github.com/cosmos/cosmos-sdk/types/module"
	simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	dexsimulation "mychain/x/dex/simulation"
	"mychain/x/dex/types"
)

// GenerateGenesisState creates a randomized GenState of the module.
func (AppModule) GenerateGenesisState(simState *module.SimulationState) {
	accs := make([]string, len(simState.Accounts))
	for i, acc := range simState.Accounts {
		accs[i] = acc.Address.String()
	}
	dexGenesis := types.GenesisState{
		Params: types.DefaultParams(),
	}
	simState.GenState[types.ModuleName] = simState.Cdc.MustMarshalJSON(&dexGenesis)
}

// RegisterStoreDecoder registers a decoder.
func (am AppModule) RegisterStoreDecoder(_ simtypes.StoreDecoderRegistry) {}

// WeightedOperations returns the all the gov module operations with their respective weights.
func (am AppModule) WeightedOperations(simState module.SimulationState) []simtypes.WeightedOperation {
	operations := make([]simtypes.WeightedOperation, 0)
	const (
		opWeightMsgCreateOrder          = "op_weight_msg_dex"
		defaultWeightMsgCreateOrder int = 100
	)

	var weightMsgCreateOrder int
	simState.AppParams.GetOrGenerate(opWeightMsgCreateOrder, &weightMsgCreateOrder, nil,
		func(_ *rand.Rand) {
			weightMsgCreateOrder = defaultWeightMsgCreateOrder
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgCreateOrder,
		dexsimulation.SimulateMsgCreateOrder(am.authKeeper, am.bankKeeper, am.keeper, simState.TxConfig),
	))
	const (
		opWeightMsgCancelOrder          = "op_weight_msg_dex"
		defaultWeightMsgCancelOrder int = 100
	)

	var weightMsgCancelOrder int
	simState.AppParams.GetOrGenerate(opWeightMsgCancelOrder, &weightMsgCancelOrder, nil,
		func(_ *rand.Rand) {
			weightMsgCancelOrder = defaultWeightMsgCancelOrder
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgCancelOrder,
		dexsimulation.SimulateMsgCancelOrder(am.authKeeper, am.bankKeeper, am.keeper, simState.TxConfig),
	))
	const (
		opWeightMsgClaimRewards          = "op_weight_msg_dex"
		defaultWeightMsgClaimRewards int = 100
	)

	var weightMsgClaimRewards int
	simState.AppParams.GetOrGenerate(opWeightMsgClaimRewards, &weightMsgClaimRewards, nil,
		func(_ *rand.Rand) {
			weightMsgClaimRewards = defaultWeightMsgClaimRewards
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgClaimRewards,
		dexsimulation.SimulateMsgClaimRewards(am.authKeeper, am.bankKeeper, am.keeper, simState.TxConfig),
	))

	return operations
}

// ProposalMsgs returns msgs used for governance proposals for simulations.
func (am AppModule) ProposalMsgs(simState module.SimulationState) []simtypes.WeightedProposalMsg {
	return []simtypes.WeightedProposalMsg{}
}
