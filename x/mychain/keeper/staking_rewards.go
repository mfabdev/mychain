package keeper

import (
	"encoding/json"
	"fmt"
	"time"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"mychain/x/mychain/types"
)

const (
	// Annual reward rate: 20% of total supply
	AnnualRewardRate = "0.20"
	// Distribution frequency: every hour (720 blocks at 5s/block)
	BlocksPerHour = 720
	// Blocks per year (365.25 days)
	BlocksPerYear = 6311520
)

// StakingRewardDistribution represents a single distribution event
type StakingRewardDistribution struct {
	Height           int64
	Timestamp        time.Time
	TotalSupply      sdk.Coins
	TotalStaked      sdk.Coins
	RewardsDistributed sdk.Coins
	EffectiveAPR     math.LegacyDec
	NumDelegators    int64
}

// CalculateEffectiveAPR calculates the effective APR based on total supply and staked amount
func (k Keeper) CalculateEffectiveAPR(ctx sdk.Context) (math.LegacyDec, error) {
	// Skip if staking keeper not set
	if k.stakingKeeper == nil {
		return math.LegacyZeroDec(), nil
	}
	
	// Get total supply of ALC
	totalSupply := k.bankKeeper.GetSupply(ctx, "alc")
	if totalSupply.IsZero() {
		return math.LegacyZeroDec(), nil
	}

	// Get total staked amount
	stakingKeeper := k.stakingKeeper
	bondDenom, err := stakingKeeper.BondDenom(ctx)
	if err != nil {
		return math.LegacyZeroDec(), err
	}
	totalStaked, err := stakingKeeper.TotalBondedTokens(ctx)
	if err != nil {
		return math.LegacyZeroDec(), err
	}

	if totalStaked.IsZero() {
		// If nothing is staked, return 0 (rewards won't be distributed)
		return math.LegacyZeroDec(), nil
	}

	// Convert bond denom (ulc) to display denom (alc) if needed
	// 1 alc = 1,000,000 ulc
	if bondDenom == "ulc" {
		totalStaked = totalStaked.Quo(math.NewInt(1000000))
	}

	// Calculate effective APR
	// Effective APR = (Total Supply × 20%) / Total Staked
	annualRate, _ := math.LegacyNewDecFromStr(AnnualRewardRate)
	totalSupplyDec := math.LegacyNewDecFromInt(totalSupply.Amount)
	totalStakedDec := math.LegacyNewDecFromInt(totalStaked)

	effectiveAPR := totalSupplyDec.Mul(annualRate).Quo(totalStakedDec)

	return effectiveAPR, nil
}

// CalculateHourlyRewards calculates rewards to distribute this hour
func (k Keeper) CalculateHourlyRewards(ctx sdk.Context) (sdk.Coins, error) {
	// Get total supply of ALC
	totalSupply := k.bankKeeper.GetSupply(ctx, "alc")
	if totalSupply.IsZero() {
		return sdk.NewCoins(), nil
	}

	// Calculate annual rewards (20% of total supply)
	annualRate, _ := math.LegacyNewDecFromStr(AnnualRewardRate)
	annualRewards := math.LegacyNewDecFromInt(totalSupply.Amount).Mul(annualRate).TruncateInt()

	// Calculate hourly rewards
	hoursPerYear := math.LegacyNewDec(BlocksPerYear).Quo(math.LegacyNewDec(BlocksPerHour))
	hourlyRewards := math.LegacyNewDecFromInt(annualRewards).Quo(hoursPerYear).TruncateInt()

	return sdk.NewCoins(sdk.NewCoin("alc", hourlyRewards)), nil
}

