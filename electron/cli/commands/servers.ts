import type { Command } from "../types";

interface ServerRow {
  serviceId: string;
  displayName: string;
  running: boolean;
  pid?: number;
  port?: number;
}

export const serversCommand: Command = {
  name: "servers",
  help: "Show service status",
  async run(_args, client) {
    const servers = (await client.request("servers")) as ServerRow[];
    for (const s of servers) {
      process.stdout.write(
        `${s.running ? "RUNNING" : "STOPPED"}\t${s.displayName}\t${s.port ?? ""}\t${s.pid ?? ""}\n`
      );
    }
    return 0;
  },
};
