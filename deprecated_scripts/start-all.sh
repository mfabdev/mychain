#!/bin/bash

echo "🚀 Starting MyChain Complete System"
echo "=================================="

# Check if node is already running
if pgrep -f "mychaind start" > /dev/null; then
    echo "✅ Blockchain node is already running"
else
    echo "🔄 Starting blockchain node..."
    cd /home/dk/go/src/myrollapps/mychain
    ./scripts/start_node.sh
    sleep 5
fi

# Check if terminal server is running
if lsof -i:3003 > /dev/null 2>&1; then
    echo "✅ Terminal server is already running"
else
    echo "🔄 Starting terminal server..."
    cd /home/dk/go/src/myrollapps/mychain/web-dashboard
    node terminal-server.js > terminal-server.log 2>&1 &
    sleep 2
fi

# Check if web dashboard is running
if lsof -i:3000 > /dev/null 2>&1; then
    echo "✅ Web dashboard is already running"
else
    echo "🔄 Starting web dashboard..."
    cd /home/dk/go/src/myrollapps/mychain/web-dashboard
    npm start > dashboard.log 2>&1 &
    sleep 5
fi

echo ""
echo "✨ All systems started!"
echo ""
echo "📊 Access points:"
echo "   • Web Dashboard: http://localhost:3000"
echo "   • API Endpoint: http://localhost:1317"
echo "   • Terminal Server: http://localhost:3003"
echo ""
echo "💡 Now you can:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Navigate to MainCoin page"
echo "   3. Enter amount and click 'Buy MainCoin' - it will execute automatically!"
echo ""
echo "🛑 To stop all services, run: pkill -f mychaind && pkill -f 'node terminal-server' && pkill -f 'npm start'"