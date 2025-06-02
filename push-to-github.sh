#!/bin/bash

# Script to push to GitHub
echo "Pushing to GitHub..."

# Try different methods
echo "Method 1: Trying with stored credentials..."
git push origin main 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Method 1 failed. Please set up GitHub credentials:"
    echo ""
    echo "Option A: Use GitHub Personal Access Token"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Generate a new token with 'repo' permissions"
    echo "3. Run: git push https://YOUR_TOKEN@github.com/mfabdev/mychain.git main"
    echo ""
    echo "Option B: Use SSH key"
    echo "1. Generate SSH key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
    echo "2. Add to GitHub: https://github.com/settings/keys"
    echo "3. Change remote: git remote set-url origin git@github.com:mfabdev/mychain.git"
    echo "4. Run: git push origin main"
    echo ""
    echo "Option C: Use GitHub CLI"
    echo "1. Install: sudo apt install gh"
    echo "2. Authenticate: gh auth login"
    echo "3. Run: gh repo sync"
fi