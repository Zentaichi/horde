export interface DatabaseInstanceConfig {
  instanceId: string;
  engine: string;
  version: string;
  port: number;
  datadir: string;
  label?: string;
}

export interface DatabaseInstanceStatus {
  instanceId: string;
  engine: string;
  version: string;
  port: number;
  running: boolean;
  pid?: number;
}
