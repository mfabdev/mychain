#!/bin/bash

echo "🚀 MyChain Complete Setup - One Command Installation"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_step "Checking prerequisites..."

if ! command_exists go; then
    print_error "Go is not installed. Please install Go 1.21+ from https://golang.org/doc/install"
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm (comes with Node.js)"
    exit 1
fi

print_success "All prerequisites found"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

print_step "Building the blockchain..."
cd "$PROJECT_DIR"
if ! make install; then
    print_error "Failed to build blockchain"
    exit 1
fi
print_success "Blockchain built successfully"

print_step "Initializing blockchain with correct economic model..."
if ! "$SCRIPT_DIR/init_chain.sh"; then
    print_error "Failed to initialize blockchain"
    exit 1
fi
print_success "Blockchain initialized"

print_step "Installing web dashboard dependencies..."
cd "$PROJECT_DIR/web-dashboard"
if ! npm install --silent; then
    print_error "Failed to install dashboard dependencies"
    exit 1
fi
print_success "Dashboard dependencies installed"

print_step "Starting the blockchain node..."
cd "$PROJECT_DIR"
nohup "$SCRIPT_DIR/start_node.sh" > setup.log 2>&1 &
sleep 10

# Check if node started successfully
if ! curl -s http://localhost:26657/status > /dev/null 2>&1; then
    print_error "Blockchain node failed to start"
    print_warning "Check setup.log for details"
    exit 1
fi
print_success "Blockchain node started"

print_step "Starting web dashboard..."
cd "$PROJECT_DIR/web-dashboard"
nohup npm start > dashboard-setup.log 2>&1 &
DASHBOARD_PID=$!

# Wait for dashboard to start
print_step "Waiting for dashboard to compile..."
sleep 30

# Check if dashboard is accessible
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Dashboard started successfully"
else
    print_warning "Dashboard may still be starting up"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo -e "${GREEN}✅ Blockchain Status:${NC}"
echo "   • Node: Running on ports 26657 (RPC), 1317 (API), 9090 (gRPC)"
echo "   • Blocks: Producing every ~5 seconds"
echo ""
echo -e "${GREEN}✅ Web Dashboard:${NC}"
echo "   • URL: http://localhost:3000"
echo "   • Status: Starting up (may take 1-2 minutes to fully load)"
echo ""
echo -e "${GREEN}✅ Economic Model:${NC}"
echo "   • LiquidityCoin: 100,000 ALC (90,000 staked)"
echo "   • MainCoin: 100,000 MC @ \$0.0001 each"
echo "   • TestUSD: 1,000 for trading"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Install Keplr browser extension: https://www.keplr.app/"
echo "2. Open dashboard: http://localhost:3000"
echo "3. Click 'Connect Keplr' and approve chain addition"
echo "4. Your wallet will show your token balances"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "   • Stop node: ./scripts/stop_node.sh"
echo "   • Restart node: ./scripts/start_node.sh" 
echo "   • View logs: tail -f setup.log"
echo "   • Reset chain: rm -rf ~/.mychain && ./scripts/init_chain.sh"
echo ""
echo -e "${YELLOW}📋 Test Account:${NC}"
echo "   • Address: cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"
echo "   • Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
echo "   • ⚠️  FOR DEVELOPMENT ONLY - Never use for real funds!"
echo ""

# Open browser automatically if possible
if command_exists xdg-open; then
    print_step "Opening dashboard in browser..."
    xdg-open http://localhost:3000 2>/dev/null || true
elif command_exists open; then
    print_step "Opening dashboard in browser..."
    open http://localhost:3000 2>/dev/null || true
fi

print_success "MyChain setup completed successfully! 🚀"
echo ""
echo "Happy developing! 💫"