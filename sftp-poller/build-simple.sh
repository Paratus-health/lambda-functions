#!/bin/bash

set -e

# Simple build script for SFTP Poller Lambda
# This script builds and packages the Lambda function

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/dist"
OUTPUT_ZIP="$PROJECT_ROOT/sftp-poller-lambda.zip"

echo "🔨 Building SFTP Poller Lambda function..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR" "$OUTPUT_ZIP"

# Create build directory
mkdir -p "$BUILD_DIR"

# Build TypeScript
echo "⚡ Building TypeScript..."
cd "$PROJECT_ROOT"
npm run build

# Create Lambda zip package (include only what's needed)
echo "📦 Creating Lambda deployment package..."
cd "$BUILD_DIR"
zip -r "$OUTPUT_ZIP" . -q

echo "✅ Build completed successfully!"
echo "📁 Lambda package: $OUTPUT_ZIP"

# Display package info
PACKAGE_SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)
echo "📊 Package size: $PACKAGE_SIZE"

# List contents for verification
echo "📋 Package contents:"
unzip -l "$OUTPUT_ZIP" | head -10
echo "... (and more)"
