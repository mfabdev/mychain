# MyChain Windows Installation Guide (via WSL2)

This guide provides detailed step-by-step instructions for installing MyChain on Windows using WSL2 (Windows Subsystem for Linux 2).

## Prerequisites

- Windows 10 version 2004 or higher, or Windows 11
- Administrator access to install WSL2
- At least 8GB RAM recommended
- 20GB free disk space

## Part 1: Install WSL2 on Windows

### Step 1: Check Windows Version
- Press `Windows + R`, type `winver`, press Enter
- Verify you have Windows 10 version 2004+ or Windows 11

### Step 2: Open PowerShell as Administrator
- Right-click Start button
- Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

### Step 3: Install WSL2
```powershell
wsl --install
```
- This installs WSL2 and Ubuntu by default
- Wait for completion (5-10 minutes)

### Step 4: Restart Your Computer
- Save all work and restart when prompted
- Required to complete WSL2 installation

### Step 5: Complete Ubuntu Setup
- Ubuntu terminal opens automatically after restart
- Create username (lowercase, no spaces)
- Create password (remember this for sudo commands)
- Wait for setup to complete

## Part 2: Install Prerequisites in WSL2

### Step 6: Update Ubuntu Packages
```bash
sudo apt update
sudo apt upgrade -y
```

### Step 7: Install Build Tools
```bash
sudo apt install -y build-essential git curl wget jq
```

### Step 8: Install Go 1.21.5
```bash
# Download Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz

# Extract to /usr/local
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz

# Clean up
rm go1.21.5.linux-amd64.tar.gz
```

### Step 9: Configure Go Environment
```bash
# Add Go to PATH
echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc

# Reload configuration
source ~/.bashrc

# Verify installation
go version
# Should show: go version go1.21.5 linux/amd64
```

## Part 3: Install MyChain from GitHub

### Step 10: Clone Repository
```bash
# Go to home directory
cd ~

# Clone from GitHub
git clone https://github.com/mfabdev/mychain.git

# Enter directory
cd mychain
```

### Step 11: Build and Install
```bash
# Build blockchain binary
make install
# This takes 2-5 minutes
```

### Step 12: Verify Installation
```bash
mychaind version
# Should show version number
```

## Part 4: Start the Blockchain

### Step 13: Initialize and Start
```bash
# Ensure you're in mychain directory
cd ~/mychain

# Start fresh blockchain
./scripts/unified-launch.sh --reset
```

This command will:
- Initialize the blockchain
- Create genesis accounts with tokens
- Start the node
- Initialize DEX module
- Launch web dashboard

### Step 14: Wait for Services
Look for output confirming:
- ✓ Node started successfully
- ✓ Web dashboard started on port 3000

## Part 5: Access Your Blockchain

### Step 15: Open Web Dashboard
- Open any browser on Windows
- Navigate to: http://localhost:3000

### Step 16: Available Endpoints
- Web Dashboard: http://localhost:3000
- REST API: http://localhost:1317
- RPC: http://localhost:26657

## Part 6: Common Operations

### Check if Running
```bash
ps aux | grep mychaind
```

### View Logs
```bash
# Blockchain logs
tail -f ~/.mychain/node.log

# Dashboard logs
tail -f ~/mychain/web-dashboard/dashboard.log
```

### Stop Blockchain
```bash
# Press Ctrl+C in running terminal, or:
pkill mychaind
```

### Restart Blockchain
```bash
cd ~/mychain
./scripts/unified-launch.sh
```

## Troubleshooting

### WSL2 Installation Issues
**Problem**: "wsl --install" not recognized
**Solution**: Update Windows or install WSL manually from Microsoft Store

### Cannot Access localhost:3000
**Problem**: Browser can't connect to dashboard
**Solutions**:
1. Verify services started properly
2. Check Windows Firewall settings
3. Restart WSL: `wsl --shutdown` then reopen Ubuntu

### Permission Errors
**Problem**: "Permission denied" errors
**Solutions**:
1. Use `sudo` for system commands
2. Stay in WSL filesystem (~/), avoid /mnt/c/

### Performance Issues
**Problem**: Slow compilation or runtime
**Solutions**:
1. Keep project files in WSL2 filesystem
2. Create `.wslconfig` in Windows user directory:
```ini
[wsl2]
memory=8GB
processors=4
```

### Finding WSL2 IP Address
If localhost doesn't work:
```bash
# In WSL2
ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
```

## Quick Commands Reference

```bash
# Start blockchain
cd ~/mychain && ./scripts/unified-launch.sh --reset

# Check status
mychaind status

# View balances
mychaind query bank balances cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a

# Stop everything
pkill mychaind
```

## Default Accounts

The genesis account with all tokens:
- Address: `cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a`
- Mnemonic: `tilt lemon salt paper winner market hockey bachelor obvious swap vapor tackle tennis napkin congress stamp suit tone barely napkin supply occur spawn kitten`

## Next Steps

1. Explore the web dashboard
2. Check token balances
3. Try DEX trading features
4. Read CANONICAL_BLOCKCHAIN_CONFIG.md for detailed configuration

## Support

- GitHub Issues: https://github.com/mfabdev/mychain/issues
- Configuration: See CANONICAL_BLOCKCHAIN_CONFIG.md
- Launch Script: See scripts/unified-launch.sh

## Quick Install Script

For experienced users, save and run this script in WSL2:

```bash
#!/bin/bash
curl -sSL https://raw.githubusercontent.com/mfabdev/mychain/main/install-from-github.sh | bash
```