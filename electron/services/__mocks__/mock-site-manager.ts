import { injectable } from "tsyringe";
import type { Site, SiteStatus } from "../../types/site";
import type { ISiteManager } from "../interfaces/ISiteManager";

@injectable()
export class MockSiteManager implements ISiteManager {
  list(): Site[] {
    return [];
  }

  async setDomains(_projectId: string, _domains: string[]): Promise<void> {}

  async enableSsl(_projectId: string, _enabled: boolean): Promise<void> {}

  async getStatus(): Promise<SiteStatus> {
    return {
      hostsReady: true,
      proxy: { running: true, port: 80, httpsPort: 443 },
      https: {
        binaryInstalled: true,
        caInstalled: true,
        certPath: null,
        keyPath: null,
      },
    };
  }

  async removeProject(_projectId: string): Promise<void> {}
}
