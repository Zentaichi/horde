import "reflect-metadata";
import { describe, it, expect, vi } from "vitest";
import { HostsFile } from "../../electron/services/hosts-file";
import type { IPlatformAdapter } from "../../electron/platform/IPlatformAdapter";

vi.mock("fs-extra", () => ({
  writeFile: vi.fn(async () => {}),
}));

interface FakePlatform {
  content: string;
  readCalls: number;
  write: vi.Mock;
  readHostsFile: () => Promise<string>;
  writeHostsFile: (c: string) => Promise<void>;
  getHostsFileEol: () => string;
  getLoopbackHost: () => string;
}

function createPlatform(initialHosts = "") {
  const fake: FakePlatform = {
    content: initialHosts,
    readCalls: 0,
    write: vi.fn(async (c: string) => {
      fake.content = c;
    }),
    readHostsFile: async () => {
      fake.readCalls++;
      return fake.content;
    },
    writeHostsFile: (c: string) => fake.write(c),
    getHostsFileEol: () => "\n",
    getLoopbackHost: () => "127.0.0.1",
  };
  return { adapter: fake as unknown as IPlatformAdapter, fake };
}

describe("HostsFile", () => {
  it("adds managed entries for missing domains", async () => {
    const { adapter, fake } = createPlatform("");
    const hosts = new HostsFile(adapter, "/backup");

    const result = await hosts.syncDomains(["acme.test", "api.acme.test"]);

    expect(result.changed).toBe(true);
    expect(result.conflicts).toEqual([]);
    expect(fake.write).toHaveBeenCalledOnce();
    const written = fake.write.mock.calls[0][0] as string;
    expect(written).toContain("127.0.0.1 acme.test # Horde managed");
    expect(written).toContain("127.0.0.1 api.acme.test # Horde managed");
  });

  it("keeps existing user loopback entries without duplicating", async () => {
    const { adapter, fake } = createPlatform("127.0.0.1 acme.test\n");
    const hosts = new HostsFile(adapter, "/backup");

    const result = await hosts.syncDomains(["acme.test"]);

    expect(result.changed).toBe(false);
    expect(fake.write).not.toHaveBeenCalled();
    expect(adapter.content).toBe("127.0.0.1 acme.test\n");
  });

  it("reports conflicts for user entries mapped elsewhere", async () => {
    const { adapter, fake } = createPlatform("192.168.1.10 acme.test\n");
    const hosts = new HostsFile(adapter, "/backup");

    const result = await hosts.syncDomains(["acme.test"]);

    expect(result.conflicts).toEqual(["acme.test"]);
    expect(fake.write).not.toHaveBeenCalled();
  });

  it("removes managed entries for removed domains", async () => {
    const initial =
      "127.0.0.1 keep.test # Horde managed\n127.0.0.1 drop.test # Horde managed\n";
    const { adapter, fake } = createPlatform(initial);
    const hosts = new HostsFile(adapter, "/backup");

    await hosts.syncDomains(["keep.test"]);

    const written = fake.write.mock.calls[0][0] as string;
    expect(written).toContain("keep.test");
    expect(written).not.toContain("drop.test");
  });

  it("aborts when the hosts file changed externally during write", async () => {
    const { adapter, fake } = createPlatform("127.0.0.1 a.test\n");
    // Simulate an external change between the initial read and the write-time check.
    fake.readHostsFile = vi.fn(async () => {
      fake.readCalls++;
      return fake.readCalls === 2 ? "127.0.0.1 changed.test\n" : fake.content;
    });
    const hosts = new HostsFile(adapter, "/backup");

    await expect(hosts.syncDomains(["b.test"])).rejects.toThrow(
      "changed externally"
    );
  });

  it("rejects invalid hostnames", async () => {
    const { adapter, fake } = createPlatform("");
    const hosts = new HostsFile(adapter, "/backup");

    await hosts.syncDomains(["not a domain", "-bad", "ok.test"]);

    const written = fake.write.mock.calls[0][0] as string;
    expect(written).toContain("ok.test");
    expect(written).not.toContain("not a domain");
    expect(written).not.toContain("-bad");
  });
});
