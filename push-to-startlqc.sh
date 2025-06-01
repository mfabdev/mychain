#!/bin/bash

# Push mychain-fresh-start to StartLQC repository

echo "Pushing to https://github.com/mfabdev/StartLQC.git"
echo ""

cd /home/dk/go/src/myrollapps/mychain/mychain-fresh-start

# Configure git (optional - modify with your details)
git config user.name "mfabdev"
git config user.email "mfabdev@users.noreply.github.com"

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Your repository should now be available at:"
echo "https://github.com/mfabdev/StartLQC"
echo ""
echo "Anyone can now clone and use it:"
echo "  git clone https://github.com/mfabdev/StartLQC.git"
echo "  cd StartLQC"
echo "  ./setup.sh"