#!/bin/bash

# Compile protobuf files
echo "Compiling protobuf files..."

cd /home/dk/go/src/myrollapps/mychain

# Generate Go code from proto files
buf generate

echo "✅ Protobuf compilation complete"