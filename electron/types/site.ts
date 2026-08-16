import type { ProxyStatus } from "./proxy";

export interface Site {
  projectId: string;
  projectName: string;
  path: string;
  domains: string[];
  sslEnabled: boolean;
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
