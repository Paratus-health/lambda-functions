# Lambda Functions Repository

A collection of serverless AWS Lambda functions for the Paratus Health platform.

## Overview

This repository contains standalone Lambda functions that handle specific tasks in the Paratus Health ecosystem. Each function is designed to be independently deployable and follows serverless best practices.

## Functions

### 📁 [sftp-poller](./sftp-poller/)
**SFTP Poller Lambda** - Scheduled function that polls an SFTP server for appointment CSV files, downloads them to S3, and triggers downstream processing via SQS.

- **Trigger**: EventBridge scheduled rule (daily at 9 AM PST)
- **Purpose**: Ingests appointment data from Referwell SFTP server
- **Status**: ✅ Ready for testing

### 📁 [file-processor](./file-processor/) (Coming Soon)
**File Processor Lambda** - Processes uploaded appointment files from S3, validates CSV data, and updates the database.

- **Trigger**: S3 upload events via SQS
- **Purpose**: Validates and processes appointment data
- **Status**: 🚧 Planned

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EventBridge   │───▶│  SFTP Poller     │───▶│       S3        │
│  (Scheduled)    │    │    Lambda        │    │   (Storage)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Processor │◀───│       SQS        │◀───│  S3 Event       │
│     Lambda       │    │   (Messaging)    │    │  Notification   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 20.x
- AWS CLI configured with appropriate permissions
- AWS Account with Lambda, S3, SQS, and EventBridge access

### Development Workflow

1. **Navigate to function directory**:
   ```bash
   cd lambda-functions/sftp-poller
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build and package**:
   ```bash
   ./build.sh
   ```

5. **Deploy to AWS**:
   ```bash
   # Manual deployment for testing
   aws lambda update-function-code \
     --function-name your-function-name \
     --zip-file fileb://sftp-poller-lambda.zip
   ```

## Project Structure

```
lambda-functions/
├── sftp-poller/           # SFTP polling function
│   ├── src/              # Source code
│   ├── package.json      # Dependencies
│   ├── tsconfig.json     # TypeScript config
│   ├── build.sh          # Build script
│   └── README.md         # Function-specific docs
├── file-processor/       # File processing function (planned)
└── README.md            # This file
```

## Common Patterns

### TypeScript Configuration
All functions use TypeScript with ES2022 target and strict type checking.

### Environment Variables
- Configuration via environment variables
- `.env.example` template provided for each function
- Sensitive data stored in AWS Systems Manager Parameter Store or Secrets Manager

### Build Process
- TypeScript compilation to ES modules
- Production dependencies only
- ZIP packaging for Lambda deployment

### Error Handling
- Comprehensive logging to CloudWatch
- Structured error responses
- Retry logic for transient failures

## Deployment

### Manual Deployment (Testing)
```bash
# Build the function
cd sftp-poller
./build.sh

# Deploy to Lambda
aws lambda update-function-code \
  --function-name dev-sftp-poller \
  --zip-file fileb://sftp-poller-lambda.zip
```

### CI/CD Pipeline (Future)
- Automated testing and deployment
- Environment-specific configurations
- Rollback capabilities

## Monitoring

### CloudWatch
- Function logs in `/aws/lambda/<function-name>`
- Custom metrics for business logic
- Dashboards for function health

### AWS X-Ray
- Distributed tracing enabled
- Performance insights
- Dependency mapping

## Security

### IAM Roles
- Principle of least privilege
- Function-specific policies
- No hardcoded credentials

### Data Protection
- Environment variables for configuration
- S3 server-side encryption
- Secure SFTP connections

## Contributing

### Adding a New Function

1. Create a new directory with the function name
2. Copy the structure from existing functions
3. Update this README with function details
4. Follow the established patterns and conventions

### Code Standards
- TypeScript with strict mode
- ESLint for code quality
- Comprehensive error handling
- Meaningful log messages

## Support

For issues with specific functions, refer to their individual README files. For general repository questions or infrastructure concerns, contact the platform team.

## License

This repository is part of the Paratus Health platform and is for internal use only.