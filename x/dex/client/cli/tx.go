package cli

import (
	"fmt"
	"strconv"

	"cosmossdk.io/math"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/spf13/cobra"
	
	"mychain/x/dex/types"
)

// GetTxCmd returns the transaction commands for this module
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      fmt.Sprintf("%s transactions subcommands", types.ModuleName),
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdCreateTradingPair(),
		CmdInitDexState(),
		CmdCreateOrder(),
		CmdCancelOrder(),
		CmdClaimRewards(),
		CmdUpdateDexParams(),
	)

	return cmd
}

// CmdCreateTradingPair returns a CLI command to create a trading pair
func CmdCreateTradingPair() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-trading-pair [base-denom] [quote-denom]",
		Short: "Create a new trading pair",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			msg := &types.MsgCreateTradingPair{
				Authority:  clientCtx.GetFromAddress().String(),
				BaseDenom:  args[0],
				QuoteDenom: args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)

	return cmd
}

// CmdInitDexState returns a CLI command to initialize DEX state
func CmdInitDexState() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "init-dex-state",
		Short: "Initialize DEX state with default configuration",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			msg := &types.MsgInitDexState{
				Authority: clientCtx.GetFromAddress().String(),
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)

	return cmd
}

// CmdCreateOrder returns a CLI command to create an order
func CmdCreateOrder() *cobra.Command {
	var (
		priceStr  string
		amountStr string
		isBuy     bool
	)

	cmd := &cobra.Command{
		Use:   "create-order [pair-id]",
		Short: "Create a new order",
		Long: `Create a new order on the DEX.
Examples:
  # Buy 10 MC for 0.0001 TUSD each (total 0.001 TUSD)
  mychaind tx dex create-order 1 --price 100utusd --amount 10000000umc --is-buy --from mykey
  
  # Sell 5 MC for 0.00015 TUSD each
  mychaind tx dex create-order 1 --price 150utusd --amount 5000000umc --from mykey`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			pairID, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				return fmt.Errorf("invalid pair ID: %w", err)
			}

			price, err := sdk.ParseCoinNormalized(priceStr)
			if err != nil {
				return fmt.Errorf("invalid price: %w", err)
			}

			amount, err := sdk.ParseCoinNormalized(amountStr)
			if err != nil {
				return fmt.Errorf("invalid amount: %w", err)
			}

			msg := &types.MsgCreateOrder{
				Maker:  clientCtx.GetFromAddress().String(),
				PairId: pairID,
				Price:  price,
				Amount: amount,
				IsBuy:  isBuy,
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	cmd.Flags().StringVar(&priceStr, "price", "", "Order price as a coin (e.g., 100utusd)")
	cmd.Flags().StringVar(&amountStr, "amount", "", "Order amount as a coin (e.g., 10000000umc)")
	cmd.Flags().BoolVar(&isBuy, "is-buy", false, "Whether this is a buy order (omit for sell order)")
	
	cmd.MarkFlagRequired("price")
	cmd.MarkFlagRequired("amount")

	flags.AddTxFlagsToCmd(cmd)

	return cmd
}

// CmdCancelOrder returns a CLI command to cancel an order
func CmdCancelOrder() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "cancel-order [order-id]",
		Short: "Cancel an existing order",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			orderID, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				return fmt.Errorf("invalid order ID: %w", err)
			}

			msg := &types.MsgCancelOrder{
				Maker:   clientCtx.GetFromAddress().String(),
				OrderId: orderID,
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)

	return cmd
}

// CmdClaimRewards returns a CLI command to claim rewards
func CmdClaimRewards() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "claim-rewards",
		Short: "Claim accumulated DEX rewards",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			msg := &types.MsgClaimRewards{
				User: clientCtx.GetFromAddress().String(),
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)

	return cmd
}

