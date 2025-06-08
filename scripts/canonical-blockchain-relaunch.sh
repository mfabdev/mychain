#!/bin/bash
set -e

# Canonical Blockchain Relaunch Script
# Based on CANONICAL_BLOCKCHAIN_CONFIG.md - The ONLY source of truth

echo "========================================="
echo "Canonical Blockchain Relaunch"
echo "Following CANONICAL_BLOCKCHAIN_CONFIG.md"
echo "========================================="

# Configuration from canonical document
CHAIN_ID="mychain"
MONIKER="mainvalidator"  # From canonical doc
BINARY="mychaind"
HOME_DIR="$HOME/.mychain"

# Addresses - using mychain prefix
# The canonical doc shows cosmos prefix but we need mychain prefix
VALIDATOR_ADDRESS="mychain16x03wcp37kx5e8ehckjxvwcgk9j0cqnhcccnty"
ADMIN_ADDRESS="mychain1wfcn8eep79ulweqmt4cesarwlwm54xka93qqvh"

# Step 1: Stop any running node
echo "Step 1: Stopping any running node..."
pkill mychaind || true
sleep 2

# Step 2: Backup and clean existing data
echo "Step 2: Cleaning existing data..."
if [ -d "$HOME_DIR" ]; then
    rm -rf "$HOME_DIR"
fi

# Step 3: Initialize new chain
echo "Step 3: Initializing new chain..."
$BINARY init $MONIKER --chain-id $CHAIN_ID

# Step 4: Configure chain
echo "Step 4: Configuring chain..."

# Update chain config using sed
sed -i 's|laddr = "tcp://127.0.0.1:26657"|laddr = "tcp://0.0.0.0:26657"|g' $HOME_DIR/config/config.toml
sed -i 's|laddr = "tcp://0.0.0.0:26656"|laddr = "tcp://0.0.0.0:26656"|g' $HOME_DIR/config/config.toml
sed -i 's|cors_allowed_origins = \[\]|cors_allowed_origins = ["*"]|g' $HOME_DIR/config/config.toml

# Update app config using sed
sed -i 's|enable = false|enable = true|g' $HOME_DIR/config/app.toml
sed -i 's|address = "tcp://localhost:1317"|address = "tcp://0.0.0.0:1317"|g' $HOME_DIR/config/app.toml
sed -i 's|enabled-unsafe-cors = false|enabled-unsafe-cors = true|g' $HOME_DIR/config/app.toml
sed -i 's|minimum-gas-prices = ""|minimum-gas-prices = "0ulc"|g' $HOME_DIR/config/app.toml

# Step 5: Create genesis with canonical configuration
echo "Step 5: Creating canonical genesis configuration..."

# Create temporary genesis
cp $HOME_DIR/config/genesis.json $HOME_DIR/config/genesis_temp.json

# Update genesis with canonical values
jq --arg validator "$VALIDATOR_ADDRESS" '
# Set chain parameters
.chain_id = "mychain" |
.genesis_time = (now | strftime("%Y-%m-%dT%H:%M:%SZ")) |

# Configure consensus params
.consensus_params.block.max_gas = "10000000" |
.consensus_params.block.time_iota_ms = "1000" |

# Configure bank module
.app_state.bank.params.send_enabled = [] |
.app_state.bank.params.default_send_enabled = true |

# Configure staking module (from canonical doc)
.app_state.staking.params.unbonding_time = "1814400s" |
.app_state.staking.params.max_validators = 100 |
.app_state.staking.params.max_entries = 7 |
.app_state.staking.params.historical_entries = 10000 |
.app_state.staking.params.bond_denom = "ulc" |
.app_state.staking.params.min_commission_rate = "0.000000000000000000" |

# Configure governance
.app_state.gov.voting_params.voting_period = "172800s" |
.app_state.gov.deposit_params.min_deposit = [{"denom":"ulc","amount":"10000000"}] |
.app_state.gov.deposit_params.max_deposit_period = "172800s" |
.app_state.gov.tally_params.quorum = "0.334000000000000000" |
.app_state.gov.tally_params.threshold = "0.500000000000000000" |
.app_state.gov.tally_params.veto_threshold = "0.334000000000000000" |

# Configure SDK minting (from canonical doc)
.app_state.mint.minter.inflation = "1.000000000000000000" |
.app_state.mint.minter.annual_provisions = "0.000000000000000000" |
.app_state.mint.params.mint_denom = "ulc" |
.app_state.mint.params.inflation_rate_change = "0.930000000000000000" |
.app_state.mint.params.inflation_max = "1.000000000000000000" |
.app_state.mint.params.inflation_min = "0.070000000000000000" |
.app_state.mint.params.goal_bonded = "0.500000000000000000" |
.app_state.mint.params.blocks_per_year = "6311520" |

# Configure crisis
.app_state.crisis.constant_fee.denom = "ulc" |
.app_state.crisis.constant_fee.amount = "1000" |

