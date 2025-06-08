# MyChain Deployment Guide

## Overview
This guide covers deploying MyChain blockchain both locally and on AWS using the canonical startup script.

## Canonical Configuration

All deployments use these exact values:
- **LiquidityCoin**: 100,000 LC (ulc denom, 90,000 staked)
- **MainCoin**: 100,000 MC (umaincoin denom)
- **TestUSD**: 100,000 TUSD (utestusd denom)
- **Chain ID**: mychain
- **SDK Minting**: 100% initial, 7-100% range, 50% goal

## Local Deployment

### Prerequisites
- Go 1.21+
- Node.js 18+
- Python 3.6+
- Git

### Steps

1. **Clone and build**:
```bash
cd /path/to/mychain
make install
```

2. **Run canonical startup**:
```bash
./CANONICAL_STARTUP.sh
```

3. **Verify deployment**:
```bash
# Check node status
curl http://localhost:26657/status

# Check token supply
curl http://localhost:1317/cosmos/bank/v1beta1/supply
```

4. **Start web dashboard**:
```bash
cd web-dashboard
npm install
npm start
```

## AWS Deployment

### Prerequisites
- AWS EC2 instance (t3.large or larger)
- Ubuntu 22.04 LTS
- Security groups allowing ports: 22, 26657, 1317, 3000

### Initial Setup

1. **Connect to EC2**:
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

2. **Install dependencies**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y build-essential git python3
```

3. **Clone repository**:
```bash
git clone https://github.com/yourusername/mychain.git
cd mychain
```

4. **Build blockchain**:
```bash
make install
```

### Deploy Blockchain

1. **Run canonical startup**:
```bash
./CANONICAL_STARTUP.sh
```

2. **Configure firewall** (if using UFW):
```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 26657/tcp  # RPC
sudo ufw allow 1317/tcp   # API
sudo ufw allow 3000/tcp   # Dashboard
sudo ufw enable
```

3. **Create systemd service**:
```bash
sudo tee /etc/systemd/system/mychain.service > /dev/null <<EOF
[Unit]
Description=MyChain Node
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/go/bin/mychaind start
Restart=on-failure
RestartSec=10
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mychain
sudo systemctl start mychain
```

4. **Deploy web dashboard**:
```bash
cd ~/mychain/web-dashboard
npm install

# Create .env for production
echo "REACT_APP_RPC_ENDPOINT=http://your-instance-ip:26657" > .env
echo "REACT_APP_REST_ENDPOINT=http://your-instance-ip:1317" >> .env

# Build for production
npm run build

# Install serve
sudo npm install -g serve

# Create systemd service for dashboard
sudo tee /etc/systemd/system/mychain-dashboard.service > /dev/null <<EOF
[Unit]
Description=MyChain Dashboard
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/mychain/web-dashboard
ExecStart=/usr/bin/serve -s build -l 3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mychain-dashboard
sudo systemctl start mychain-dashboard
```

## Monitoring

### Check services:
```bash
# Blockchain status
sudo systemctl status mychain
sudo journalctl -u mychain -f

# Dashboard status  
sudo systemctl status mychain-dashboard
```

### Check endpoints:
```bash
# From server
curl http://localhost:26657/status
curl http://localhost:1317/cosmos/bank/v1beta1/supply

# From outside (replace with your IP)
curl http://your-instance-ip:26657/status
curl http://your-instance-ip:1317/cosmos/bank/v1beta1/supply
```

## Backup and Recovery

### Backup keys:
```bash
# Keys are saved in ~/admin_key_backup.txt and ~/validator_key_backup.txt
# Copy these to a secure location
```

### Backup chain data:
```bash
# Stop node
sudo systemctl stop mychain

# Backup data
tar -czf mychain-backup-$(date +%Y%m%d).tar.gz ~/.mychain

# Restart node
sudo systemctl start mychain
```

### Restore from backup:
```bash
# Stop node
sudo systemctl stop mychain

# Remove current data
rm -rf ~/.mychain

# Restore from backup
tar -xzf mychain-backup-YYYYMMDD.tar.gz -C ~/

# Start node
sudo systemctl start mychain
```

## Troubleshooting

### Node won't start:
```bash
# Check logs
tail -f ~/mychain.log
sudo journalctl -u mychain -n 100

# Common issues:
# - Port already in use: sudo lsof -i :26657
# - Permissions: chown -R ubuntu:ubuntu ~/.mychain
```

### Can't access from outside:
```bash
# Check AWS security group allows ports
# Check node is bound to 0.0.0.0 not 127.0.0.1
grep laddr ~/.mychain/config/config.toml
grep address ~/.mychain/config/app.toml
```

### Web dashboard issues:
```bash
# Check if built correctly
ls -la ~/mychain/web-dashboard/build

# Check environment variables
cat ~/mychain/web-dashboard/.env

# Rebuild if needed
cd ~/mychain/web-dashboard
npm run build
sudo systemctl restart mychain-dashboard
```

## Important Notes

1. **Security**: 
   - Keep your validator keys secure
   - Use strong passwords for server access
   - Regularly update system packages

2. **Monitoring**:
   - Set up alerts for node downtime
   - Monitor disk space (blockchain grows over time)
   - Track validator performance

3. **Updates**:
   - Always backup before updates
   - Test updates on local first
   - Plan maintenance windows

## Quick Commands Reference

```bash
# Start blockchain
./CANONICAL_STARTUP.sh

# Check status
curl http://localhost:26657/status | jq .

# Get token supply
curl http://localhost:1317/cosmos/bank/v1beta1/supply | jq .

# View logs
tail -f ~/mychain.log

# Restart services (AWS)
sudo systemctl restart mychain
sudo systemctl restart mychain-dashboard
```