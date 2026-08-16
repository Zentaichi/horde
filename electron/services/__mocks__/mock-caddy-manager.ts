import { injectable } from "tsyringe";
import type { ProxyRoute, ProxyStatus } from "../../types/proxy";
import type { ICaddyManager } from "../interfaces/ICaddyManager";

@injectable()
export class MockCaddyManager implements ICaddyManager {
  private running = true;

  async getStatus(): Promise<ProxyStatus> {
    return {
      running: this.running,
      port: 80,
      httpsPort: 443,
      pid: this.running ? 4242 : undefined,
    };
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  async setRoutes(_routes: ProxyRoute[]): Promise<void> {}

  async getLogs(_tail?: number): Promise<string[]> {
    return ["[mock] caddy running"];
  }
}
