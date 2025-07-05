# MyChain Windows Installation Guide

## Option 1: WSL2 (Recommended)

### Prerequisites
- Windows 10 version 2004+ or Windows 11
- Administrator access

### Step 1: Install WSL2

1. Open PowerShell as Administrator and run:
```powershell
wsl --install
```

2. Restart your computer when prompted

3. After restart, Ubuntu will automatically open. Create your Linux username and password.

### Step 2: Install MyChain in WSL2

Open Ubuntu terminal and run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y build-essential git curl wget jq

# Install Go 1.21.5
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
rm go1.21.5.linux-amd64.tar.gz

# Add Go to PATH
echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify Go installation
go version

# Clone MyChain repository
git clone https://github.com/mfabdev/mychain.git
cd mychain

# Build and install
make install

# Start the blockchain
./scripts/unified-launch.sh --reset
```

### Step 3: Access MyChain from Windows

Once running, you can access:
- Web Dashboard: http://localhost:3000
- REST API: http://localhost:1317
- RPC: http://localhost:26657

## Option 2: Docker Desktop (Alternative)

### Prerequisites
- Docker Desktop for Windows
- WSL2 backend enabled in Docker Desktop

### Step 1: Install Docker Desktop
1. Download from https://www.docker.com/products/docker-desktop/
2. Install and ensure WSL2 backend is enabled

### Step 2: Create Dockerfile

Create a file named `Dockerfile.windows`:

```dockerfile
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git make gcc musl-dev linux-headers

WORKDIR /app
RUN git clone https://github.com/mfabdev/mychain.git .
RUN make install

FROM alpine:latest

RUN apk add --no-cache ca-certificates bash
COPY --from=builder /go/bin/mychaind /usr/local/bin/

EXPOSE 1317 26656 26657 9090 9091

WORKDIR /root
```

### Step 3: Build and Run

```powershell
# Build image
docker build -f Dockerfile.windows -t mychain .

# Run container
docker run -it -p 1317:1317 -p 26656:26656 -p 26657:26657 -p 3000:3000 mychain bash

# Inside container, initialize and start
mychaind init mynode --chain-id mychain
# ... (run initialization commands)
```

## Option 3: Native Windows Build (Advanced)

### Prerequisites
- Go 1.21+ for Windows
- Git for Windows
- MinGW-w64 or MSYS2

### Challenges
- Some Cosmos SDK dependencies may not compile natively on Windows
- File path differences between Windows and Unix
- Network stack differences

### Basic Steps
1. Install Go from https://go.dev/dl/
2. Install Git from https://git-scm.com/download/win
3. Install MinGW-w64 from https://www.mingw-w64.org/
4. Clone and attempt build:
```cmd
git clone https://github.com/mfabdev/mychain.git
cd mychain
go mod download
go install ./cmd/mychaind
```

**Note**: Native Windows builds often encounter issues with Cosmos SDK. WSL2 is strongly recommended.

## Troubleshooting

### WSL2 Issues

1. **WSL2 not installing**: Ensure virtualization is enabled in BIOS
2. **Network issues**: Run `wsl --shutdown` and restart WSL2
3. **Permission errors**: Always use Linux file paths inside WSL (~/mychain not /mnt/c/...)

### Port Access Issues

If localhost doesn't work, find WSL2 IP:
```bash
# In WSL2
ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
```

Then access using that IP instead of localhost.

### Performance Tips

1. Keep project files in WSL2 filesystem (not /mnt/c/)
2. Use Windows Terminal for better performance
3. Allocate more resources to WSL2 if needed:

Create `.wslconfig` in Windows user directory:
```ini
[wsl2]
memory=8GB
processors=4
```

## Quick Start Script for WSL2

Save this as `install-mychain.sh` in your WSL2 home directory:

```bash
#!/bin/bash
curl -sSL https://raw.githubusercontent.com/mfabdev/mychain/main/install-from-github.sh | bash
```

Then run:
```bash
chmod +x install-mychain.sh
./install-mychain.sh
```