# MyChain AWS Deployment Guide

## Overview
This guide covers deploying MyChain blockchain on AWS EC2 using the official configuration.

**Prerequisites**: MYCHAIN_OFFICIAL_CONFIGURATION.md and MYCHAIN_CLEANLAUNCH.sh

## Recommended EC2 Instance

### Production
- **Type**: t3.large (2 vCPUs, 8 GB RAM)
- **Storage**: 100 GB gp3 SSD  
- **OS**: Ubuntu Server 22.04 LTS

### Testing
- **Type**: t3.medium (2 vCPUs, 4 GB RAM)
- **Storage**: 50 GB gp3

## Security Group Configuration

| Type | Protocol | Port | Source | Purpose |
|------|----------|------|---------|----------|
| SSH | TCP | 22 | Your IP | Admin access |
| Custom TCP | TCP | 26656 | 0.0.0.0/0 | P2P |
| Custom TCP | TCP | 26657 | 0.0.0.0/0 | RPC |
| Custom TCP | TCP | 1317 | 0.0.0.0/0 | REST API |
| Custom TCP | TCP | 9090 | 0.0.0.0/0 | gRPC |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | Web Dashboard |

## Deployment Steps

### 1. Connect to EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

### 2. Install Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y build-essential git curl python3 python3-pip

# Install Go 1.21
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Node.js 18 (for web dashboard)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone and Build MyChain
```bash
# Clone repository
git clone https://github.com/your-org/mychain.git
cd mychain

# Build blockchain
make install

# Verify installation
mychaind version
```

### 4. Deploy Blockchain
```bash
# Copy the official startup script
wget https://raw.githubusercontent.com/your-org/mychain/main/MYCHAIN_CLEANLAUNCH.sh
chmod +x MYCHAIN_CLEANLAUNCH.sh

# Run the blockchain
./MYCHAIN_CLEANLAUNCH.sh
```

### 5. Create Systemd Service
```bash
sudo tee /etc/systemd/system/mychain.service > /dev/null <<EOF
[Unit]
Description=MyChain Blockchain Node
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

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mychain
sudo systemctl start mychain
```

### 6. Deploy Web Dashboard (Optional)
```bash
cd ~/mychain/web-dashboard
npm install

# Configure for production
cat > .env <<EOF
REACT_APP_RPC_ENDPOINT=http://your-instance-ip:26657
REACT_APP_REST_ENDPOINT=http://your-instance-ip:1317
EOF

# Build dashboard
npm run build

# Install serve
sudo npm install -g serve

# Create dashboard service
sudo tee /etc/systemd/system/mychain-dashboard.service > /dev/null <<EOF
[Unit]
Description=MyChain Web Dashboard
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

### Check Services
```bash
# Blockchain status
sudo systemctl status mychain
sudo journalctl -u mychain -f

# Dashboard status
sudo systemctl status mychain-dashboard
```

### Verify Blockchain
```bash
# Check if running correctly
curl http://localhost:26657/status | jq '.result.node_info.network'
# Should show: "mychain"

# Check token supply
curl http://localhost:1317/cosmos/bank/v1beta1/supply | jq '.supply[].denom'
# Should show: "ulc", "umc", "utusd"

# Check inflation
curl http://localhost:1317/cosmos/mint/v1beta1/inflation
# Should show: "1.000000000000000000"
```

## Backup

### Backup Keys
```bash
# Keys are automatically saved during setup
ls ~/admin_key_backup.json ~/validator_key_backup.json

# Download to local machine
scp -i your-key.pem ubuntu@your-instance-ip:~/admin_key_backup.json ./
scp -i your-key.pem ubuntu@your-instance-ip:~/validator_key_backup.json ./
```

### Backup Chain Data
```bash
# Stop node
sudo systemctl stop mychain

# Create backup
tar -czf mychain-backup-$(date +%Y%m%d-%H%M%S).tar.gz ~/.mychain

# Restart node
sudo systemctl start mychain
```

## Troubleshooting

### Node Won't Start
```bash
# Check logs
sudo journalctl -u mychain -n 100 --no-pager

# Common fixes:
# 1. Ensure ports are not in use: sudo lsof -i :26657
# 2. Check permissions: ls -la ~/.mychain
# 3. Verify configuration: cat ~/.mychain/config/genesis.json | jq '.chain_id'
```

### Can't Access from Outside
1. Check security group allows required ports
2. Verify node is bound to 0.0.0.0, not 127.0.0.1:
   ```bash
   grep laddr ~/.mychain/config/config.toml
   grep address ~/.mychain/config/app.toml
   ```

### Wrong Denominations
If you see `alc`, `maincoin`, or `utestusd`:
```bash
# Stop services
sudo systemctl stop mychain mychain-dashboard

# Clean and restart
rm -rf ~/.mychain
./MYCHAIN_CLEANLAUNCH.sh
```

## Cost Optimization

- Use t3.large with savings plan for 30-50% discount
- Enable CloudWatch monitoring only for critical metrics
- Use lifecycle policies for backup retention
- Consider spot instances for test environments

---

**Always refer to MYCHAIN_OFFICIAL_CONFIGURATION.md for the correct configuration values.**