#!/bin/bash

# Script to serve the production build with custom endpoints

# Set environment variables (these won't affect the built app, but are useful for documentation)
export REACT_APP_RPC_ENDPOINT="${RPC_ENDPOINT:-http://localhost:26657}"
export REACT_APP_REST_ENDPOINT="${REST_ENDPOINT:-http://localhost:1317}"
export REACT_APP_TERMINAL_SERVER="${TERMINAL_SERVER:-http://localhost:3003}"

echo "Serving production build..."
echo "Note: To use custom endpoints, rebuild with environment variables:"
echo "  REACT_APP_RPC_ENDPOINT=$REACT_APP_RPC_ENDPOINT npm run build"
echo "  REACT_APP_REST_ENDPOINT=$REACT_APP_REST_ENDPOINT npm run build"
echo "  REACT_APP_TERMINAL_SERVER=$REACT_APP_TERMINAL_SERVER npm run build"
echo ""
echo "Starting server on http://localhost:3000"

# Install serve if not already installed
if ! command -v serve &> /dev/null; then
    echo "Installing serve..."
    npm install -g serve
fi

# Serve the build directory
serve -s build -l 3000