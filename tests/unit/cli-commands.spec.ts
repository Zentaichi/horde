import "reflect-metadata";
import { describe, it, expect, vi, afterEach } from "vitest";
import { phpVersionCommand } from "../../electron/cli/commands/php-version";
import { versionCommand } from "../../electron/cli/commands/version";
import { sitesCommand } from "../../electron/cli/commands/sites";
import type { CliClient } from "../../electron/cli/types";

function fakeClient(data: unknown): CliClient {
  return {
    request: vi.fn(async () => data),
  };
}

describe("CLI commands", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("php-version prints the resolved version", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const client = fakeClient({ version: "8.3.10" });

    const code = await phpVersionCommand.run([], client);

    expect(code).toBe(0);
    expect(stdout).toHaveBeenCalledWith("8.3.10\n");
  });

  it("php-version reports when no .php-version file exists", async () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const client = fakeClient({ version: null });

    const code = await phpVersionCommand.run([], client);

    expect(code).toBe(1);
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining(".php-version")
    );
  });

  it("version prints app version", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const client = fakeClient({ version: "0.6.0", phpActive: "8.3.10" });

    const code = await versionCommand.run([], client);

    expect(code).toBe(0);
    expect(stdout).toHaveBeenCalledWith("Horde v0.6.0 (PHP 8.3.10)\n");
  });

  it("sites renders domain rows", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const client = fakeClient([
      { projectName: "Acme", domains: ["acme.test"], sslEnabled: true },
    ]);

    const code = await sitesCommand.run([], client);

    expect(code).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("acme.test"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("https"));
  });
});
