# MyChain Deployment Guide

This guide provides comprehensive instructions for deploying MyChain blockchain on various environments.

## Quick Start

### Local Development
```bash
chmod +x scripts/launch-blockchain.sh
./scripts/launch-blockchain.sh --reset
```

### AWS Deployment
```bash
chmod +x scripts/aws-deploy.sh
./scripts/aws-deploy.sh
```

## Scripts Overview

### 1. launch-blockchain.sh
A comprehensive single-command script that handles the entire blockchain initialization and launch process.

**Features:**
- Automatic dependency checking
- Clean initialization with proper genesis configuration
- Account creation (validator and admin)
- DEX module initialization with correct parameters
- Trading pair creation
- Node configuration optimization
- Systemd service creation (if available)
- Comprehensive verification and status reporting

**Key Improvements:**
- Fixed token denomination issues (1 token = 1,000,000 micro-units)
- Proper DEX parameter initialization (base_reward_rate: 222 for 7% annual)
- Automated module initialization after node startup
- Better error handling and logging

### 2. aws-deploy.sh
A complete AWS EC2 deployment script that sets up the entire infrastructure.

**Features:**
- System dependency installation
- Go and Node.js installation
- Repository cloning and building
- Web dashboard build and deployment
- Nginx reverse proxy configuration
- Firewall setup with UFW
- Monitoring and alerting setup
- Automatic backup configuration
- SSL/TLS ready configuration

**Security Features:**
- RPC/API access only through Nginx proxy
- Firewall rules properly configured
- Monitoring for node health
- Automated daily backups

## Configuration Details

### Token Configuration
```
LC (LiquidityCoin): 100,000 tokens = 100,000,000,000 ulc
MC (MainCoin): 100,000 tokens = 100,000,000,000 umc
TUSD (TestUSD): 100,000 tokens = 100,000,000,000 utestusd
```

### DEX Parameters
```json
{
  "base_reward_rate": "222",              // 7% annual LC rewards
  "base_transfer_fee_percentage": "5000000000000000",  // 0.5%
  "lc_denom": "ulc",
  "lc_exchange_rate": "100000000000000",  // 0.0001 MC per LC
  "lc_initial_supply": "100000",          // 100,000 LC
  "min_order_amount": "1000000"           // 1 TUSD minimum
}
```

### SDK Minting Parameters
```json
{
  "mint_denom": "ulc",
  "inflation_rate_change": "0.930000000000000000",
  "inflation_max": "1.000000000000000000",
  "inflation_min": "0.070000000000000000",
  "goal_bonded": "0.500000000000000000",
  "blocks_per_year": "6311520"
}
```

## Common Issues and Solutions

### Issue 1: DEX Parameters Showing as Zero
**Solution:** The launch script now properly initializes DEX parameters in genesis and runs init-dex-state after node startup.

### Issue 2: Wrong Token Amounts
**Solution:** All token amounts are now correctly calculated using the 1:1,000,000 ratio.

### Issue 3: Node Won't Start
**Solution:** The script now checks for existing processes and data, with a --reset flag for clean starts.

### Issue 4: Can't Access API/RPC Remotely
**Solution:** AWS deployment uses Nginx reverse proxy for secure access.

## Monitoring and Maintenance

### Check Node Status
```bash
mychaind status
```

### View Logs
```bash
# Systemd
sudo journalctl -u mychaind -f

# Background process
tail -f ~/.mychain/node.log
```

### Manual Backup
```bash
~/mychain/scripts/backup.sh
```

### Restart Node
```bash
# Systemd
sudo systemctl restart mychaind

# Background process
pkill -f mychaind
./scripts/launch-blockchain.sh
```

## AWS-Specific Information

### Security Groups
Ensure your AWS security group allows:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 26656 (P2P)

### Instance Recommendations
- Minimum: t3.medium (2 vCPU, 4 GB RAM)
- Recommended: t3.large (2 vCPU, 8 GB RAM)
- Production: c5.xlarge or larger

### Storage
- Minimum: 30 GB SSD
- Recommended: 100 GB SSD with provisioned IOPS

## Next Steps

1. **Configure DNS**: Point your domain to the server IP
2. **Enable SSL**: Run `sudo certbot --nginx` after DNS is configured
3. **Set Up Monitoring**: Configure webhook URLs in monitor.sh
4. **Configure Backups**: Set S3 bucket name in backup.sh
5. **Scale Horizontally**: Add more validator nodes

## Support

For issues or questions:
- Check logs first: `sudo journalctl -u mychaind -f`
- Review this guide and scripts
- Check GitHub issues: https://github.com/mfabdev/mychain/issues