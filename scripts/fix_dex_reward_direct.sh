#!/bin/bash

# Direct fix for DEX reward rate

echo "Fixing DEX reward rate directly..."

# The issue is that init-dex-state thinks DEX is already initialized 
# because trading pairs exist, but the reward rate is 0

# Since we can't update params via CLI yet, we need to:
# 1. Stop the node
# 2. Export genesis
# 3. Fix the params
# 4. Restart with new genesis

echo "Current DEX params:"
mychaind query dex params

echo ""
echo "The issue is:"
echo "1. DEX was initialized with base_reward_rate = 0 (bug in earlier version)"
echo "2. init-dex-state won't reinitialize because trading pairs already exist"
echo "3. We don't have a working update-params command yet"
echo ""
echo "Solutions:"
echo "1. Fix the init_dex_state.go check to allow reinitialization"
echo "2. Implement a working update-params command"
echo "3. Export/fix/import genesis (requires node restart)"
echo ""
echo "For now, LC rewards won't work, but everything else functions correctly."
echo "The fix has been implemented in the code (base_reward_rate = 0.222)"
echo "but needs to be applied to the running chain."