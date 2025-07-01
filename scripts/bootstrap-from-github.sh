#!/bin/bash
#
# Bootstrap script to clone and launch MyChain from GitHub
# Can be run on a fresh Ubuntu server
#
# Usage: 
#   curl -sSL https://raw.githubusercontent.com/mfabdev/mychain/main/scripts/bootstrap-from-github.sh | bash
#   OR
#   wget -qO- https://raw.githubusercontent.com/mfabdev/mychain/main/scripts/bootstrap-from-github.sh | bash
#

set -e

echo "🚀 MyChain Bootstrap Script"
echo "=========================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Please run as a regular user, not root"
   exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    print_error "Unsupported OS: $OSTYPE"
    exit 1
fi

print_info "Detected OS: $OS ($DISTRO)"

# Install prerequisites
install_prerequisites() {
    print_info "Installing prerequisites..."
    
    if [ "$OS" == "linux" ]; then
        # Update package manager
        sudo apt update
        
        # Install basic tools
        sudo apt install -y curl wget git build-essential jq
        
        # Install Go if not present
        if ! command -v go &> /dev/null; then
            print_info "Installing Go..."
            GO_VERSION="1.21.5"
            wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
            sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
            rm go${GO_VERSION}.linux-amd64.tar.gz
            echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc
            export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin
        fi
        
        # Install Node.js if not present
        if ! command -v node &> /dev/null; then
            print_info "Installing Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
    elif [ "$OS" == "macos" ]; then
        # Install Homebrew if not present
        if ! command -v brew &> /dev/null; then
            print_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # Install tools
        brew install go node git jq
    fi
    
    print_status "Prerequisites installed"
}

# Clone and build MyChain
setup_mychain() {
    print_info "Setting up MyChain..."
    
    # Clone repository
    if [ -d "$HOME/mychain" ]; then
        print_info "MyChain directory exists, pulling latest changes..."
        cd $HOME/mychain
        git pull origin main
    else
        print_info "Cloning MyChain repository..."
        cd $HOME
        git clone https://github.com/mfabdev/mychain.git
        cd mychain
    fi
    
    # Build blockchain
    print_info "Building blockchain..."
    go mod tidy
    make install
    
    # Verify installation
    if ! command -v mychaind &> /dev/null; then
        print_error "mychaind not found in PATH. Adding to PATH..."
        echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
        export PATH=$PATH:$HOME/go/bin
    fi
    
    # Build web dashboard
    print_info "Building web dashboard..."
    cd web-dashboard
    npm install
    npm run build
    cd ..
    
    print_status "MyChain setup complete"
}

# Launch blockchain
launch_blockchain() {
    print_info "Launching blockchain..."
    
    cd $HOME/mychain
    
    # Detect if AWS
    AWS_FLAG=""
    if curl -s -m 2 http://169.254.169.254/latest/meta-data/instance-id &> /dev/null; then
        print_info "AWS environment detected"
        AWS_FLAG="--aws"
    fi
    
    # Launch with appropriate flags
    if [ "$1" == "--systemd" ]; then
        print_info "Setting up systemd service..."
        ./scripts/unified-launch.sh --reset $AWS_FLAG --systemd
        print_status "MyChain is running as a systemd service"
        print_info "Check status with: sudo systemctl status mychain"
    else
        ./scripts/unified-launch.sh --reset $AWS_FLAG
    fi
}

# Main execution
main() {
    echo ""
    print_info "This script will install and launch MyChain blockchain"
    print_info "Installation directory: $HOME/mychain"
    echo ""
    
    # Check for --systemd flag
    SYSTEMD_FLAG=""
    if [ "$1" == "--systemd" ]; then
        SYSTEMD_FLAG="--systemd"
    fi
    
    # Install prerequisites
    install_prerequisites
    
    # Setup MyChain
    setup_mychain
    
    # Launch
    launch_blockchain $SYSTEMD_FLAG
    
    echo ""
    print_status "MyChain installation complete!"
    echo ""
    echo "📍 Access points:"
    echo "   - RPC: http://localhost:26657"
    echo "   - Web Dashboard: http://localhost:3000"
    echo "   - Terminal Server: http://localhost:3003"
    
    if curl -s -m 2 http://169.254.169.254/latest/meta-data/public-ipv4 &> /dev/null; then
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
        echo ""
        echo "   Public access:"
        echo "   - RPC: http://$PUBLIC_IP:26657"
        echo "   - Web Dashboard: http://$PUBLIC_IP:3000"
    fi
    
    echo ""
    echo "🔧 Useful commands:"
    echo "   - Check status: mychaind status"
    echo "   - View logs: tail -f ~/.mychain/mychain.log"
    if [ "$SYSTEMD_FLAG" == "--systemd" ]; then
        echo "   - Service logs: sudo journalctl -u mychain -f"
    fi
    echo ""
}

# Run main function
main "$@"