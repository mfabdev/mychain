#!/bin/bash

# Start Fresh Blockchain with All Recent Updates
# This script initializes and starts a brand new blockchain

set -e

# Configuration
CHAIN_ID="mychain-1"
DENOM="umych"
MAINCOIN_DENOM="umcn"
TESTUSD_DENOM="utusdc"
HOME_DIR="$HOME/.mychain"
BINARY="mychaind"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Fresh Blockchain${NC}"
echo -e "${BLUE}Chain ID: ${CHAIN_ID}${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Stop any running node
echo -e "\n${YELLOW}Step 1: Stopping any running node...${NC}"
pkill mychaind || true
sleep 2

# Step 2: Clean previous data
echo -e "\n${YELLOW}Step 2: Cleaning previous blockchain data...${NC}"
rm -rf $HOME_DIR

# Step 3: Initialize chain
echo -e "\n${YELLOW}Step 3: Initializing chain...${NC}"
$BINARY init validator --chain-id $CHAIN_ID --home $HOME_DIR

# Step 4: Create accounts
echo -e "\n${YELLOW}Step 4: Creating accounts...${NC}"

# Create all accounts silently first
echo "satisfy adjust timber high purchase tuition stool faith fine install that you unaware feed domain license impose boss human eager hat rent enjoy dawn" | $BINARY keys add validator --recover --keyring-backend test --home $HOME_DIR > /dev/null 2>&1
echo "notice oak worry limit wrap speak medal online prefer cluster roof addict wrist behave treat actual wasp year salad speed social layer crew genius" | $BINARY keys add alice --recover --keyring-backend test --home $HOME_DIR > /dev/null 2>&1
echo "quality vacuum heart guard buzz spike sight swarm shove special gym robust assume sudden deposit grid alcohol choice devote leader tilt noodle tide penalty" | $BINARY keys add bob --recover --keyring-backend test --home $HOME_DIR > /dev/null 2>&1
echo "guard cream sadness conduct invite crumble clock pudding hole grit liar hotel maid produce squeeze return argue turtle know drive eight spike maze nest" | $BINARY keys add admin --recover --keyring-backend test --home $HOME_DIR > /dev/null 2>&1

# Get addresses
VALIDATOR_ADDR=$($BINARY keys show validator -a --keyring-backend test --home $HOME_DIR)
ALICE_ADDR=$($BINARY keys show alice -a --keyring-backend test --home $HOME_DIR)
BOB_ADDR=$($BINARY keys show bob -a --keyring-backend test --home $HOME_DIR)
ADMIN_ADDR=$($BINARY keys show admin -a --keyring-backend test --home $HOME_DIR)

echo -e "${GREEN}Created accounts:${NC}"
echo "  Validator: $VALIDATOR_ADDR"
echo "  Alice: $ALICE_ADDR"
echo "  Bob: $BOB_ADDR"
echo "  Admin: $ADMIN_ADDR"

# Step 5: Update base genesis configuration
echo -e "\n${YELLOW}Step 5: Configuring genesis file...${NC}"

# Create a Python script to properly update genesis
cat > /tmp/update_genesis.py << 'EOF'
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

# Configure MainCoin module
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
EOF

python3 /tmp/update_genesis.py $HOME_DIR/config/genesis.json $ADMIN_ADDR

# Step 6: Add genesis accounts
echo -e "\n${YELLOW}Step 6: Adding genesis accounts with balances...${NC}"

$BINARY genesis add-genesis-account $VALIDATOR_ADDR 1000000000$DENOM,100000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR
$BINARY genesis add-genesis-account $ALICE_ADDR 500000000$DENOM,500000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR
$BINARY genesis add-genesis-account $BOB_ADDR 500000000$DENOM,500000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR
$BINARY genesis add-genesis-account $ADMIN_ADDR 1000000000$DENOM,1000000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR

