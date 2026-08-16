import type { ProxyRoute, ProxyStatus } from "../../types/proxy";

export interface ICaddyManager {
  getStatus(): Promise<ProxyStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
  setRoutes(routes: ProxyRoute[]): Promise<void>;
  getLogs(tail?: number): Promise<string[]>;
}
