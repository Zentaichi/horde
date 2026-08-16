import type { Site, SiteStatus } from "../../types/site";

export interface ISiteManager {
  list(): Site[];
  setDomains(projectId: string, domains: string[]): Promise<void>;
  enableSsl(projectId: string, enabled: boolean): Promise<void>;
  getStatus(): Promise<SiteStatus>;
  removeProject(projectId: string): Promise<void>;
}
