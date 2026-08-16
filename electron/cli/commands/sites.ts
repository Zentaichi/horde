import type { Command } from "../types";

interface SiteRow {
  projectId: string;
  projectName: string;
  domains: string[];
  sslEnabled: boolean;
}

export const sitesCommand: Command = {
  name: "sites",
  help: "List mapped local sites",
  async run(_args, client) {
    const sites = (await client.request("sites")) as SiteRow[];
    for (const s of sites) {
      process.stdout.write(
        `${s.projectName}\t${s.domains.join(", ")}\t${s.sslEnabled ? "https" : "http"}\n`
      );
    }
    return 0;
  },
};
