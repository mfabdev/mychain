#!/bin/bash
# Build all components of the mychain project

set -e

echo "Building mychaind..."
go build ./cmd/mychaind

echo "Building modules..."
go build ./x/...

echo "Building app..."
go build ./app/...

echo "Building scripts..."
go build ./scripts/...

echo "Build completed successfully!"