// DistributeStakingRewards distributes rewards to all stakers
func (k Keeper) DistributeStakingRewards(ctx sdk.Context) error {
	// Skip if staking keeper not set
	if k.stakingKeeper == nil {
		return nil
	}
	
	// Check if it's time to distribute (every hour)
	height := ctx.BlockHeight()
	if height%BlocksPerHour != 0 {
		return nil
	}

	// Calculate hourly rewards
	rewards, err := k.CalculateHourlyRewards(ctx)
	if err != nil {
		return err
	}

	if rewards.IsZero() {
		return nil
	}

	// Get staking info for recording
	stakingKeeper := k.stakingKeeper
	totalStaked, err := stakingKeeper.TotalBondedTokens(ctx)
	if err != nil {
		return err
	}
	validators, err := stakingKeeper.GetAllValidators(ctx)
	if err != nil {
		return err
	}
	
	// Count delegators
	delegatorCount := int64(0)
	delegatorMap := make(map[string]bool)
	for _, val := range validators {
		operAddr, _ := sdk.ValAddressFromBech32(val.GetOperator())
		delegations, err := stakingKeeper.GetValidatorDelegations(ctx, operAddr)
		if err != nil {
			continue
		}
		for _, del := range delegations {
			delegatorMap[del.DelegatorAddress] = true
		}
	}
	delegatorCount = int64(len(delegatorMap))

	// Mint the rewards
	err = k.bankKeeper.MintCoins(ctx, types.ModuleName, rewards)
	if err != nil {
		return err
	}

	// Send to distribution module for distribution to stakers
	err = k.bankKeeper.SendCoinsFromModuleToModule(ctx, types.ModuleName, "distribution", rewards)
	if err != nil {
		return err
	}

	// Calculate effective APR for recording
	effectiveAPR, _ := k.CalculateEffectiveAPR(ctx)

	// Record the distribution
	distribution := StakingRewardDistribution{
		Height:             height,
		Timestamp:          ctx.BlockTime(),
		TotalSupply:        sdk.NewCoins(k.bankKeeper.GetSupply(ctx, "alc")),
		TotalStaked:        sdk.NewCoins(sdk.NewCoin("ulc", totalStaked)),
		RewardsDistributed: rewards,
		EffectiveAPR:       effectiveAPR,
		NumDelegators:      delegatorCount,
	}

	// Store distribution record
	k.RecordStakingDistribution(ctx, distribution)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			"staking_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("rewards", rewards.String()),
			sdk.NewAttribute("effective_apr", effectiveAPR.String()),
			sdk.NewAttribute("delegators", fmt.Sprintf("%d", delegatorCount)),
		),
	)

	return nil
}

// RecordStakingDistribution stores a distribution record
func (k Keeper) RecordStakingDistribution(ctx sdk.Context, distribution StakingRewardDistribution) {
	store := k.storeService.OpenKVStore(ctx)
	key := types.GetStakingDistributionKey(distribution.Height)
	
	record := &types.StakingDistributionRecord{
		Height:             distribution.Height,
		Timestamp:          distribution.Timestamp.Unix(),
		TotalSupply:        distribution.TotalSupply.String(),
		TotalStaked:        distribution.TotalStaked.String(),
		RewardsDistributed: distribution.RewardsDistributed.String(),
		EffectiveApr:       distribution.EffectiveAPR.String(),
		NumDelegators:      distribution.NumDelegators,
	}
	
	bz, err := json.Marshal(record)
	if err != nil {
		panic(err)
	}
	
	store.Set(key, bz)
}

// GetStakingDistributionHistory returns distribution history with pagination
func (k Keeper) GetStakingDistributionHistory(ctx sdk.Context, limit, offset uint64) ([]*types.StakingDistributionRecord, error) {
	store := k.storeService.OpenKVStore(ctx)
	prefix := types.StakingDistributionPrefix
	
	var records []*types.StakingDistributionRecord
	count := uint64(0)
	skipped := uint64(0)
	
	// Create an iterator
	iterator, err := store.ReverseIterator(prefix, nil)
	if err != nil {
		return nil, err
	}
	defer iterator.Close()
	
	for ; iterator.Valid() && count < limit; iterator.Next() {
		if skipped < offset {
			skipped++
			continue
		}
		
		var record types.StakingDistributionRecord
		err := json.Unmarshal(iterator.Value(), &record)
		if err != nil {
			continue
		}
		records = append(records, &record)
		count++
	}
	
	return records, nil
}

// GetLatestDistribution returns the most recent distribution record
func (k Keeper) GetLatestDistribution(ctx sdk.Context) (*types.StakingDistributionRecord, error) {
	records, err := k.GetStakingDistributionHistory(ctx, 1, 0)
	if err != nil || len(records) == 0 {
		return nil, err
	}
	return records[0], nil
}