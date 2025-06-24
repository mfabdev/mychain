package keeper

import (
	"context"
	"fmt"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"mychain/x/mychain/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// StakingInfo returns current staking information including effective APR
func (k Keeper) StakingInfo(goCtx context.Context, req *types.QueryStakingInfoRequest) (*types.QueryStakingInfoResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)
	
	// Return empty info if staking keeper not set
	if k.stakingKeeper == nil {
		return &types.QueryStakingInfoResponse{
			Info: &types.StakingInfo{
				TotalSupply:      "0alc",
				TotalStaked:      "0alc",
				EffectiveApr:     "0",
				AnnualRewards:    "0alc",
				HourlyRewards:    "0alc",
				NumDelegators:    0,
				NextDistributionHeight: 0,
			},
		}, nil
	}

	// Calculate effective APR
	effectiveAPR, err := k.CalculateEffectiveAPR(ctx)
	if err != nil {
		return nil, err
	}

	// Get total supply
	totalSupply := k.bankKeeper.GetSupply(ctx, "alc")

	// Get total staked
	totalStaked, err := k.stakingKeeper.TotalBondedTokens(ctx)
	if err != nil {
		return nil, err
	}
	bondDenom, err := k.stakingKeeper.BondDenom(ctx)
	if err != nil {
		return nil, err
	}
	
	// Convert if needed
	stakedDisplay := totalStaked
	if bondDenom == "ulc" {
		stakedDisplay = totalStaked.Quo(math.NewInt(1000000))
	}

	// Calculate annual and hourly rewards (20% of total supply)
	annualRate, _ := math.LegacyNewDecFromStr(AnnualRewardRate)
	annualRewards := math.LegacyNewDecFromInt(totalSupply.Amount).Mul(annualRate).TruncateInt()
	
	hoursPerYear := math.LegacyNewDec(BlocksPerYear).Quo(math.LegacyNewDec(BlocksPerHour))
	hourlyRewards := math.LegacyNewDecFromInt(annualRewards).Quo(hoursPerYear).TruncateInt()

	// Count delegators
	validators, err := k.stakingKeeper.GetAllValidators(ctx)
	if err != nil {
		return nil, err
	}
	delegatorMap := make(map[string]bool)
	for _, val := range validators {
		operAddr, _ := sdk.ValAddressFromBech32(val.GetOperator())
		delegations, err := k.stakingKeeper.GetValidatorDelegations(ctx, operAddr)
		if err != nil {
			continue
		}
		for _, del := range delegations {
			delegatorMap[del.DelegatorAddress] = true
		}
	}

	// Calculate next distribution height
	currentHeight := ctx.BlockHeight()
	nextDistribution := ((currentHeight / BlocksPerHour) + 1) * BlocksPerHour

	info := &types.StakingInfo{
		TotalSupply:      totalSupply.String(),
		TotalStaked:      fmt.Sprintf("%salc", stakedDisplay.String()),
		EffectiveApr:     effectiveAPR.String(),
		AnnualRewards:    fmt.Sprintf("%salc", annualRewards.String()),
		HourlyRewards:    fmt.Sprintf("%salc", hourlyRewards.String()),
		NumDelegators:    int64(len(delegatorMap)),
		NextDistributionHeight: nextDistribution,
	}

	return &types.QueryStakingInfoResponse{Info: info}, nil
}

// StakingDistributionHistory returns the history of staking distributions
func (k Keeper) StakingDistributionHistory(goCtx context.Context, req *types.QueryStakingDistributionHistoryRequest) (*types.QueryStakingDistributionHistoryResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	limit := uint64(20)
	offset := uint64(0)
	
	if req.Limit > 0 && req.Limit <= 100 {
		limit = req.Limit
	}
	if req.Offset > 0 {
		offset = req.Offset
	}

	records, err := k.GetStakingDistributionHistory(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	
	// Records are already pointers, just use them directly

	return &types.QueryStakingDistributionHistoryResponse{
		Distributions: records,
		Total:         uint64(len(records)),
	}, nil
}