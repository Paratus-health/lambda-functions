import { Handler } from "aws-lambda";
import { SftpService } from "./sftp-service.js";

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

/**
 * Main Lambda handler for SFTP polling
 * Triggered by EventBridge scheduled rule
 */
export const handler: Handler<EventBridgeEvent, LambdaResponse> = async (
  event,
) => {
  console.log("SFTP Poller Lambda triggered by EventBridge");
  console.log(`Event ID: ${event.id}, Time: ${event.time}`);

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
      `SFTP poll completed: ${successfulFiles.length} files downloaded to S3, ${failedFiles.length} failed`,
    );

    if (successfulFiles.length > 0) {
      console.log("Successfully downloaded files to S3:");
      successfulFiles.forEach((file) => {
        console.log(
          `  - ${file.filename} -> s3://${process.env["SFTP_APPOINTMENTS_BUCKET"]}/${file.s3Key}`,
        );
      });
      console.log(
        "S3 events will automatically trigger file processing via SQS",
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
