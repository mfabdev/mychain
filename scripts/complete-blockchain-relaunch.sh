#!/bin/bash
set -e

# Complete Blockchain Relaunch Script
# This script relaunches the blockchain with all correct permanent configuration

echo "========================================="
echo "Complete Blockchain Relaunch"
echo "========================================="

# Configuration
CHAIN_ID="mychain"
MONIKER="test"
BINARY="mychaind"
HOME_DIR="$HOME/.mychain"

# Addresses
ADMIN_ADDRESS="mychain1wfcn8eep79ulweqmt4cesarwlwm54xka93qqvh"
VALIDATOR_ADDRESS="mychain16x03wcp37kx5e8ehckjxvwcgk9j0cqnhcccnty"

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

# Update chain config
dasel put -t string -f $HOME_DIR/config/config.toml '.rpc.laddr' -v "tcp://0.0.0.0:26657"
dasel put -t string -f $HOME_DIR/config/config.toml '.p2p.laddr' -v "tcp://0.0.0.0:26656"
dasel put -t string -f $HOME_DIR/config/config.toml '.rpc.cors_allowed_origins' -v '["*"]'

# Update app config
dasel put -t bool -f $HOME_DIR/config/app.toml '.api.enable' -v true
dasel put -t string -f $HOME_DIR/config/app.toml '.api.address' -v "tcp://0.0.0.0:1317"
dasel put -t bool -f $HOME_DIR/config/app.toml '.api.enabled-unsafe-cors' -v true
dasel put -t string -f $HOME_DIR/config/app.toml '.minimum-gas-prices' -v "0ulc"

# Step 5: Create genesis with correct configuration
echo "Step 5: Creating genesis configuration..."

# Create temporary genesis
cp $HOME_DIR/config/genesis.json $HOME_DIR/config/genesis_temp.json

# Update genesis with jq
jq --arg admin "$ADMIN_ADDRESS" --arg validator "$VALIDATOR_ADDRESS" '
# Set chain parameters
.chain_id = "mychain" |
.genesis_time = (now | strftime("%Y-%m-%dT%H:%M:%SZ")) |

# Configure consensus params
.consensus_params.block.max_gas = "10000000" |
.consensus_params.block.time_iota_ms = "1000" |

# Configure bank module
.app_state.bank.params.send_enabled = [] |
.app_state.bank.params.default_send_enabled = true |

# Configure staking module
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

# Configure SDK minting
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

# Step 6: Add accounts with correct balances
echo "Step 6: Adding accounts..."

# Add admin account with balances
$BINARY add-genesis-account $ADMIN_ADDRESS 100000000000ulc,100000000000utestusd

# Add validator account
$BINARY add-genesis-account $VALIDATOR_ADDRESS 1000000ulc

# Step 7: Create gentx for validator
echo "Step 7: Creating validator..."

# Create validator transaction
$BINARY gentx validator 90000000000ulc \
  --chain-id $CHAIN_ID \
  --moniker $MONIKER \
  --commission-rate 0.1 \
  --commission-max-rate 0.2 \
  --commission-max-change-rate 0.01 \
  --pubkey $($BINARY tendermint show-validator) \
  --from validator

# Collect gentx
$BINARY collect-gentxs

# Step 8: Initialize MainCoin state
echo "Step 8: Initializing MainCoin state..."

# Update genesis with MainCoin configuration
jq '
# Configure MainCoin module
.app_state.maincoin = {
  "params": {
    "base_price": "0.0001",
    "price_increment": "0.001",
    "dev_allocation_percentage": "0.0001",
    "reserve_ratio": "0.1"
  },
  "maincoin_state": {
    "current_price": "0.0001001",
    "current_segment": "1",
    "total_supply": "100000000000",
    "dev_allocation": "10000000",
    "reserve_balance": "1000000",
    "last_update_height": "0"
  },
  "segment_histories": []
} |

# Configure DEX module
.app_state.dex = {
  "params": {
    "lc_reward_percent": "0.1",
    "match_reward": "0.003"
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

# Add MainCoin to initial supply
.app_state.bank.supply += [
  {"denom": "ulc", "amount": "100000000000"},
  {"denom": "umaincoin", "amount": "100000000000"},
  {"denom": "maincoin", "amount": "10000000"},
  {"denom": "utestusd", "amount": "100000000000"}
] |

# Add MainCoin balances to admin
.app_state.bank.balances[0].coins += [
  {"denom": "umaincoin", "amount": "100000000000"},
  {"denom": "maincoin", "amount": "10000000"}
]
' $HOME_DIR/config/genesis.json > $HOME_DIR/config/genesis_updated.json

mv $HOME_DIR/config/genesis_updated.json $HOME_DIR/config/genesis.json

# Step 9: Validate genesis
echo "Step 9: Validating genesis..."
$BINARY validate-genesis

# Step 10: Start the node
echo "Step 10: Starting node..."
echo ""
echo "Starting blockchain with:"
echo "- Chain ID: $CHAIN_ID"
echo "- RPC: http://localhost:26657"
echo "- API: http://localhost:1317"
echo "- Initial LC: 100,000 ALC (90,000 staked)"
echo "- Initial MC: 100,010 MC (100,000 + 10 dev)"
echo "- Initial TUSD: 100,000 TUSD"
echo "- SDK Minting: Enabled (7-100% inflation)"
echo ""

# Start in background
nohup $BINARY start > $HOME/mychain.log 2>&1 &

echo "Node started! Check logs: tail -f $HOME/mychain.log"
echo ""
echo "Web Dashboard: http://localhost:3000"
echo "========================================="