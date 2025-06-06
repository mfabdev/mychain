package keeper

import (
    "context"
    "fmt"

    errorsmod "cosmossdk.io/errors"
    "cosmossdk.io/math"
    sdk "github.com/cosmos/cosmos-sdk/types"
    sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
    
    "mychain/x/testusd/types"
)

func (k msgServer) BridgeIn(goCtx context.Context, msg *types.MsgBridgeIn) (*types.MsgBridgeInResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)
    
    // Get module parameters
    params := k.GetParams(ctx)
    
    // Check if bridge is enabled
    if !params.BridgeEnabled {
        return nil, errorsmod.Wrap(types.ErrBridgeDisabled, "bridge is currently disabled")
    }
    
    // Validate the amount
    amount := msg.Amount
    if  amount.IsNegative() || amount.IsZero() {
        return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "invalid amount")
    }
    
    // Get sender address
    sender, err := sdk.AccAddressFromBech32(msg.Sender)
    if err != nil {
        return nil, errorsmod.Wrap(sdkerrors.ErrInvalidAddress, "invalid sender address")
    }
    
    // Create USDC coin (amount being bridged in)
    usdcCoin := sdk.NewCoin(params.UsdcDenom, amount)
    
    // Transfer USDC from sender to module account
    // Note: In a real implementation, this would involve actual USDC bridging
    // For now, we assume the user has USDC tokens in their account
    err = k.bankKeeper.SendCoinsFromAccountToModule(ctx, sender, types.ModuleName, sdk.NewCoins(usdcCoin))
    if err != nil {
        return nil, errorsmod.Wrap(err, "failed to transfer USDC to bridge")
    }
    
    // Calculate TestUSD amount to mint (1:1 ratio)
    pegRatio, err := math.LegacyNewDecFromStr(params.PegRatio)
    if err != nil {
        return nil, errorsmod.Wrap(types.ErrInvalidPegRatio, "invalid peg ratio")
    }
    
    testUsdAmount := math.LegacyNewDecFromInt(amount).Mul(pegRatio).TruncateInt()
    testUsdCoin := sdk.NewCoin(params.TestusdDenom, testUsdAmount)
    
    // Mint TestUSD tokens
    err = k.bankKeeper.MintCoins(ctx, types.ModuleName, sdk.NewCoins(testUsdCoin))
    if err != nil {
        return nil, errorsmod.Wrap(err, "failed to mint TestUSD")
    }
    
    // Send minted TestUSD to the sender
    err = k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, sender, sdk.NewCoins(testUsdCoin))
    if err != nil {
        return nil, errorsmod.Wrap(err, "failed to send TestUSD to user")
    }
    
    // Update total bridged amount
    totalBridged := k.GetTotalBridged(ctx)
    k.SetTotalBridged(ctx, totalBridged.Add(amount))
    
    // Update total supply
    totalSupply := k.GetTotalSupply(ctx)
    k.SetTotalSupply(ctx, totalSupply.Add(testUsdAmount))
    
    // Update statistics
    stats := k.GetBridgeStatistics(ctx)
    stats.TotalBridgeInCount++
    stats.LastBridgeInTimestamp = ctx.BlockTime().Unix()
    k.SetBridgeStatistics(ctx, stats)
    
    // Record transaction
    if tk := k.GetTransactionKeeper(); tk != nil {
        description := fmt.Sprintf("Bridged in %s, received %s", usdcCoin.String(), testUsdCoin.String())
        metadata := fmt.Sprintf(`{"usdc_amount":"%s","testusd_amount":"%s","peg_ratio":"%s"}`, usdcCoin.String(), testUsdCoin.String(), pegRatio.String())
        
        if err := tk.RecordTransaction(ctx, msg.Sender, "bridge_in", description, sdk.NewCoins(testUsdCoin), "external_bridge", msg.Sender, metadata); err != nil {
            k.Logger(ctx).Error("failed to record transaction", "error", err)
        }
    }

    // Emit event
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            types.EventTypeBridgeIn,
            sdk.NewAttribute(types.AttributeKeySender, msg.Sender),
            sdk.NewAttribute(types.AttributeKeyAmount, msg.Amount.String()),
            sdk.NewAttribute(types.AttributeKeyMintedAmount, testUsdCoin.String()),
        ),
    )
    
    k.Logger(ctx).Info("Bridge in successful",
        "sender", msg.Sender,
        "usdc_amount", usdcCoin.String(),
        "testusd_amount", testUsdCoin.String(),
    )
    
    return &types.MsgBridgeInResponse{
        MintedAmount: testUsdCoin,
    }, nil
}
