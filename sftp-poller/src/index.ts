import { Handler } from "aws-lambda";
import { SftpService } from "./sftp-service.js";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const SSM_SECRET_NAME =
  "/encryption/445567090044/uswe2/referwell-sftp-secrets-dev";

interface EventBridgeEvent {
  version: string;
  id: string;
  "detail-type": string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: any;
}

interface LambdaResponse {
  statusCode: number;
  body: string;
}

const ssmClient = new SSMClient({ region: "us-west-2" });

// Updated helper to handle decryption
const getParameter = async (name: string) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true, // Crucial for SecureString parameters
  });
  const response = await ssmClient.send(command);
  return response.Parameter?.Value;
};

const loadEnvFromSSM = async () => {
  try {
    // 1. Reuse your existing helper
    const rawConfig = await getParameter(SSM_SECRET_NAME);

    if (!rawConfig) {
      throw new Error(`SSM parameter ${SSM_SECRET_NAME} is empty or not found`);
    }

    const envConfig = JSON.parse(rawConfig);

    // 2. Inject into process.env
    for (const [key, value] of Object.entries(envConfig)) {
      process.env[key] = String(value);
    }

    console.log("Environment variables loaded from SSM.");
  } catch (error) {
    console.error("Critical: Could not load env vars", error);
    process.exit(1); // Fail fast if secrets are missing
  }
};

/**
 * Main Lambda handler for SFTP polling
 * Triggered by EventBridge scheduled rule
 */
export const handler: Handler<EventBridgeEvent, LambdaResponse> = async (
  event
) => {
  console.log("SFTP Poller Lambda triggered by EventBridge");
  console.log(`Event ID: ${event.id}, Time: ${event.time}`);

  console.log("Loading environment variables from SSM...");
  await loadEnvFromSSM();

  const sftpService = new SftpService();

  try {
    // Get SFTP configuration from environment
    const sftpConfig = sftpService.getSftpConfig();

    // Validate configuration
    sftpService.validateSftpConfig(sftpConfig);

    const remotePath = process.env["SFTP_REMOTE_PATH"] || "/";
    console.log(`Starting SFTP poll for path: ${remotePath}`);

    // Poll SFTP server and process files
    const results = await sftpService.pollSftpServer(sftpConfig, remotePath);

    // Log results
    const successfulFiles = results.filter((r) => r.status === "success");
    const failedFiles = results.filter((r) => r.status === "error");

    console.log(
      `SFTP poll completed: ${successfulFiles.length} files downloaded to S3, ${failedFiles.length} failed`
    );

    if (successfulFiles.length > 0) {
      console.log("Successfully downloaded files to S3:");
      successfulFiles.forEach((file) => {
        console.log(
          `  - ${file.filename} -> s3://${process.env["SFTP_APPOINTMENTS_BUCKET"]}/${file.s3Key}`
        );
      });
      console.log(
        "S3 events will automatically trigger file processing via SQS"
      );
    }

    if (failedFiles.length > 0) {
      console.warn("Failed to process files:");
      failedFiles.forEach((file) => {
        console.warn(`  - ${file.filename}: ${file.error}`);
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "SFTP poll completed successfully",
        summary: {
          totalFiles: results.length,
          successful: successfulFiles.length,
          failed: failedFiles.length,
          successfulFiles: successfulFiles.map((f) => ({
            filename: f.filename,
            s3Key: f.s3Key,
          })),
          failedFiles: failedFiles.map((f) => ({
            filename: f.filename,
            error: f.error,
          })),
        },
      }),
    };
  } catch (error) {
    console.error("SFTP Poller Lambda execution failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "SFTP poll failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        event: event,
      }),
    };
  }
};
