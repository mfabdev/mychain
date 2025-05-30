#!/bin/bash

echo "MyChain Staking Account Setup"
echo "============================"
echo ""
echo "This script will help you create an account and receive ALC tokens for staking."
echo ""

# Create a new account
echo "Creating a new account for staking..."
echo ""
read -p "Enter a name for your account (e.g., mystaker): " ACCOUNT_NAME

# Check if account already exists
if mychaind keys show "$ACCOUNT_NAME" --keyring-backend test >/dev/null 2>&1; then
    echo "Account '$ACCOUNT_NAME' already exists!"
    ACCOUNT_ADDR=$(mychaind keys show "$ACCOUNT_NAME" -a --keyring-backend test)
    echo "Address: $ACCOUNT_ADDR"
else
    # Create new account
    echo "Creating new account..."
    mychaind keys add "$ACCOUNT_NAME" --keyring-backend test
    ACCOUNT_ADDR=$(mychaind keys show "$ACCOUNT_NAME" -a --keyring-backend test)
    echo ""
    echo "Account created successfully!"
    echo "Address: $ACCOUNT_ADDR"
fi

# Check current balance
echo ""
echo "Checking current balance..."
BALANCE=$(mychaind query bank balances "$ACCOUNT_ADDR" --output json | jq -r '.balances[] | select(.denom=="alc") | .amount' || echo "0")
BALANCE_ALC=$(echo "scale=2; $BALANCE / 1000000" | bc)
echo "Current ALC balance: $BALANCE_ALC ALC"

# Note about the main account
echo ""
echo "======================================"
echo "IMPORTANT: Manual Transfer Required"
echo "======================================"
echo ""
echo "The main account with 100,000 ALC is:"
echo "cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"
echo ""
echo "To receive ALC tokens, you need to:"
echo "1. Access the main account (if you have the keys)"
echo "2. Transfer ALC to your new account: $ACCOUNT_ADDR"
echo ""
echo "If you have access to the main account, use this command:"
echo ""
echo "mychaind tx bank send [MAIN_ACCOUNT_KEY_NAME] $ACCOUNT_ADDR 50000000000alc \\"
echo "  --chain-id mychain_9876-1 \\"
echo "  --gas auto \\"
echo "  --gas-adjustment 1.5 \\"
echo "  --gas-prices 0.025alc \\"
echo "  --keyring-backend test \\"
echo "  --yes"
echo ""
echo "======================================"
echo ""
echo "Once you have ALC in your account, you can:"
echo "1. Use the web dashboard Staking Manager"
echo "2. Or run: ./scripts/delegate_alc.sh"
echo ""