#!/bin/bash

# Script to fix hardcoded values in the web dashboard

echo "Fixing hardcoded chain IDs..."
# Fix all occurrences of mychain_100-1 to mychain
find web-dashboard/src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/mychain_100-1/mychain/g'

echo "Fixing hardcoded TestUSD amount..."
# Already fixed in OverviewPage.tsx

echo "Fixing hardcoded validator address..."
# This needs to be fetched dynamically, but for now update to the correct one
sed -i 's/cosmosvaloper15seuuelcs4s5nqwlzgq0kur09fx5mxukgry88t/cosmosvaloper19rl4cm2hmr8afy4kldpxz3fka4jguq0ae5egnx/g' web-dashboard/src/components/QuickStake.tsx

echo "Done! Please rebuild the dashboard."