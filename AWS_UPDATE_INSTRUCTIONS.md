# AWS Instance Update Instructions

Your AWS instance at **18.117.9.0** needs to be updated with the power reduction fix.

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

## What This Fix Does

The power reduction fix changes the validator staking requirements:
- **Before**: Minimum stake was ~824,634 ALC (more than total supply!)
- **After**: Minimum stake is now 1 ALC (achievable with 100,000 ALC supply)

## Verification

After the update, verify the fix is working:

```bash
# Check node is running
curl localhost:26657/status | jq .

# View logs
sudo journalctl -u mychaind -f

# Access dashboard
# Open in browser: http://18.117.9.0:3000
```

## Important Notes

1. The chain data will be reset when you reinitialize
2. You'll need to recreate any validators after the update
3. The dashboard should automatically connect to the updated chain

## Next Steps

Once updated, you can:
1. Create validators with as little as 1 ALC
2. Delegate the 90,000 ALC to validators
3. Test the staking functionality properly