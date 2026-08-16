import { app } from "electron";
import type { CliClient, Command } from "./types";
import { commands } from "./commands";
import { createHttpClient } from "./transports/http";

app.disableHardwareAcceleration();

const HELP = `horde — Horde CLI companion

Usage:
  horde <command> [args...]

Commands:
${commands.map((c) => `  ${c.name.padEnd(14)} ${c.help}`).join("\n")}
  help            Show this help
`;

async function main(): Promise<number> {
  const [cmdName, ...rest] = process.argv.slice(2);

  if (
    !cmdName ||
    cmdName === "help" ||
    cmdName === "--help" ||
    cmdName === "-h"
  ) {
    process.stdout.write(HELP);
    return 0;
  }

  const command: Command | undefined = commands.find((c) => c.name === cmdName);
  if (!command) {
    process.stderr.write(`Unknown command: ${cmdName}\n\n${HELP}`);
    return 2;
  }

  const client: CliClient = createHttpClient();
  try {
    return await command.run(rest, client);
  } catch (err) {
    const error = err as Error;
    if (error.name === "AppNotRunningError") {
      process.stderr.write(
        "Horde is not running. Launch Horde, then retry the command.\n"
      );
      return 1;
    }
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
}

app.whenReady().then(async () => {
  const code = await main();
  app.exit(code);
});
