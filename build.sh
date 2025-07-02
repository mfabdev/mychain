#!/bin/bash
set -e

# Build blockchain
echo "Building blockchain..."
export PATH=/usr/local/go/bin:$HOME/go/bin:$PATH
make install

# Build dashboard
echo "Building dashboard..."
cd web-dashboard
npm install
npm run build
cd ..

echo "Build complete!"
