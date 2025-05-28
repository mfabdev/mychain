package keeper

import (
    "context"

    errorsmod "cosmossdk.io/errors"
    "cosmossdk.io/math"
    sdk "github.com/cosmos/cosmos-sdk/types"
    sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
    
    "mychain/x/testusd/types"
)

func (k msgServer) BridgeOut(goCtx context.Context, msg *types.MsgBridgeOut) (*types.MsgBridgeOutResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)
    
    // Get module parameters
    params := k.GetParams(ctx)
    
    // Check if bridge is enabled
    if !params.BridgeEnabled {
        return nil, errorsmod.Wrap(types.ErrBridgeDisabled, "bridge is currently disabled")
    }
    
    // Validate the amount
    amount := msg.Amount
    if amount.IsNegative() || amount.IsZero() {
        return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "invalid amount")
    }
    
    // Get sender address
    sender, err := sdk.AccAddressFromBech32(msg.Sender)
    if err != nil {
        return nil, errorsmod.Wrap(sdkerrors.ErrInvalidAddress, "invalid sender address")
    }
    
    // Create TestUSD coin (amount being burned)
    testUsdCoin := sdk.NewCoin(params.TestusdDenom, amount)
    
    // Check if user has enough TestUSD
    balance := k.bankKeeper.GetBalance(ctx, sender, params.TestusdDenom)
    if balance.Amount.LT(amount) {
        return nil, errorsmod.Wrap(types.ErrInsufficientBalance, "insufficient TestUSD balance")
    }
    
    // Transfer TestUSD from sender to module account
    err = k.bankKeeper.SendCoinsFromAccountToModule(ctx, sender, types.ModuleName, sdk.NewCoins(testUsdCoin))
    if err != nil {
        return nil, errorsmod.Wrap(err, "failed to transfer TestUSD to module")
    }
    
    // Burn the TestUSD tokens
    err = k.bankKeeper.BurnCoins(ctx, types.ModuleName, sdk.NewCoins(testUsdCoin))
    if err != nil {
        return nil, errorsmod.Wrap(err, "failed to burn TestUSD")
    }
    
    // Calculate USDC amount to release (1:1 ratio)
    pegRatio, err := math.LegacyNewDecFromStr(params.PegRatio)
    if err != nil {
        return nil, errorsmod.Wrap(types.ErrInvalidPegRatio, "invalid peg ratio")
    }
    
    usdcAmount := math.LegacyNewDecFromInt(amount).Quo(pegRatio).TruncateInt()
    usdcCoin := sdk.NewCoin(params.UsdcDenom, usdcAmount)
    
    // Check if module has enough USDC to release
    moduleBalance := k.bankKeeper.GetBalance(ctx, k.accountKeeper.GetModuleAddress(types.ModuleName), params.UsdcDenom)
    if moduleBalance.Amount.LT(usdcAmount) {
        return nil, errorsmod.Wrap(types.ErrInsufficientBridgeBalance, "insufficient USDC in bridge")
    }
    
    // Send USDC from module to user
    err = k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, sender, sdk.NewCoins(usdcCoin))
    if err != nil {
        return nil, errorsmod.Wrap(err, "failed to send USDC to user")
    }
    
    // Update total bridged amount
    totalBridged := k.GetTotalBridged(ctx)
    k.SetTotalBridged(ctx, totalBridged.Sub(usdcAmount))
    
    // Update total supply
    totalSupply := k.GetTotalSupply(ctx)
    k.SetTotalSupply(ctx, totalSupply.Sub(amount))
    
    // Update statistics
    stats := k.GetBridgeStatistics(ctx)
    stats.TotalBridgeOutCount++
    stats.LastBridgeOutTimestamp = ctx.BlockTime().Unix()
    k.SetBridgeStatistics(ctx, stats)
    
    // Emit event
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            types.EventTypeBridgeOut,
            sdk.NewAttribute(types.AttributeKeySender, msg.Sender),
            sdk.NewAttribute(types.AttributeKeyAmount, msg.Amount.String()),
            sdk.NewAttribute(types.AttributeKeyReleasedAmount, usdcCoin.String()),
        ),
    )
    
    k.Logger(ctx).Info("Bridge out successful",
        "sender", msg.Sender,
        "testusd_burned", testUsdCoin.String(),
        "usdc_released", usdcCoin.String(),
    )
    
    return &types.MsgBridgeOutResponse{
        ReleasedAmount: usdcCoin,
    }, nil
}
