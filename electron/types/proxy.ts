export interface ProxyRoute {
  domain: string;
  target: string;
  ssl?: boolean;
}

export interface ProxyStatus {
  running: boolean;
  port: number;
  httpsPort: number;
  pid?: number;
}
