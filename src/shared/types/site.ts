export interface Site {
  projectId: string;
  projectName: string;
  path: string;
  domains: string[];
  sslEnabled: boolean;
}

export interface ProxyStatus {
  running: boolean;
  port: number;
  httpsPort: number;
  pid?: number;
}

export interface MkcertStatus {
  binaryInstalled: boolean;
  caInstalled: boolean;
  certPath: string | null;
  keyPath: string | null;
}

export interface SiteStatus {
  hostsReady: boolean;
  proxy: ProxyStatus;
  https: MkcertStatus;
}

export interface ScaffoldTemplate {
  id: string;
  displayName: string;
  minPhpVersion: string;
}
