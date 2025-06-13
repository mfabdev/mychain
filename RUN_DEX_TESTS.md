# Running DEX Tests

## Quick Start

### 1. Ensure blockchain is running
```bash
./scripts/unified-launch.sh --reset
```

### 2. Run all tests automatically
```bash
./scripts/run_all_dex_tests.sh
```

This will run:
- Liquidity rewards test
- Fee system test  
- Load test (reduced scale)

Results will be saved to timestamped log files.

### 3. Monitor DEX activity
```bash
# In a separate terminal
./scripts/monitor_dex.sh
```

## Individual Tests

### Test liquidity rewards only
```bash
./scripts/test_dex_liquidity_rewards.sh
```

### Test fee system only
```bash
./scripts/test_dex_fees.sh
```

### Run comprehensive test suite
```bash
./scripts/test_dex_complete.sh
```

### Run load test
```bash
./scripts/dex_load_test.sh
```

## Manual Testing

For quick manual testing, see:
```bash
cat DEX_MANUAL_TESTING_GUIDE.md
```

## Expected Results

All tests should show:
- ✅ Orders matching correctly
- ✅ Rewards accumulating for liquidity providers
- ✅ Fees being collected and burned
- ✅ Dynamic fees activating below 98% price threshold
- ✅ Liquidity multipliers applying to large orders

## Troubleshooting

If tests fail:
1. Check blockchain is running: `mychaind status`
2. Check DEX is initialized: `mychaind query dex params`
3. Check logs in timestamped files
4. Ensure accounts have funds: `mychaind query bank balances <address>`