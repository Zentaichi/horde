import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "http";
import { homedir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { remove, writeFile } from "fs-extra";
import { app } from "electron";
import type { ControlHandlers } from "./control-commands";

function controlFilePath(): string {
  return (
    process.env.HORDE_CONTROL_FILE ?? join(homedir(), ".horde", "control.json")
  );
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/**
 * Local JSON-RPC endpoint for the `horde` CLI companion. Binds 127.0.0.1 only,
 * authenticates every request with a random bearer token persisted to
 * `~/.horde/control.json`, and keeps command logic in `control-commands.ts`
 * so the transport can be swapped without touching handlers.
 */
export class ControlServer {
  private server: Server | null = null;
  private token = "";
  private port = 0;
  private readonly handlers: ControlHandlers;

  constructor(handlers: ControlHandlers) {
    this.handlers = handlers;
  }

  async start(): Promise<void> {
    this.token = randomUUID().replace(/-/g, "");
    await new Promise<void>((resolve, reject) => {
      this.server = createServer((req, res) => {
        void this.handle(req, res);
      });
      this.server.once("error", reject);
      this.server.listen(0, "127.0.0.1", () => {
        const address = this.server!.address();
        this.port = typeof address === "object" && address ? address.port : 0;
        resolve();
      });
    });

    await writeFile(
      controlFilePath(),
      JSON.stringify({ port: this.port, token: this.token }),
      "utf-8"
    );
  }

  async stop(): Promise<void> {
    await remove(controlFilePath());
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  private async handle(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    res.setHeader("Content-Type", "application/json");

    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true, version: app.getVersion() }));
      return;
    }

    if (url.pathname !== "/rpc" || req.method !== "POST") {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: "Not found" }));
      return;
    }

    if (req.headers.authorization !== `Bearer ${this.token}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }

    let payload: { command: string; args?: Record<string, unknown> };
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
      return;
    }

    const handler = this.handlers[payload.command];
    if (!handler) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          ok: false,
          error: `Unknown command: ${payload.command}`,
        })
      );
      return;
    }

    try {
      const data = await handler(payload.args ?? {});
      res.end(JSON.stringify({ ok: true, data }));
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }
}