# Step 7: Create genesis transaction
echo -e "\n${YELLOW}Step 7: Creating genesis transaction...${NC}"
$BINARY genesis gentx validator 100000000$DENOM --keyring-backend test --chain-id $CHAIN_ID --home $HOME_DIR

# Step 8: Collect genesis transactions
echo -e "\n${YELLOW}Step 8: Collecting genesis transactions...${NC}"
$BINARY genesis collect-gentxs --home $HOME_DIR

# Step 9: Validate genesis
echo -e "\n${YELLOW}Step 9: Validating genesis...${NC}"
$BINARY genesis validate-genesis --home $HOME_DIR

# Step 10: Configure node for API access
echo -e "\n${YELLOW}Step 10: Configuring node...${NC}"

# Enable API
sed -i 's/enable = false/enable = true/g' $HOME_DIR/config/app.toml
sed -i 's/swagger = false/swagger = true/g' $HOME_DIR/config/app.toml

# Configure CORS
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' $HOME_DIR/config/app.toml

# Configure pruning
sed -i 's/pruning = "default"/pruning = "nothing"/g' $HOME_DIR/config/app.toml

# Configure minimum gas prices
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.025'$DENOM'"/g' $HOME_DIR/config/app.toml

# Step 11: Start the blockchain
echo -e "\n${YELLOW}Step 11: Starting the blockchain...${NC}"

# Start in background
nohup $BINARY start --home $HOME_DIR > $HOME_DIR/node.log 2>&1 &
NODE_PID=$!

echo -e "${GREEN}Node started with PID: $NODE_PID${NC}"

# Wait for node to start
echo -e "\n${YELLOW}Waiting for node to start...${NC}"
sleep 5

# Step 12: Verify node is running
echo -e "\n${YELLOW}Step 12: Verifying node status...${NC}"

# Check if node is running
if ps -p $NODE_PID > /dev/null; then
    echo -e "${GREEN}Node is running!${NC}"
    
    # Check block height
    BLOCK_HEIGHT=$($BINARY status --home $HOME_DIR 2>/dev/null | jq -r '.sync_info.latest_block_height' || echo "0")
    echo -e "${GREEN}Current block height: $BLOCK_HEIGHT${NC}"
    
    # Check MainCoin status
    echo -e "\n${BLUE}MainCoin Module Status:${NC}"
    $BINARY query maincoin segment-info --home $HOME_DIR 2>/dev/null || echo "Waiting for first block..."
else
    echo -e "${RED}Node failed to start. Check logs at: $HOME_DIR/node.log${NC}"
    exit 1
fi

# Save configuration info
cat > $HOME_DIR/chain_info.txt << EOF
Chain ID: $CHAIN_ID
Native Denom: $DENOM
MainCoin Denom: $MAINCOIN_DENOM
TestUSD Denom: $TESTUSD_DENOM
Node PID: $NODE_PID

Accounts:
- Validator: $VALIDATOR_ADDR
- Alice: $ALICE_ADDR
- Bob: $BOB_ADDR
- Admin: $ADMIN_ADDR

API Endpoints:
- REST API: http://localhost:1317
- RPC: http://localhost:26657
- gRPC: localhost:9090

Logs: $HOME_DIR/node.log
EOF

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Blockchain Successfully Started!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${BLUE}Configuration saved to: $HOME_DIR/chain_info.txt${NC}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  View logs: tail -f $HOME_DIR/node.log"
echo -e "  Check status: $BINARY status --home $HOME_DIR"
echo -e "  Check balance: $BINARY query bank balances <address> --home $HOME_DIR"
echo -e "  MainCoin info: $BINARY query maincoin segment-info --home $HOME_DIR"
echo -e "  Buy MainCoin: $BINARY tx maincoin buy-maincoin 1000000$TESTUSD_DENOM --from alice --keyring-backend test --home $HOME_DIR --chain-id $CHAIN_ID -y"
echo -e "  Stop node: kill $NODE_PID"
echo -e "\n${BLUE}API Documentation:${NC}"
echo -e "  Swagger UI: http://localhost:1317/swagger/"