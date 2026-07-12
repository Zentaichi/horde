export interface DatabaseVersion {
  engine: string;
  version: string;
  installed: boolean;
}

export interface DatabaseInstance {
  instanceId: string;
  engine: string;
  displayName?: string;
  version: string;
  port: number;
  running: boolean;
  label?: string;
  pid?: number;
}

export interface DownloadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}
