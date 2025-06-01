# AWS EC2 Deployment Guide for MyChain Blockchain

This guide walks you through deploying the MyChain blockchain on an AWS EC2 Large instance.

## Prerequisites

- AWS Account with EC2 access
- SSH key pair created in AWS
- Basic knowledge of AWS EC2 and Linux

## Recommended Instance Types

### For Production
- **t3.large**: 2 vCPUs, 8 GB RAM (Cost-effective)
- **m5.large**: 2 vCPUs, 8 GB RAM (Better performance)
- **c5.large**: 2 vCPUs, 4 GB RAM (Compute optimized)

### For Testing
- **t3.medium**: 2 vCPUs, 4 GB RAM (Minimum recommended)

## Step 1: Launch EC2 Instance

1. **Login to AWS Console**
   - Navigate to EC2 Dashboard
   - Click "Launch Instance"

2. **Configure Instance**
   - **Name**: MyChain-Node
   - **AMI**: Ubuntu Server 22.04 LTS (64-bit x86)
   - **Instance Type**: t3.large
   - **Key Pair**: Select or create SSH key
   - **Network Settings**:
     - Allow SSH (port 22)
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow Custom TCP (ports 26656, 26657, 1317, 9090, 3000)
   - **Storage**: 100 GB gp3 SSD

3. **Security Group Rules**
   ```
   SSH         TCP  22      Your IP
   HTTP        TCP  80      0.0.0.0/0
   HTTPS       TCP  443     0.0.0.0/0
   P2P         TCP  26656   0.0.0.0/0
   RPC         TCP  26657   0.0.0.0/0
   API         TCP  1317    0.0.0.0/0
   gRPC        TCP  9090    0.0.0.0/0
   Dashboard   TCP  3000    0.0.0.0/0
   ```

## Step 2: Connect to Instance

```bash
# Replace with your key file and instance IP
ssh -i "your-key.pem" ubuntu@your-instance-ip
```

## Step 3: Install Dependencies

Run these commands on your EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y build-essential git curl wget jq make gcc g++ nano

# Install Go 1.21
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc
source ~/.bashrc
go version

# Install Node.js 18 for dashboard
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

## Step 4: Clone and Build Blockchain

```bash
# Clone the repository
cd ~
git clone https://github.com/mfabdev/mychain.git
cd mychain

# Build the blockchain
make install

# Verify installation
mychaind version
```

## Step 5: Deploy with Fresh Start Script

```bash
# Navigate to mychain directory
cd ~/mychain

# Make scripts executable
chmod +x setup.sh
chmod +x scripts/*.sh

# Run the setup
./setup.sh
```

## Step 6: Configure for Production

### Enable API Access from External IPs

```bash
# Edit app.toml
nano ~/.mychain/config/app.toml
```

Update these settings:
```toml
[api]
enable = true
address = "tcp://0.0.0.0:1317"  # Changed from localhost

[grpc]
enable = true
address = "0.0.0.0:9090"  # Changed from localhost
```

### Configure P2P Network

```bash
# Edit config.toml
nano ~/.mychain/config/config.toml
```

Update:
```toml
[p2p]
laddr = "tcp://0.0.0.0:26656"
external_address = "YOUR_EC2_PUBLIC_IP:26656"
```

### Set Minimum Gas Prices

```bash
# Edit app.toml
nano ~/.mychain/config/app.toml
```

Set:
```toml
minimum-gas-prices = "0.001alc"
```

## Step 7: Create Systemd Service

Create a service file for automatic startup:

```bash
sudo nano /etc/systemd/system/mychaind.service
```

Add:
```ini
[Unit]
Description=MyChain Node
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/go/bin/mychaind start --minimum-gas-prices 0.001alc
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mychaind
sudo systemctl start mychaind
sudo systemctl status mychaind
```

## Step 8: Setup Dashboard Service

```bash
# Navigate to dashboard
cd ~/mychain/web-dashboard  # Adjust path as needed
npm install

# Create dashboard service
sudo nano /etc/systemd/system/mychain-dashboard.service
```

Add:
```ini
[Unit]
Description=MyChain Dashboard
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/mychain/web-dashboard
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mychain-dashboard
sudo systemctl start mychain-dashboard
```

## Step 9: Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/mychain
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Dashboard
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:1317;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # RPC
    location /rpc {
        proxy_pass http://localhost:26657;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mychain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 10: Monitoring and Logs

### View Logs
```bash
# Blockchain logs
sudo journalctl -u mychaind -f

# Dashboard logs
sudo journalctl -u mychain-dashboard -f

# Traditional log files
tail -f ~/.mychain/node.log
```

### Check Status
```bash
# Node status
curl localhost:26657/status | jq .

# Check sync status
mychaind status

# Check balances
mychaind query bank balances cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4
```

## Step 11: Backup and Security

### Backup Keys
```bash
# Backup validator key
cp ~/.mychain/config/priv_validator_key.json ~/validator-backup.json

# Backup node key
cp ~/.mychain/config/node_key.json ~/node-backup.json
```

### Security Hardening
```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 26656/tcp
sudo ufw allow 26657/tcp
sudo ufw allow 1317/tcp
sudo ufw allow 9090/tcp
sudo ufw allow 3000/tcp
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install -y fail2ban
```

## Access Your Blockchain

Once deployed, access your blockchain:

- **Dashboard**: http://YOUR_EC2_IP:3000
- **RPC**: http://YOUR_EC2_IP:26657
- **API**: http://YOUR_EC2_IP:1317
- **gRPC**: YOUR_EC2_IP:9090

## Troubleshooting

### Node Won't Start
```bash
# Check logs
sudo journalctl -u mychaind -n 100

# Check if port is in use
sudo lsof -i :26657

# Restart service
sudo systemctl restart mychaind
```

### Dashboard Issues
```bash
# Check dashboard logs
sudo journalctl -u mychain-dashboard -n 100

# Rebuild dashboard
cd ~/mychain/web-dashboard
npm install
sudo systemctl restart mychain-dashboard
```

### Connection Issues
- Verify security group rules
- Check instance public IP
- Ensure services are running
- Check firewall settings

## Maintenance

### Update Blockchain
```bash
cd ~/mychain
git pull
# Rebuild if needed
make install
sudo systemctl restart mychaind
```

### Monitor Disk Usage
```bash
df -h
du -sh ~/.mychain
```

### Regular Backups
Set up automated backups of:
- Validator keys
- Node data
- Configuration files

## Cost Optimization

- Use Reserved Instances for long-term savings
- Enable CloudWatch monitoring
- Set up auto-scaling if needed
- Use Elastic IPs for consistent addressing

## Next Steps

1. Set up domain name with Route 53
2. Enable SSL with Let's Encrypt
3. Set up monitoring with CloudWatch
4. Configure automated backups
5. Join validator set if applicable