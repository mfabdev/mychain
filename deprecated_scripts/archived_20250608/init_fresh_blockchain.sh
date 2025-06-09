#!/bin/bash

# Initialize Fresh Blockchain with All Recent Updates
# This script sets up a brand new blockchain with MainCoin segment history tracking

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
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Initializing Fresh Blockchain${NC}"
echo -e "${BLUE}Chain ID: ${CHAIN_ID}${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Clean previous data
echo -e "\n${YELLOW}Step 1: Cleaning previous blockchain data...${NC}"
rm -rf $HOME_DIR
rm -rf /tmp/mychain-fresh-start

# Step 2: Initialize chain
echo -e "\n${YELLOW}Step 2: Initializing chain...${NC}"
$BINARY init validator --chain-id $CHAIN_ID --home $HOME_DIR

# Step 3: Create accounts
echo -e "\n${YELLOW}Step 3: Creating accounts...${NC}"

# Create validator account
echo "satisfy adjust timber high purchase tuition stool faith fine install that you unaware feed domain license impose boss human eager hat rent enjoy dawn" | $BINARY keys add validator --recover --keyring-backend test --home $HOME_DIR

# Create user accounts
echo "notice oak worry limit wrap speak medal online prefer cluster roof addict wrist behave treat actual wasp year salad speed social layer crew genius" | $BINARY keys add alice --recover --keyring-backend test --home $HOME_DIR

echo "quality vacuum heart guard buzz spike sight swarm shove special gym robust assume sudden deposit grid alcohol choice devote leader tilt noodle tide penalty" | $BINARY keys add bob --recover --keyring-backend test --home $HOME_DIR

# Create admin account for MainCoin operations
$BINARY keys add admin --keyring-backend test --home $HOME_DIR 2>&1 | grep -E "(address:|mnemonic:)" | sed 's/.*: //' || true

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

# Step 4: Configure genesis
echo -e "\n${YELLOW}Step 4: Configuring genesis...${NC}"

# Update chain params
cat $HOME_DIR/config/genesis.json | jq '.app_state["staking"]["params"]["bond_denom"]="'$DENOM'"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["crisis"]["constant_fee"]["denom"]="'$DENOM'"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["gov"]["params"]["min_deposit"][0]["denom"]="'$DENOM'"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["mint"]["params"]["mint_denom"]="'$DENOM'"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json

# Configure MainCoin module with segment 0
echo -e "${BLUE}Configuring MainCoin module...${NC}"
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["params"]["admin_address"]="'$ADMIN_ADDR'"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["params"]["denom"]="'$MAINCOIN_DENOM'"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["current_segment"]=0' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["price_at_segment_start"]="1.000000000000000000"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["coins_sold_in_segment"]="0"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["reserve"]="0"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["deferred_dev_allocation"]="0"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json

# Initialize segment history array
cat $HOME_DIR/config/genesis.json | jq '.app_state["maincoin"]["segment_history"]=[]' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json

# Configure TestUSD module
echo -e "${BLUE}Configuring TestUSD module...${NC}"
cat $HOME_DIR/config/genesis.json | jq '.app_state["testusd"]["total_supply"]="1000000000000"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json

# Configure DEX module
echo -e "${BLUE}Configuring DEX module...${NC}"
cat $HOME_DIR/config/genesis.json | jq '.app_state["dex"]["params"]["lc_denom"]="ulc"' > $HOME_DIR/config/tmp_genesis.json && mv $HOME_DIR/config/tmp_genesis.json $HOME_DIR/config/genesis.json

# Step 5: Add genesis accounts with balances
echo -e "\n${YELLOW}Step 5: Adding genesis accounts with balances...${NC}"

# Validator gets native tokens for staking and operations
$BINARY genesis add-genesis-account $VALIDATOR_ADDR 1000000000$DENOM,100000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR

# Alice and Bob get native tokens and TestUSD for testing
$BINARY genesis add-genesis-account $ALICE_ADDR 500000000$DENOM,500000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR
$BINARY genesis add-genesis-account $BOB_ADDR 500000000$DENOM,500000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR

# Admin gets native tokens and TestUSD for MainCoin operations
$BINARY genesis add-genesis-account $ADMIN_ADDR 1000000000$DENOM,1000000000$TESTUSD_DENOM --keyring-backend test --home $HOME_DIR

# Step 6: Create genesis transaction for validator
echo -e "\n${YELLOW}Step 6: Creating genesis transaction for validator...${NC}"
$BINARY genesis gentx validator 100000000$DENOM --keyring-backend test --chain-id $CHAIN_ID --home $HOME_DIR

# Step 7: Collect genesis transactions
echo -e "\n${YELLOW}Step 7: Collecting genesis transactions...${NC}"
$BINARY genesis collect-gentxs --home $HOME_DIR

# Step 8: Validate genesis
echo -e "\n${YELLOW}Step 8: Validating genesis...${NC}"
$BINARY genesis validate-genesis --home $HOME_DIR

# Step 9: Configure node
echo -e "\n${YELLOW}Step 9: Configuring node...${NC}"

# Enable API
sed -i 's/enable = false/enable = true/g' $HOME_DIR/config/app.toml
sed -i 's/swagger = false/swagger = true/g' $HOME_DIR/config/app.toml

# Configure CORS
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' $HOME_DIR/config/app.toml

# Configure pruning
sed -i 's/pruning = "default"/pruning = "nothing"/g' $HOME_DIR/config/app.toml

# Configure minimum gas prices
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.025'$DENOM'"/g' $HOME_DIR/config/app.toml

# Step 10: Start the blockchain
echo -e "\n${YELLOW}Step 10: Starting the blockchain...${NC}"
echo -e "${GREEN}Blockchain initialized successfully!${NC}"
echo -e "${BLUE}Starting node with API enabled on port 1317...${NC}"

# Create a systemd service file (optional)
cat > /tmp/mychain.service << EOF
[Unit]
Description=MyChain Node
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$HOME/go/bin/mychaind start --home $HOME_DIR
Restart=on-failure
RestartSec=10
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Blockchain Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${BLUE}To start the blockchain, run:${NC}"
echo -e "  $BINARY start --home $HOME_DIR"
echo -e "\n${BLUE}To start in background:${NC}"
echo -e "  nohup $BINARY start --home $HOME_DIR > mychain.log 2>&1 &"
echo -e "\n${BLUE}API Endpoints:${NC}"
echo -e "  REST API: http://localhost:1317"
echo -e "  RPC: http://localhost:26657"
echo -e "  gRPC: localhost:9090"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  Check balance: $BINARY query bank balances <address> --home $HOME_DIR"
echo -e "  Check MainCoin info: $BINARY query maincoin segment-info --home $HOME_DIR"
echo -e "  Buy MainCoin: $BINARY tx maincoin buy-maincoin 1000000$TESTUSD_DENOM --from alice --keyring-backend test --home $HOME_DIR --chain-id $CHAIN_ID -y"

# Save configuration info
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

echo -e "\n${GREEN}Chain configuration saved to: $HOME_DIR/chain_info.txt${NC}"