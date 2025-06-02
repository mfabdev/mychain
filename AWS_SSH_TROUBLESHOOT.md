# AWS SSH Connection Troubleshooting

## Issue: Connection closed immediately after accepting host key

### Try these solutions:

## 1. Check SSH Key Permissions (Windows)
The .pem file might have incorrect permissions. In Windows PowerShell (as Administrator):
```powershell
# Reset permissions on the key file
icacls "C:\Users\dimkr\Documents\MainCoin\StartLQCKey.pem" /reset
icacls "C:\Users\dimkr\Documents\MainCoin\StartLQCKey.pem" /grant:r "%USERNAME%:R"
icacls "C:\Users\dimkr\Documents\MainCoin\StartLQCKey.pem" /inheritance:r
```

## 2. Try Verbose SSH Connection
Use verbose mode to see what's happening:
```bash
ssh -v -i "C:\Users\dimkr\Documents\MainCoin\StartLQCKey.pem" ubuntu@18.117.9.0
```

## 3. Check if Instance is Still Running
The instance might have issues. Try:
1. Log into AWS Console
2. Go to EC2 Dashboard
3. Check instance status (should be "running")
4. Check System Status Checks and Instance Status Checks

## 4. Try Different SSH Client
If using Windows Command Prompt, try:
- PowerShell
- Git Bash
- WSL (Windows Subsystem for Linux)

Example with Git Bash:
```bash
ssh -i "/c/Users/dimkr/Documents/MainCoin/StartLQCKey.pem" ubuntu@18.117.9.0
```

## 5. Check Security Group
Ensure the security group allows SSH (port 22) from your IP:
1. In AWS Console, go to your instance
2. Click on Security tab
3. Click on the security group
4. Check inbound rules for SSH (port 22)

## 6. Try EC2 Instance Connect
As an alternative, use AWS EC2 Instance Connect:
1. In AWS Console, select your instance
2. Click "Connect" button
3. Choose "EC2 Instance Connect"
4. Click "Connect"

This opens a browser-based terminal.

## 7. Reboot Instance (Last Resort)
If nothing works:
1. In AWS Console, select your instance
2. Actions → Instance State → Reboot

Wait 2-3 minutes and try SSH again.

## Once Connected, Run Update:
```bash
# Update commands
sudo systemctl stop mychaind
cd ~/mychain
git pull origin main
make install
rm -rf ~/.mychain
./scripts/init_chain.sh
sudo systemctl restart mychaind
```