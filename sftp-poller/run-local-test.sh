#!/bin/bash

# Local test runner for SFTP Poller Lambda
# This script helps test the Lambda function locally with LocalStack

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 Starting local SFTP poller test..."

# Check if LocalStack is running
if ! curl -s http://localhost:4566/health > /dev/null; then
    echo "❌ LocalStack is not running on http://localhost:4566"
    echo "   Please start LocalStack first:"
    echo "   localstack start"
    exit 1
fi

echo "✅ LocalStack is running"

# Check if .env file exists, otherwise use .env.local as template
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "📝 Creating .env file from template..."
    cp "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/.env"
    echo "⚠️  Please update .env file with your actual SFTP credentials"
    exit 1
fi

# Build the project
echo "🔨 Building TypeScript..."
cd "$PROJECT_ROOT"
npm run build

# Create the S3 bucket if it doesn't exist
echo "📦 Setting up S3 bucket..."
aws --endpoint-url=http://localhost:4566 s3api create-bucket \
    --bucket paratus-health-referwell-storage-dev \
    --region us-east-1 \
    2>/dev/null || echo "Bucket already exists"

# Run the local test
echo "🧪 Running local test..."
node test-local.mjs

echo ""
echo "📋 Next steps:"
echo "   1. Check LocalStack logs for S3 operations"
echo "   2. Verify files in S3 bucket:"
echo "      aws --endpoint-url=http://localhost:4566 s3 ls s3://paratus-health-referwell-storage-dev/sftp-appointments/"
echo "   3. Check CloudWatch logs for Lambda execution"
echo ""
echo "💡 To update SFTP credentials:"
echo "   Edit .env file with your actual SFTP host, username, and private key"
