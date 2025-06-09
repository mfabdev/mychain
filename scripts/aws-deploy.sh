#!/bin/bash
#
# MyChain AWS Deployment Script
# This script handles complete deployment on AWS EC2 instances
# Usage: ./aws-deploy.sh
#

set -e

# Configuration
GOLANG_VERSION="1.21.5"
NODE_VERSION="18.20.0"
REPO_URL="https://github.com/mfabdev/mychain.git"
BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

install_dependencies() {
    log_info "Installing system dependencies..."
    
    sudo apt-get update
    sudo apt-get install -y \
        build-essential \
        git \
        curl \
        wget \
        jq \
        make \
        gcc \
        g++ \
        python3 \
        python3-pip \
        nginx \
        certbot \
        python3-certbot-nginx \
        supervisor
}

install_golang() {
    log_info "Installing Go $GOLANG_VERSION..."
    
    if command -v go &> /dev/null; then
        log_info "Go already installed: $(go version)"
        return
    fi
    
    wget https://go.dev/dl/go${GOLANG_VERSION}.linux-amd64.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf go${GOLANG_VERSION}.linux-amd64.tar.gz
    rm go${GOLANG_VERSION}.linux-amd64.tar.gz
    
    # Add to PATH
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
    source ~/.bashrc
    
    log_info "Go installed: $(go version)"
}

install_nodejs() {
    log_info "Installing Node.js $NODE_VERSION..."
    
    if command -v node &> /dev/null; then
        log_info "Node.js already installed: $(node --version)"
        return
    fi
    
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION
    
    log_info "Node.js installed: $(node --version)"
}

clone_repository() {
    log_info "Cloning MyChain repository..."
    
    cd ~
    if [ -d "mychain" ]; then
        log_info "Repository already exists, pulling latest..."
        cd mychain
        git fetch --all
        git checkout $BRANCH
        git pull origin $BRANCH
    else
        git clone $REPO_URL
        cd mychain
        git checkout $BRANCH
    fi
}

build_blockchain() {
    log_info "Building MyChain binary..."
    
    cd ~/mychain
    make install
    
    # Verify installation
    if ! command -v mychaind &> /dev/null; then
        log_error "mychaind binary not found after build"
        exit 1
    fi
    
    log_info "MyChain built successfully: $(mychaind version)"
}