# Configure slashing
.app_state.slashing.params.signed_blocks_window = "100" |
.app_state.slashing.params.min_signed_per_window = "0.500000000000000000" |
.app_state.slashing.params.downtime_jail_duration = "600s" |
.app_state.slashing.params.slash_fraction_double_sign = "0.050000000000000000" |
.app_state.slashing.params.slash_fraction_downtime = "0.010000000000000000" |

# Clear initial supply and balances
.app_state.bank.supply = [] |
.app_state.bank.balances = [] |
.app_state.auth.accounts = []
' $HOME_DIR/config/genesis_temp.json > $HOME_DIR/config/genesis.json

# Step 6: Add accounts with canonical balances
echo "Step 6: Adding accounts with canonical amounts..."

# Add admin account with correct amounts (from canonical doc)
# 100,000 LC + 100,000 TUSD
$BINARY add-genesis-account $ADMIN_ADDRESS 100000000000ulc,100000000000utestusd

# Add validator account (small amount for fees)
$BINARY add-genesis-account $VALIDATOR_ADDRESS 1000000ulc

# Step 7: Create validator key and gentx with canonical stake
echo "Step 7: Creating validator with canonical 90,000 LC stake..."

# Import validator key if exists, otherwise create new one
if [ -f "$HOME/validator.json" ]; then
    echo "Importing existing validator key..."
    $BINARY keys import validator $HOME/validator.json --keyring-backend test
else
    echo "Creating new validator key..."
    $BINARY keys add validator --keyring-backend test
fi

# Create validator transaction with 90,000 LC (from canonical doc)
$BINARY gentx validator 90000000000ulc \
  --chain-id $CHAIN_ID \
  --moniker $MONIKER \
  --commission-rate 0.1 \
  --commission-max-rate 0.2 \
  --commission-max-change-rate 0.01 \
  --keyring-backend test

# Collect gentx
$BINARY collect-gentxs

# Step 8: Initialize MainCoin state (from canonical doc)
echo "Step 8: Initializing MainCoin with canonical state..."

# Update genesis with MainCoin canonical configuration
jq '
# Configure MainCoin module (from canonical doc)
.app_state.maincoin = {
  "params": {
    "base_price": "0.0001",
    "price_increment": "0.001",
    "dev_allocation_percentage": "0.0001",
    "reserve_ratio": "0.1"
  },
  "maincoin_state": {
    "current_segment": "0",
    "total_purchased": "0",
    "reserve_balance": "0",
    "developer_allocation": "0",
    "initial_price": "0.0001",
    "price_increase_per_segment": "0.001",
    "last_update_height": "0"
  },
  "segment_histories": []
} |

# Configure DEX module (from canonical doc)
.app_state.dex = {
  "params": {
    "lc_tier1_required": "5000000000",
    "lc_tier2_required": "10000000000",
    "lc_tier3_required": "20000000000",
    "rewards_per_block": "1000000",
    "tier1_multiplier": "1.0",
    "tier2_multiplier": "1.5",
    "tier3_multiplier": "2.0"
  }
} |

# Configure TestUSD module
.app_state.testusd = {
  "params": {}
} |

# Configure mychain module
.app_state.mychain = {
  "params": {},
  "transactionRecords": []
} |

# Add canonical initial supply
.app_state.bank.supply += [
  {"denom": "ulc", "amount": "100000000000"},
  {"denom": "umaincoin", "amount": "100000000000"},
  {"denom": "utestusd", "amount": "100000000000"}
] |

# Add MainCoin balance to admin (100,000 MC pre-minted)
.app_state.bank.balances[0].coins += [
  {"denom": "umaincoin", "amount": "100000000000"}
]
' $HOME_DIR/config/genesis.json > $HOME_DIR/config/genesis_updated.json

mv $HOME_DIR/config/genesis_updated.json $HOME_DIR/config/genesis.json

# Step 9: Validate genesis
echo "Step 9: Validating genesis..."
$BINARY validate-genesis

# Step 10: Start the node
echo "Step 10: Starting node with canonical configuration..."
echo ""
echo "Starting blockchain with CANONICAL values:"
echo "- Chain ID: $CHAIN_ID"
echo "- Validator: mainvalidator"
echo "- Initial LC: 100,000 ALC (90,000 staked to mainvalidator)"
echo "- Initial MC: 100,000 MC (pre-minted, no dev allocation yet)"
echo "- Initial TUSD: 100,000 TUSD"
echo "- MainCoin Reserve: 0 TUSD (will be funded on first purchase)"
echo "- SDK Minting: 100% initial, 7-100% range, 50% goal"
echo ""
echo "RPC: http://localhost:26657"
echo "API: http://localhost:1317"
echo ""

# Start in background
nohup $BINARY start > $HOME/mychain.log 2>&1 &

echo "Node started! Check logs: tail -f $HOME/mychain.log"
echo ""
echo "IMPORTANT: This follows CANONICAL_BLOCKCHAIN_CONFIG.md exactly"
echo "========================================="