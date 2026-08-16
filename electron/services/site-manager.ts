import { app } from "electron";
import { join } from "path";
import { inject, injectable, singleton } from "tsyringe";
import type { IPlatformAdapter } from "../platform/IPlatformAdapter";
import type { IProjectManager } from "./interfaces/IProjectManager";
import type { ICaddyManager } from "./interfaces/ICaddyManager";
import type { IMkcertManager } from "./interfaces/IMkcertManager";
import type { IDevServerManager } from "./interfaces/IDevServerManager";
import type { ISiteManager } from "./interfaces/ISiteManager";
import type { Site, SiteStatus } from "../types/site";
import type { ProxyRoute } from "../types/proxy";
import type { Project } from "../types/project";
import { SettingsStore } from "./settings-store";
import { HostsFile } from "./hosts-file";

@injectable()
@singleton()
export class SiteManager implements ISiteManager {
  private readonly hosts: HostsFile;

  constructor(
    @inject("IPlatformAdapter") private readonly platform: IPlatformAdapter,
    @inject(SettingsStore) private readonly settings: SettingsStore,
    @inject("IProjectManager") private readonly projectManager: IProjectManager,
    @inject("ICaddyManager") private readonly caddy: ICaddyManager,
    @inject("IMkcertManager") private readonly mkcert: IMkcertManager,
    @inject("IDevServerManager")
    private readonly devServerManager: IDevServerManager
  ) {
    this.hosts = new HostsFile(platform, join(app.getPath("userData"), "data"));
  }

  list(): Site[] {
    return this.projectManager
      .list()
      .filter((p) => p.domains && p.domains.length > 0)
      .map((p) => this.toSite(p));
  }

  async setDomains(projectId: string, domains: string[]): Promise<void> {
    const project = this.findProject(projectId);
    project.domains = this.normalizeDomains(domains);
    this.settings.saveProject(project);
    await this.apply();
  }

  async enableSsl(projectId: string, enabled: boolean): Promise<void> {
    const project = this.findProject(projectId);
    project.sslEnabled = enabled;
    this.settings.saveProject(project);
    if (enabled) {
      await this.mkcert.ensureInstalled();
    }
    await this.apply();
  }

  async getStatus(): Promise<SiteStatus> {
    const [proxy, https] = await Promise.all([
      this.caddy.getStatus(),
      this.mkcert.getStatus(),
    ]);
    const sites = this.list();
    const allDomains = sites.flatMap((s) => s.domains);
    const hostsReady =
      allDomains.length === 0 || (await this.hosts.hasDomains(allDomains));

    return { hostsReady, proxy, https };
  }

  async removeProject(projectId: string): Promise<void> {
    const project = this.projectManager.list().find((p) => p.id === projectId);
    const domains = project?.domains ?? [];

    this.projectManager.remove(projectId);
    if (domains.length > 0) {
      await this.hosts.removeDomains(domains);
    }
    await this.apply();
  }

  private findProject(projectId: string): Project {
    const project = this.projectManager.list().find((p) => p.id === projectId);
    if (!project) throw new Error(`Project ${projectId} not found.`);
    return project;
  }

  private toSite(project: Project): Site {
    return {
      projectId: project.id,
      projectName: project.name,
      path: project.path,
      domains: project.domains ?? [],
      sslEnabled: !!project.sslEnabled,
    };
  }

  private normalizeDomains(domains: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const d of domains) {
      const clean = d.toLowerCase().trim();
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      result.push(clean);
    }
    return result;
  }

  private async apply(): Promise<void> {
    const sites = this.list();
    const allDomains = sites.flatMap((s) => s.domains);

    if (allDomains.length > 0) {
      await this.hosts.syncDomains(allDomains);
    }

    const routes: ProxyRoute[] = [];
    for (const site of sites) {
      const target = await this.targetFor(site);
      for (const domain of site.domains) {
        routes.push({
          domain,
          target,
          ssl: site.sslEnabled,
        });
      }
    }
    await this.caddy.setRoutes(routes);

    if (sites.some((s) => s.sslEnabled)) {
      await this.mkcert.ensureInstalled();
    }
  }

  private async targetFor(site: Site): Promise<string> {
    const statuses = await this.devServerManager.listAll();
    const status = statuses.find((s) => s.projectId === site.projectId);
    if (status && status.running) {
      return `127.0.0.1:${status.port}`;
    }
    return "127.0.0.1:8080";
  }
}
