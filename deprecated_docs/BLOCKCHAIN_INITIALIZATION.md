# MyChain Blockchain Initialization

## Default Configuration

The blockchain always initializes with the following standard configuration:

### Initial State
- **MainCoin Supply**: 100,000 MC
- **Reserve Balance**: 1 TESTUSD
- **Price**: $0.0001 per MC
- **Segment**: 0

### Validator Account
- **100,000 TESTUSD** (liquid)
- **100,000 ALC** total:
  - 10,000 ALC (liquid for transaction fees)
  - 90,000 ALC (staked for validation)

### Automatic Segment Progression
On the first block after initialization, the system automatically progresses to Segment 1:
- Dev allocation: 10 MC (0.1% of segment supply)
- New price: $0.0001001 (0.1% increase)
- Total supply: 100,010 MC

## Quick Start Commands

### Using Make (Recommended)
```bash
# Fresh start (clean + init + start)
make fresh-start

# Just initialize (without starting)
make init

# Start existing blockchain
make start

# Stop blockchain
make stop
```

### Using Scripts Directly
```bash
# Complete fresh start
./fresh-start.sh

# Just initialize
./scripts/init_default.sh

# Manual start
mychaind start --api.enable --api.swagger --api.enabled-unsafe-cors
```

## What Happens During Initialization

1. **Cleanup**: Removes any existing blockchain data
2. **Chain Init**: Creates new chain with ID `mychain-1`
3. **Account Creation**: Creates validator, alice, and bob accounts
4. **Genesis Configuration**:
   - Sets up MainCoin module with initial parameters
   - Configures TestUSD and DEX modules
   - Sets minimum gas prices
5. **Validator Setup**: Creates and collects genesis transaction
6. **Validation**: Ensures genesis file is valid

## Accounts Created

| Account   | Address | Initial Balance |
|-----------|---------|----------------|
| Validator | `cosmos15yk64u7zc9g9k2yr2wmzeva5qgwxps6yxj00e7` | 100,000 TESTUSD, 100,000 ALC |
| Alice     | `cosmos1pytelukfdc0c5yu43ka7svuj66xfyn32gqamrp` | 10 TESTUSD |
| Bob       | `cosmos1glhldqt0u24h7zhs0y50stf2m8exunrah36w5e` | 10 TESTUSD |

## API Endpoints After Start

- REST API: http://localhost:1317
- Swagger UI: http://localhost:1317/swagger/
- RPC: http://localhost:26657
- gRPC: localhost:9090

## Verify Blockchain Status

```bash
# Check segment info
curl http://localhost:1317/mychain/maincoin/v1/segment_info

# Check validator balance
curl http://localhost:1317/cosmos/bank/v1beta1/balances/cosmos15yk64u7zc9g9k2yr2wmzeva5qgwxps6yxj00e7
```

## Logs

Blockchain logs are written to: `/tmp/mychain.log`

View logs:
```bash
tail -f /tmp/mychain.log
```

## Customization

To modify the default configuration, edit:
- `/scripts/init_default.sh` - Main initialization script
- The Python configuration section within the script

The initialization is designed to always produce the same deterministic state for testing and development consistency.