build_web_dashboard() {
    log_info "Building web dashboard..."
    
    cd ~/mychain/web-dashboard
    npm install
    npm run build
    
    # Copy build to nginx directory
    sudo rm -rf /var/www/mychain
    sudo mkdir -p /var/www/mychain
    sudo cp -r build/* /var/www/mychain/
}

configure_nginx() {
    log_info "Configuring Nginx..."
    
    # Get public IP
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    sudo tee /etc/nginx/sites-available/mychain > /dev/null << EOF
server {
    listen 80;
    server_name $PUBLIC_IP;
    
    # Web Dashboard
    location / {
        root /var/www/mychain;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:1317/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
    }
    
    # RPC Proxy
    location /rpc/ {
        proxy_pass http://localhost:26657/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/mychain /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
}

configure_firewall() {
    log_info "Configuring firewall..."
    
    # Allow SSH
    sudo ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow P2P
    sudo ufw allow 26656/tcp
    
    # Allow RPC (only from localhost by default)
    # sudo ufw allow 26657/tcp  # Uncomment if external RPC access needed
    
    # Allow API (only from localhost by default)
    # sudo ufw allow 1317/tcp   # Uncomment if external API access needed
    
    # Allow gRPC (only from localhost by default)
    # sudo ufw allow 9090/tcp   # Uncomment if external gRPC access needed
    
    sudo ufw --force enable
    log_info "Firewall configured"
}

setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create monitoring script
    cat > ~/mychain/scripts/monitor.sh << 'EOF'
#!/bin/bash
# MyChain monitoring script

WEBHOOK_URL=""  # Add Discord/Slack webhook URL if desired

check_node_status() {
    if ! pgrep -f mychaind > /dev/null; then
        echo "$(date): Node is not running!"
        # Send alert if webhook configured
        if [ ! -z "$WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"content\":\"⚠️ MyChain node is down!\"}" \
                $WEBHOOK_URL
        fi
        # Try to restart
        sudo systemctl restart mychaind
    fi
}

check_block_production() {
    HEIGHT1=$(mychaind status 2>/dev/null | jq -r '.sync_info.latest_block_height' || echo "0")
    sleep 30
    HEIGHT2=$(mychaind status 2>/dev/null | jq -r '.sync_info.latest_block_height' || echo "0")
    
    if [ "$HEIGHT1" == "$HEIGHT2" ]; then
        echo "$(date): Block production stalled at height $HEIGHT1"
        # Send alert if webhook configured
        if [ ! -z "$WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"content\":\"⚠️ MyChain block production stalled at height $HEIGHT1\"}" \
                $WEBHOOK_URL
        fi
    fi
}

# Main monitoring loop
while true; do
    check_node_status
    check_block_production
    sleep 300  # Check every 5 minutes
done
EOF
    
    chmod +x ~/mychain/scripts/monitor.sh
    
    # Create supervisor config for monitoring
    sudo tee /etc/supervisor/conf.d/mychain-monitor.conf > /dev/null << EOF
[program:mychain-monitor]
command=/home/ubuntu/mychain/scripts/monitor.sh
autostart=true
autorestart=true
stderr_logfile=/var/log/mychain-monitor.err.log
stdout_logfile=/var/log/mychain-monitor.out.log
user=ubuntu
EOF
    
    sudo supervisorctl reread
    sudo supervisorctl update
}

launch_blockchain() {
    log_info "Launching blockchain..."
    
    cd ~/mychain
    chmod +x scripts/launch-blockchain.sh
    ./scripts/launch-blockchain.sh --reset
}

create_backup_script() {
    log_info "Creating backup script..."
    
    cat > ~/mychain/scripts/backup.sh << 'EOF'
#!/bin/bash
# MyChain backup script

BACKUP_DIR="$HOME/mychain-backups"
S3_BUCKET=""  # Set your S3 bucket name if using AWS S3

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mychain_backup_$TIMESTAMP.tar.gz"

# Stop node for consistent backup
sudo systemctl stop mychaind

# Create backup
tar -czf $BACKUP_DIR/$BACKUP_FILE -C $HOME .mychain

# Restart node
sudo systemctl start mychaind

# Upload to S3 if configured
if [ ! -z "$S3_BUCKET" ]; then
    aws s3 cp $BACKUP_DIR/$BACKUP_FILE s3://$S3_BUCKET/backups/
fi

# Keep only last 7 local backups
find $BACKUP_DIR -name "mychain_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF
    
    chmod +x ~/mychain/scripts/backup.sh
    
    # Add to crontab for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/mychain/scripts/backup.sh") | crontab -
}

print_deployment_info() {
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    echo
    echo "========================================="
    echo "   MyChain AWS Deployment Complete! 🚀"
    echo "========================================="
    echo
    echo "Public IP: $PUBLIC_IP"
    echo
    echo "Access Points:"
    echo "  Web Dashboard: http://$PUBLIC_IP"
    echo "  API: http://$PUBLIC_IP/api/"
    echo "  RPC: http://$PUBLIC_IP/rpc/"
    echo
    echo "SSH Access:"
    echo "  ssh -i your-key.pem ubuntu@$PUBLIC_IP"
    echo
    echo "Useful Commands:"
    echo "  View logs: sudo journalctl -u mychaind -f"
    echo "  Check status: mychaind status"
    echo "  Restart node: sudo systemctl restart mychaind"
    echo "  Manual backup: ~/mychain/scripts/backup.sh"
    echo
    echo "Security Notes:"
    echo "  - RPC/API only accessible via Nginx proxy"
    echo "  - Firewall configured with UFW"
    echo "  - Automatic monitoring enabled"
    echo "  - Daily backups configured"
    echo
    echo "Next Steps:"
    echo "  1. Configure DNS for your domain"
    echo "  2. Enable SSL with: sudo certbot --nginx"
    echo "  3. Configure S3 backup bucket"
    echo "  4. Set up monitoring alerts"
    echo
    echo "========================================="
}

# Main execution
main() {
    log_info "Starting MyChain AWS deployment..."
    
    install_dependencies
    install_golang
    install_nodejs
    clone_repository
    build_blockchain
    build_web_dashboard
    configure_nginx
    configure_firewall
    setup_monitoring
    launch_blockchain
    create_backup_script
    print_deployment_info
}

# Run main function
main