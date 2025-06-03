# AWS Instance Update Instructions

Your AWS instance at **18.117.9.0** needs to be updated with critical fixes.

## Recent Critical Updates

### 1. Power Reduction Fix
- **Impact**: Fixes validator staking requirements to be achievable
- **Before**: Minimum stake was ~824,634 ALC (more than total supply!)
- **After**: Minimum stake is now 1 ALC

### 2. MainCoin Dev Address Fix (June 2, 2025)
- **Commit**: `b8cc026d`
- **Impact**: Fixes dev allocations that weren't working due to empty dev_address
- **Result**: 0.01% dev fee now properly allocated to admin account

## Quick Update Commands

After SSHing into your AWS instance, run these commands:

```bash
# 1. Stop the blockchain service
sudo systemctl stop mychaind

# 2. Navigate to mychain directory
cd ~/mychain

# 3. Pull latest changes (contains power reduction fix)
git pull origin main

# 4. Rebuild with the fix
make install

# 5. Backup and reinitialize chain
rm -rf ~/.mychain
./scripts/init_chain.sh

# 6. Restart the blockchain
sudo systemctl restart mychaind

# 7. Check status
sudo systemctl status mychaind
```

## Alternative: Use the Update Script

We've created an update script that handles everything:

```bash
# On your AWS instance:
cd ~/mychain
git pull origin main
./scripts/aws-update-instance.sh
```

## What These Fixes Do

### Power Reduction Fix
- Changes validator staking requirements to be achievable
- Minimum stake reduced from ~824,634 ALC to 1 ALC

### MainCoin Dev Address Fix
- Sets default dev_address to admin account: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`
- Ensures 0.01% dev fee is properly allocated on MainCoin purchases
- Fixes dashboard display inconsistencies

## Verification

After the update, verify both fixes are working:

```bash
# Check node is running
curl localhost:26657/status | jq .

# Verify MainCoin dev address is set
mychaind query maincoin params --output json | grep dev_address
# Should show: "dev_address": "cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"

# Test dev allocations with a purchase
mychaind tx maincoin buy-maincoin 1000utestusd --from admin --keyring-backend test --chain-id mychain -y

# Check if dev fee was allocated
mychaind query bank balances cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4

# View logs
sudo journalctl -u mychaind -f

# Access dashboard
# Open in browser: http://18.117.9.0:3000
```

## Important Notes

1. The chain data will be reset when you reinitialize
2. You'll need to recreate any validators after the update
3. The dashboard should automatically connect to the updated chain
4. Fresh start is recommended if your instance had empty dev_address
5. Dev allocations will now work correctly for all MainCoin purchases

## Next Steps

Once updated, you can:
1. Create validators with as little as 1 ALC
2. Delegate the 90,000 ALC to validators
3. Test the staking functionality properly
4. Test MainCoin purchases to verify dev allocations work
5. Monitor the dashboard for correct token values

## Rollback Instructions

If you need to rollback:

```bash
# View recent commits
cd ~/mychain
git log --oneline -5

# Rollback to previous commit
git reset --hard <previous-commit-hash>

# Rebuild
make install

# Restart services
sudo systemctl restart mychaind mychain-dashboard
```

## Key Addresses and Values

- **Admin Address**: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`
- **Initial MainCoin Price**: 0.0001 TestUSD
- **Price Increment**: 0.001 (0.1% per segment)
- **Dev Fee**: 0.0001 (0.01% of purchases)
- **Initial Supply**: 100,000 MC allocated to admin in genesis