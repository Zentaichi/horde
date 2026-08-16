import type { Command } from "../types";

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  phpVersion?: string;
}

export const projectsCommand: Command = {
  name: "projects",
  help: "List Horde projects",
  async run(_args, client) {
    const projects = (await client.request("projects")) as ProjectRow[];
    for (const p of projects) {
      process.stdout.write(`${p.name}\t${p.phpVersion ?? "-"}\t${p.path}\n`);
    }
    return 0;
  },
};
