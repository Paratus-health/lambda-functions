declare module "ssh2-sftp-client" {
  import { Readable } from "stream";

  interface FileInfo {
    type: string;
    name: string;
    size: number;
    modifyTime: number;
    accessTime: number;
    rights: {
      user: string;
      group: string;
      other: string;
    };
    owner: number;
    group: number;
  }

  interface ConnectOptions {
    host: string;
    port?: number;
    username: string;
    password?: string | undefined;
    privateKey?: string | Buffer | undefined;
    passphrase?: string | undefined;
    readyTimeout?: number;
    algorithms?: {
      kex?: string[];
      cipher?: string[];
      serverHostKey?: string[];
      hmac?: string[];
      compress?: string[];
    };
  }

  class Client {
    constructor();

    connect(options: ConnectOptions): Promise<void>;
    list(remotePath: string): Promise<FileInfo[]>;
    get(
      remotePath: string,
      dst?: Readable | string | Buffer,
    ): Promise<Buffer | string | Readable>;
    put(src: Buffer | Readable | string, remotePath: string): Promise<void>;
    delete(remotePath: string): Promise<void>;
    mkdir(remotePath: string, recursive?: boolean): Promise<void>;
    rmdir(remotePath: string, recursive?: boolean): Promise<void>;
    exists(remotePath: string): Promise<boolean>;
    rename(oldRemotePath: string, newRemotePath: string): Promise<void>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
  }

  export = Client;
}
