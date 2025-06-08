# Restart Instructions for Updated MainCoin

The blockchain is currently running with the OLD calculation logic. To test the corrected implementation, you need to:

## 1. Stop Current Node
```bash
# Find and kill the current process
ps aux | grep mychaind
# Note the PID (second column) and run:
kill -9 <PID>
# Or simply:
pkill -9 mychaind
```

## 2. Build Fresh Binary
```bash
cd /home/dk/go/src/myrollapps/mychain

# Clean and build
make clean
make build

# Or if that fails, try:
go mod tidy
go build -o ./build/mychaind ./cmd/mychaind
```

## 3. Install New Binary
```bash
# Copy to go bin
cp ./build/mychaind $HOME/go/bin/
# Or use make
make install
```

## 4. Restart Node
```bash
cd scripts
./start_node.sh
```

## 5. Test New Implementation
```bash
# Check current segment
mychaind query maincoin segment-info

# Make a small purchase to test
mychaind tx maincoin buy-maincoin 100000utestusd \
  --from admin \
  --keyring-backend test \
  --chain-id mychain \
  --gas auto \
  --gas-adjustment 1.5 \
  --gas-prices 0.025alc -y
```

## Expected Behavior with Corrected Logic

With the fixed implementation:
- Segments should require ~10-15 MC each (not 100+ MC)
- $0.10 should buy approximately 1000 MC (not 2700 MC)
- Dev allocation should be deferred to next segment

## Current Issue

The running node has the old logic where:
- Uses 10× multiplier incorrectly
- Calculates: Purchase = Deficit ÷ 0.1 (WRONG)
- Results in too many tokens per dollar

The new code fixes this to:
- Tokens = Deficit ÷ Price (CORRECT)
- No artificial multipliers