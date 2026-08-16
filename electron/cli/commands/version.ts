import type { Command } from "../types";

export const versionCommand: Command = {
  name: "version",
  help: "Show the running Horde version",
  async run(_args, client) {
    const data = (await client.request("version")) as {
      version: string;
      phpActive: string | null;
    };
    const line = data.phpActive
      ? `Horde v${data.version} (PHP ${data.phpActive})`
      : `Horde v${data.version}`;
    process.stdout.write(`${line}\n`);
    return 0;
  },
};
