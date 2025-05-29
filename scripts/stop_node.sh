#!/bin/bash

echo "🛑 Stopping MyChain Node..."

# Kill the node process
pkill -f "mychaind start"

# Wait a moment
sleep 2

# Check if stopped
if pgrep -f "mychaind start" > /dev/null; then
    echo "❌ Failed to stop node, trying force kill..."
    pkill -9 -f "mychaind start"
else
    echo "✅ Node stopped successfully"
fi