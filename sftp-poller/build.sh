#!/bin/bash

set -e

# Clean build script for SFTP Poller Lambda function
# This script creates a proper Lambda deployment package with only production dependencies

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BUILD_DIR="$PROJECT_ROOT/dist"
PACKAGE_DIR="$PROJECT_ROOT/package"
OUTPUT_ZIP="$PROJECT_ROOT/sftp-poller-lambda.zip"

echo "🔨 Building SFTP Poller Lambda function..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR" "$PACKAGE_DIR" "$OUTPUT_ZIP"

# Create directories
mkdir -p "$BUILD_DIR" "$PACKAGE_DIR"

# Build TypeScript
echo "⚡ Building TypeScript..."
cd "$PROJECT_ROOT"
npm run build

# Copy only necessary files to package directory
echo "📋 Copying files to package directory..."
cp package.json "$PACKAGE_DIR/"
cp -r dist/* "$PACKAGE_DIR/"

# Install only production dependencies in package directory
echo "📦 Installing production dependencies..."
cd "$PACKAGE_DIR"
npm install --omit=dev --no-audit --no-fund

# Remove source maps from production package
echo "🗑️  Removing source maps..."
find "$PACKAGE_DIR" -name "*.map" -type f -delete

# Create Lambda zip package
echo "📦 Creating Lambda deployment package..."
cd "$PACKAGE_DIR"
zip -r "$OUTPUT_ZIP" . -q

# Clean up package directory
echo "🧹 Cleaning up..."
rm -rf "$PACKAGE_DIR"

echo "✅ Build completed successfully!"
echo "📁 Lambda package: $OUTPUT_ZIP"

# Display package info
PACKAGE_SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)
echo "📊 Package size: $PACKAGE_SIZE"

# Verify package contents
echo "📋 Package contents:"
unzip -l "$OUTPUT_ZIP" | grep -E "(package\.json|dist/index\.js|node_modules/(@aws-sdk|ssh2-sftp-client|dotenv))" | head -10

echo "✅ Lambda package is ready for deployment!"