// CmdUpdateDexParams returns a CLI command to update DEX parameters
func CmdUpdateDexParams() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-dex-params",
		Short: "Update DEX parameters (admin only)",
		Long: `Update DEX parameters including reward rate, fees, and limits.
Example:
  mychaind tx dex update-dex-params \
    --base-reward-rate 222 \
    --base-transfer-fee-percentage 0.005 \
    --min-order-amount 1000000 \
    --lc-initial-supply 100000 \
    --lc-exchange-rate 0.0001 \
    --from admin`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			// Get flags
			baseRewardRate, _ := cmd.Flags().GetString("base-reward-rate")
			baseFeePercentage, _ := cmd.Flags().GetString("base-transfer-fee-percentage")
			minOrderAmount, _ := cmd.Flags().GetString("min-order-amount")
			lcInitialSupply, _ := cmd.Flags().GetString("lc-initial-supply")
			lcExchangeRate, _ := cmd.Flags().GetString("lc-exchange-rate")

			// Start with default params to get all fee settings
			params := types.DefaultParams()

			// Override with provided flags
			if baseRewardRate != "" {
				rate, ok := math.NewIntFromString(baseRewardRate)
				if !ok {
					return fmt.Errorf("invalid base reward rate: %s", baseRewardRate)
				}
				params.BaseRewardRate = rate
			}

			if baseFeePercentage != "" {
				fee, err := math.LegacyNewDecFromStr(baseFeePercentage)
				if err != nil {
					return fmt.Errorf("invalid base fee percentage: %w", err)
				}
				params.BaseTransferFeePercentage = fee
			}

			if minOrderAmount != "" {
				amount, ok := math.NewIntFromString(minOrderAmount)
				if !ok {
					return fmt.Errorf("invalid min order amount: %s", minOrderAmount)
				}
				params.MinOrderAmount = amount
			}

			if lcInitialSupply != "" {
				supply, ok := math.NewIntFromString(lcInitialSupply)
				if !ok {
					return fmt.Errorf("invalid LC initial supply: %s", lcInitialSupply)
				}
				params.LcInitialSupply = supply
			}

			if lcExchangeRate != "" {
				rate, err := math.LegacyNewDecFromStr(lcExchangeRate)
				if err != nil {
					return fmt.Errorf("invalid LC exchange rate: %w", err)
				}
				params.LcExchangeRate = rate
			}

			// Handle fee parameters
			feesEnabled, _ := cmd.Flags().GetBool("fees-enabled")
			params.FeesEnabled = feesEnabled

			baseMakerFee, _ := cmd.Flags().GetString("base-maker-fee")
			if baseMakerFee != "" {
				fee, err := math.LegacyNewDecFromStr(baseMakerFee)
				if err != nil {
					return fmt.Errorf("invalid base maker fee: %w", err)
				}
				params.BaseMakerFeePercentage = fee
			}

			baseTakerFee, _ := cmd.Flags().GetString("base-taker-fee")
			if baseTakerFee != "" {
				fee, err := math.LegacyNewDecFromStr(baseTakerFee)
				if err != nil {
					return fmt.Errorf("invalid base taker fee: %w", err)
				}
				params.BaseTakerFeePercentage = fee
			}

			baseCancelFee, _ := cmd.Flags().GetString("base-cancel-fee")
			if baseCancelFee != "" {
				fee, err := math.LegacyNewDecFromStr(baseCancelFee)
				if err != nil {
					return fmt.Errorf("invalid base cancel fee: %w", err)
				}
				params.BaseCancelFeePercentage = fee
			}

			baseSellFee, _ := cmd.Flags().GetString("base-sell-fee")
			if baseSellFee != "" {
				fee, err := math.LegacyNewDecFromStr(baseSellFee)
				if err != nil {
					return fmt.Errorf("invalid base sell fee: %w", err)
				}
				params.BaseSellFeePercentage = fee
			}

			feeIncrement, _ := cmd.Flags().GetString("fee-increment")
			if feeIncrement != "" {
				inc, err := math.LegacyNewDecFromStr(feeIncrement)
				if err != nil {
					return fmt.Errorf("invalid fee increment: %w", err)
				}
				params.FeeIncrementPercentage = inc
			}

			priceThreshold, _ := cmd.Flags().GetString("price-threshold")
			if priceThreshold != "" {
				threshold, err := math.LegacyNewDecFromStr(priceThreshold)
				if err != nil {
					return fmt.Errorf("invalid price threshold: %w", err)
				}
				params.PriceThresholdPercentage = threshold
			}

			msg := &types.MsgUpdateDexParams{
				Authority: clientCtx.GetFromAddress().String(),
				Params:    params,
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	cmd.Flags().String("base-reward-rate", "", "Base reward rate for LC (222 = 7% annual)")
	cmd.Flags().String("base-transfer-fee-percentage", "", "Base transfer fee percentage (e.g., 0.005 for 0.5%)")
	cmd.Flags().String("min-order-amount", "", "Minimum order amount in smallest units")
	cmd.Flags().String("lc-initial-supply", "", "LC initial supply")
	cmd.Flags().String("lc-exchange-rate", "", "LC exchange rate")
	cmd.Flags().Bool("fees-enabled", true, "Enable or disable fees")
	cmd.Flags().String("base-maker-fee", "", "Base maker fee percentage (e.g., 0.0001 for 0.01%)")
	cmd.Flags().String("base-taker-fee", "", "Base taker fee percentage (e.g., 0.0005 for 0.05%)")
	cmd.Flags().String("base-cancel-fee", "", "Base cancel fee percentage (e.g., 0.0001 for 0.01%)")
	cmd.Flags().String("base-sell-fee", "", "Base sell fee percentage (e.g., 0.0001 for 0.01%)")
	cmd.Flags().String("fee-increment", "", "Fee increment per 10bp drop (e.g., 0.0001 for 0.01%)")
	cmd.Flags().String("price-threshold", "", "Price threshold for dynamic fees (e.g., 0.98 for 98%)")

	flags.AddTxFlagsToCmd(cmd)

	return cmd
}