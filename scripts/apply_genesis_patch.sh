#!/bin/bash

# Apply genesis patch to the genesis.json file
if [ -z "$1" ]; then
    echo "Usage: $0 <patch_file>"
    exit 1
fi

PATCH_FILE=$1
GENESIS_FILE=$HOME/.mychain/config/genesis.json
TEMP_FILE=$(mktemp)

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "jq is not installed. Installing..."
    sudo apt-get update && sudo apt-get install -y jq
fi

# Read the patch file
PATCH=$(cat $PATCH_FILE)

# Apply the patch to app_state
jq --argjson patch "$PATCH" '.app_state = (.app_state * $patch)' $GENESIS_FILE > $TEMP_FILE

# Move the temporary file to the genesis file
mv $TEMP_FILE $GENESIS_FILE

echo "Genesis patch applied successfully"