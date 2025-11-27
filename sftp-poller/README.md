# SFTP Poller Lambda

A serverless AWS Lambda function that polls an SFTP server for appointment CSV files and downloads them to S3. S3 events automatically trigger downstream processing via SQS.

## Architecture

- **Trigger**: EventBridge scheduled rule (daily at 9 AM PST)
- **Function**: AWS Lambda (Node.js 20.x)
- **Storage**: S3 bucket for downloaded files
- **Messaging**: S3 events trigger SQS for file processing
- **Authentication**: SFTP credentials via environment variables

## Quick Start

### Prerequisites

- Node.js 20.x
- AWS CLI configured
- SFTP server credentials

### 1. Install Dependencies

```bash
cd sftp-poller
npm install
```

### 2. Configure Environment

Copy the environment template and update with your values:

```bash
cp .env.example .env
```

Edit `.env` with your SFTP and AWS configuration:

```env
# SFTP Configuration
SFTP_HOST=sftp.referwell.com
SFTP_PORT=22
SFTP_USERNAME=paratus
SFTP_PASSWORD=your-password
SFTP_REMOTE_PATH=/

# AWS Configuration
SFTP_APPOINTMENTS_BUCKET=dev-paratus-sftp-appointments
AWS_REGION=us-west-2
```

### 3. Build and Package

```bash
./build.sh
```

This creates `sftp-poller-lambda.zip` ready for deployment.

### 4. Manual Lambda Deployment (Testing)

Upload the package to AWS Lambda:

```bash
aws lambda create-function \
  --function-name sftp-poller-test \
  --runtime nodejs20.x \
  --handler dist/index.handler \
  --role arn:aws:iam::123456789012:role/lambda-execution-role \
  --zip-file fileb://sftp-poller-lambda.zip \
  --environment Variables={SFTP_HOST=sftp.example.com,SFTP_USERNAME=user,...}

# Or update existing function:
aws lambda update-function-code \
  --function-name sftp-poller-test \
  --zip-file fileb://sftp-poller-lambda.zip
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SFTP_HOST` | ✅ | SFTP server hostname |
| `SFTP_PORT` | ❌ | SFTP server port (default: 22) |
| `SFTP_USERNAME` | ✅ | SFTP username |
| `SFTP_PASSWORD` | ❌ | SFTP password (or use private key) |
| `SFTP_PRIVATE_KEY` | ❌ | Private key for key-based auth |
| `SFTP_PASSPHRASE` | ❌ | Passphrase for encrypted private key |
| `SFTP_REMOTE_PATH` | ❌ | Remote directory path (default: "/") |
| `SFTP_APPOINTMENTS_BUCKET` | ✅ | S3 bucket for storing files |


## Development

### Project Structure

```
sftp-poller/
├── src/
│   ├── index.ts          # Lambda handler
│   ├── sftp-service.ts   # SFTP operations

├── package.json
├── tsconfig.json
├── build.sh
└── .env.example
```

### Local Testing

1. Set up environment variables in `.env`
2. Build the project: `npm run build`
3. Test the handler locally:

```typescript
// test-local.ts
import { handler } from './dist/index.js';

const testEvent = {
  version: '0',
  id: 'test-event',
  'detail-type': 'Scheduled Event',
  source: 'aws.events',
  account: '123456789012',
  time: new Date().toISOString(),
  region: 'us-west-2',
  resources: ['arn:aws:events:us-west-2:123456789012:rule/test-rule'],
  detail: {}
};

handler(testEvent, {} as any)
  .then(console.log)
  .catch(console.error);
```

### Available Scripts

- `npm run build` - Build TypeScript
- `npm run build:watch` - Build with watch mode
- `./build.sh` - Full build and package
- `npm test` - Run tests

## Infrastructure

### Required AWS Resources

1. **S3 Bucket**: For storing downloaded files (with S3 event notifications configured)
2. **IAM Role**: Lambda execution role with permissions for S3 and CloudWatch
3. **EventBridge Rule**: Scheduled trigger (daily at 9 AM PST)

### IAM Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },

  ]
}
```

## Monitoring

### CloudWatch Logs

- Log group: `/aws/lambda/sftp-poller`
- Contains connection logs, file processing results, and errors

### Key Metrics to Monitor

- Lambda invocations and duration
- SFTP connection success rate
- File processing success/failure rate
- S3 upload errors
- S3 event delivery failures

## Troubleshooting

### Common Issues

**SFTP Connection Failed**
- Verify credentials in environment variables
- Check network connectivity to SFTP server
- Validate port and hostname

**Lambda Timeout**
- Increase timeout from default 3 minutes to 5 minutes
- Check for large files or slow SFTP connections

**S3 Upload Failed**
- Verify IAM permissions for S3 PutObject
- Check bucket exists and is accessible

**S3 Events Not Triggering**
- Verify S3 bucket has event notifications configured
- Check SQS queue permissions for S3 events

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

## Security

- SFTP credentials stored in Lambda environment variables
- S3 bucket has server-side encryption enabled
- IAM role follows principle of least privilege
- Private keys stored securely and not logged
- S3 events automatically trigger downstream processing

## Next Steps

After successful testing:
1. Set up proper CI/CD pipeline
2. Configure monitoring and alerts
3. Integrate with file processor Lambda
4. Set up proper error handling and retry logic