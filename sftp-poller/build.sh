#!/bin/bash

set -e

# Build script for SFTP Poller Lambda function
# This script builds and packages the Lambda function for deployment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/dist"
PACKAGE_DIR="$PROJECT_ROOT/package"
OUTPUT_ZIP="$PROJECT_ROOT/sftp-poller-lambda.zip"

echo "🔨 Building SFTP Poller Lambda function..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR" "$PACKAGE_DIR" "$OUTPUT_ZIP"

# Create directories
mkdir -p "$BUILD_DIR" "$PACKAGE_DIR"

# Install all dependencies (including dev dependencies for TypeScript)
echo "📦 Installing dependencies..."
cd "$PROJECT_ROOT"
npm install

# Build TypeScript
echo "⚡ Building TypeScript..."
node_modules/.bin/tsc

# Copy package.json and node_modules to package directory
echo "📋 Copying files to package directory..."
cp package.json "$PACKAGE_DIR/"
cp -r node_modules "$PACKAGE_DIR/"
cp -r dist/* "$PACKAGE_DIR/"

# Install only production dependencies in package directory
echo "📦 Installing production dependencies..."
cd "$PACKAGE_DIR"
npm install --production

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

# List contents for verification
echo "📋 Package contents:"
unzip -l "$OUTPUT_ZIP" | head -10
echo "... (and more)"
