import Client from "ssh2-sftp-client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

export interface DownloadedFile {
  filename: string;
  content: Buffer;
  size: number;
  lastModified: Date;
}

export interface FileProcessingResult {
  filename: string;
  status: "success" | "error";
  error?: string;
  s3Key?: string;
}

const REMOTE_SFTP_INCOMING = "/referwell/incoming";
const REMOTE_SFTP_PROCESSING = "/referwell/processing";

export class SftpService {
  private s3Client: S3Client;

  constructor() {
    const s3Config: any = {};

    const localstackEndpoint = process.env["LOCALSTACK_ENDPOINT"];
    if (localstackEndpoint) {
      s3Config.endpoint = localstackEndpoint;
      s3Config.forcePathStyle = true;
    }

    this.s3Client = new S3Client(s3Config);
  }

  /**
   * Connect to SFTP server and download new files
   */
  async pollSftpServer(
    config: SftpConfig,
    remotePath: string = "/"
  ): Promise<FileProcessingResult[]> {
    const sftp = new Client();
    const results: FileProcessingResult[] = [];

    try {
      console.log(`Connecting to SFTP server: ${config.host}:${config.port}`);

      await sftp.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: config.privateKey,

        readyTimeout: 30000,
      });

      const fullIncomingPath = `${remotePath}${REMOTE_SFTP_INCOMING}`;
      const fullProcessingPath = `${remotePath}${REMOTE_SFTP_PROCESSING}`;

      console.log(
        `Connected to SFTP server, listing files in: ${fullIncomingPath}`
      );

      const files = await sftp.list(fullIncomingPath);
      console.log(`Found ${files.length} files in remote directory`);

      // Filter for CSV files (assuming appointment files are CSV)
      const csvFiles = files.filter(
        (file) => file.name.toLowerCase().endsWith(".csv") && file.type === "-"
      );

      console.log(`Processing ${csvFiles.length} CSV files`);

      for (const file of csvFiles) {
        try {
          console.log(`Processing file: ${file.name}`);

          const filePath = `${fullIncomingPath}/${file.name}`;
          const fileBuffer = await sftp.get(filePath);

          const result = await this.processDownloadedFile(
            file.name,
            fileBuffer as Buffer
          );

          results.push(result);

          // Only move to Processing if processing was successful
          if (result.status === "success") {
            console.log(
              `Moving file to Processing from SFTP server: ${file.name}`
            );
            await sftp.rename(filePath, `${fullProcessingPath}/${file.name}`);
            console.log(`Successfully processed and moved file: ${file.name}`);
          } else {
            console.warn(
              `File processing failed, leaving file in Incoming: ${file.name}`
            );
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          results.push({
            filename: file.name,
            status: "error",
            error:
              fileError instanceof Error ? fileError.message : "Unknown error",
          });
        }
      }
    } catch (error) {
      console.error("SFTP connection or operation failed:", error);
      throw error;
    } finally {
      await sftp.end();
      console.log("SFTP connection closed");
    }

    return results;
  }

  /**
   * Process downloaded file: upload to S3
   */
  private async processDownloadedFile(
    filename: string,
    content: Buffer
  ): Promise<FileProcessingResult> {
    try {
      // Generate unique S3 key
      const s3Key = `sftp-appointments/${randomUUID()}-${filename}`;

      // Upload file to S3
      await this.uploadToS3(s3Key, content, filename);

      return {
        filename,
        status: "success",
        s3Key,
      };
    } catch (error) {
      console.error(`Failed to process file ${filename}:`, error);
      return {
        filename,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Upload file to S3 bucket
   */
  private async uploadToS3(
    key: string,
    content: Buffer,
    filename: string
  ): Promise<void> {
    const bucketName = process.env["SFTP_APPOINTMENTS_BUCKET"];

    if (!bucketName) {
      throw new Error(
        "SFTP_APPOINTMENTS_BUCKET environment variable is not set"
      );
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: "text/csv",
      Metadata: {
        "original-filename": filename,
        "uploaded-at": new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    console.log(`File uploaded to S3: ${key}`);
  }

  /**
   * Get SFTP configuration from environment variables
   */
  getSftpConfig(): SftpConfig {
    const privateKey = process.env["SFTP_PRIVATE_KEY"];
    if (!privateKey) {
      throw new Error("SFTP_PRIVATE_KEY environment variable is required");
    }

    return {
      host: process.env["SFTP_HOST"] || "",
      port: parseInt(process.env["SFTP_PORT"] || "22"),
      username: process.env["SFTP_USERNAME"] || "",
      privateKey: privateKey,
    };
  }

  /**
   * Validate SFTP configuration
   */
  validateSftpConfig(config: SftpConfig): void {
    if (!config.host) {
      throw new Error("SFTP_HOST environment variable is required");
    }
    if (!config.username) {
      throw new Error("SFTP_USERNAME environment variable is required");
    }
    if (!config.privateKey) {
      throw new Error("SFTP_PRIVATE_KEY environment variable is required");
    }
  }
}
