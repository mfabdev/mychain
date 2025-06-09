#!/bin/bash

# Complete Fresh Blockchain Setup
# This script completes the setup after accounts are created

set -e

# Configuration
CHAIN_ID="mychain-1"
DENOM="umych"
MAINCOIN_DENOM="umcn"
TESTUSD_DENOM="utusdc"
HOME_DIR="$HOME/.mychain"
BINARY="mychaind"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Completing blockchain setup...${NC}"

# Get addresses
VALIDATOR_ADDR=$($BINARY keys show validator -a --keyring-backend test --home $HOME_DIR)
ALICE_ADDR=$($BINARY keys show alice -a --keyring-backend test --home $HOME_DIR)
BOB_ADDR=$($BINARY keys show bob -a --keyring-backend test --home $HOME_DIR)
ADMIN_ADDR=$($BINARY keys show admin -a --keyring-backend test --home $HOME_DIR)

echo -e "${GREEN}Accounts:${NC}"
echo "  Validator: $VALIDATOR_ADDR"
echo "  Alice: $ALICE_ADDR"
echo "  Bob: $BOB_ADDR"
echo "  Admin: $ADMIN_ADDR"

# Update genesis with proper configuration
echo -e "\n${YELLOW}Configuring genesis file...${NC}"

# Create Python script for genesis update
cat > /tmp/update_genesis_complete.py << 'EOF'
import json
import sys

genesis_file = sys.argv[1]
admin_addr = sys.argv[2]

with open(genesis_file, 'r') as f:
    genesis = json.load(f)

# Update base chain params
genesis['app_state']['staking']['params']['bond_denom'] = 'umych'
genesis['app_state']['crisis']['constant_fee']['denom'] = 'umych'
genesis['app_state']['gov']['params']['min_deposit'][0]['denom'] = 'umych'
genesis['app_state']['mint']['params']['mint_denom'] = 'umych'

# Configure MainCoin module with segment history
genesis['app_state']['maincoin'] = {
    "params": {
        "admin_address": admin_addr,
        "denom": "umcn"
    },
    "current_segment": 0,
    "price_at_segment_start": "1.000000000000000000",
    "coins_sold_in_segment": "0",
    "reserve": "0",
    "deferred_dev_allocation": "0",
    "segment_history": []
}

# Configure TestUSD module
genesis['app_state']['testusd'] = {
    "params": {},
    "total_supply": "1000000000000"
}

# Configure DEX module
genesis['app_state']['dex'] = {
    "params": {
        "lc_denom": "ulc"
    }
}

# Configure MyChain module
genesis['app_state']['mychain'] = {
    "params": {}
}

with open(genesis_file, 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis file updated successfully")
EOF

python3 /tmp/update_genesis_complete.py $HOME_DIR/config/genesis.json $ADMIN_ADDR

# Add genesis accounts
echo -e "\n${YELLOW}Adding genesis accounts...${NC}"
$BINARY genesis add-genesis-account $VALIDATOR_ADDR 1000000000$DENOM,100000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR
$BINARY genesis add-genesis-account $ALICE_ADDR 500000000$DENOM,500000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR
$BINARY genesis add-genesis-account $BOB_ADDR 500000000$DENOM,500000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR
$BINARY genesis add-genesis-account $ADMIN_ADDR 1000000000$DENOM,1000000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR

# Create genesis transaction
echo -e "\n${YELLOW}Creating genesis transaction...${NC}"
$BINARY genesis gentx validator 100000000$DENOM --keyring-backend test --chain-id $CHAIN_ID --home $HOME_DIR

# Collect genesis transactions
echo -e "\n${YELLOW}Collecting genesis transactions...${NC}"
$BINARY genesis collect-gentxs --home $HOME_DIR

# Validate genesis
echo -e "\n${YELLOW}Validating genesis...${NC}"
$BINARY genesis validate-genesis --home $HOME_DIR

# Configure node
echo -e "\n${YELLOW}Configuring node for API access...${NC}"

# Enable API
sed -i 's/enable = false/enable = true/g' $HOME_DIR/config/app.toml
sed -i 's/swagger = false/swagger = true/g' $HOME_DIR/config/app.toml

# Configure CORS
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' $HOME_DIR/config/app.toml

# Configure pruning
sed -i 's/pruning = "default"/pruning = "nothing"/g' $HOME_DIR/config/app.toml

# Configure minimum gas prices
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.025'$DENOM'"/g' $HOME_DIR/config/app.toml

# Save chain info
cat > $HOME_DIR/chain_info.txt << EOF
Chain ID: $CHAIN_ID
Native Denom: $DENOM
MainCoin Denom: $MAINCOIN_DENOM
TestUSD Denom: $TESTUSD_DENOM

Accounts:
- Validator: $VALIDATOR_ADDR
- Alice: $ALICE_ADDR
- Bob: $BOB_ADDR
- Admin: $ADMIN_ADDR

API Endpoints:
- REST API: http://localhost:1317
- RPC: http://localhost:26657
- gRPC: localhost:9090
EOF

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete! Ready to start the node.${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${BLUE}To start the blockchain:${NC}"
echo -e "  $BINARY start --home $HOME_DIR"
echo -e "\n${BLUE}Or in background:${NC}"
echo -e "  nohup $BINARY start --home $HOME_DIR > mychain.log 2>&1 &"