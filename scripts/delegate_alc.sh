#!/bin/bash

# Script to delegate ALC tokens to validators
# This allows users to stake their ALC without resetting the chain

echo "ALC Staking Helper Script"
echo "========================"

# Check if chain is running
if ! pgrep -x "mychaind" > /dev/null; then
    echo "Error: mychaind is not running. Please start the chain first."
    exit 1
fi

# Get validator info
echo "Fetching validator information..."
VALIDATORS=$(mychaind query staking validators --output json 2>/dev/null | jq -r '.validators[] | "\(.operator_address)|\(.description.moniker)"')

if [ -z "$VALIDATORS" ]; then
    echo "No validators found!"
    exit 1
fi

echo ""
echo "Available Validators:"
echo "--------------------"
i=1
while IFS='|' read -r addr moniker; do
    echo "$i. $moniker ($addr)"
    i=$((i+1))
done <<< "$VALIDATORS"

# Get user input
echo ""
read -p "Select validator number: " VAL_NUM
read -p "Enter amount to stake (in ALC): " AMOUNT

# Convert to proper denomination (ALC has 6 decimals)
AMOUNT_UALC=$(echo "$AMOUNT * 1000000" | bc | cut -d'.' -f1)

# Get selected validator
VAL_ADDR=$(echo "$VALIDATORS" | sed -n "${VAL_NUM}p" | cut -d'|' -f1)
VAL_NAME=$(echo "$VALIDATORS" | sed -n "${VAL_NUM}p" | cut -d'|' -f2)

# Get delegator address
echo ""
echo "Available keys:"
mychaind keys list --keyring-backend test
echo ""
read -p "Enter your key name: " KEY_NAME

# Confirm
echo ""
echo "You are about to stake:"
echo "  Amount: $AMOUNT ALC ($AMOUNT_UALC alc)"
echo "  To validator: $VAL_NAME"
echo "  From account: $KEY_NAME"
echo ""
read -p "Proceed? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

# Execute delegation
echo "Delegating tokens..."
mychaind tx staking delegate "$VAL_ADDR" "${AMOUNT_UALC}alc" \
    --from "$KEY_NAME" \
    --chain-id mychain_9876-1 \
    --gas auto \
    --gas-adjustment 1.5 \
    --gas-prices 0.025alc \
    --keyring-backend test \
    --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "Success! Your ALC tokens have been staked."
    echo "You will start earning rewards at 10% APR."
    echo ""
    echo "To check your delegation:"
    echo "mychaind query staking delegations $(mychaind keys show $KEY_NAME -a --keyring-backend test)"
else
    echo "Error: Failed to delegate tokens."
fi