import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { CliClient } from "../types";

export class AppNotRunningError extends Error {
  constructor() {
    super("Horde is not running");
    this.name = "AppNotRunningError";
  }
}

function controlFilePath(): string {
  return (
    process.env.HORDE_CONTROL_FILE ?? join(homedir(), ".horde", "control.json")
  );
}

export function createHttpClient(): CliClient {
  return {
    async request(command, args = {}) {
      let control: { port: number; token: string };
      try {
        control = JSON.parse(readFileSync(controlFilePath(), "utf-8"));
      } catch {
        throw new AppNotRunningError();
      }

      let response: Response;
      try {
        response = await fetch(`http://127.0.0.1:${control.port}/rpc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${control.token}`,
          },
          body: JSON.stringify({ command, args }),
        });
      } catch {
        throw new AppNotRunningError();
      }

      const body = (await response.json()) as {
        ok: boolean;
        data?: unknown;
        error?: string;
      };
      if (!body.ok) throw new Error(body.error ?? "Horde RPC failed");
      return body.data;
    },
  };
}
