export interface DevServerStatus {
  projectId: string;
  projectName: string;
  docroot: string;
  phpVersion: string;
  port: number;
  running: boolean;
  pid?: number;
}
