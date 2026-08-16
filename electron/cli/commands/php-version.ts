import type { Command } from "../types";

export const phpVersionCommand: Command = {
  name: "php-version",
  help: "Resolve the PHP version for a directory (.php-version file)",
  async run(args, client) {
    const dir = args[0] ?? process.cwd();
    const data = (await client.request("php-version", { path: dir })) as {
      version: string | null;
    };
    if (data.version) {
      process.stdout.write(`${data.version}\n`);
      return 0;
    }
    process.stderr.write(`No .php-version file found in ${dir}\n`);
    return 1;
  },
};
