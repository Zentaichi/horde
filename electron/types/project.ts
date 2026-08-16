export interface Project {
  id: string;
  name: string;
  path: string;
  phpVersion?: string;
  isPhpVersionInstalled?: boolean;
  domains?: string[];
  sslEnabled?: boolean;
  proxyPort?: number;
}
