// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount, flushPromises } from "@vue/test-utils";

import SitesPage from "@/pages/SitesPage.vue";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import type { SiteStatus } from "@/shared/types/site";

const PROXY_UP: SiteStatus = {
  hostsReady: true,
  proxy: { running: true, port: 8080, httpsPort: 8443, pid: 1234 },
  https: {
    binaryInstalled: true,
    caInstalled: true,
    certPath: null,
    keyPath: null,
  },
};

const PROXY_DOWN: SiteStatus = {
  ...PROXY_UP,
  proxy: { running: false, port: 8080, httpsPort: 8443 },
};

function stubApi(status: SiteStatus, cliInstalled = false) {
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    sites: {
      list: vi.fn(async () => [
        {
          projectId: "p1",
          projectName: "MyApp",
          path: "C:/projects/myapp",
          domains: ["myapp.test"],
          sslEnabled: false,
        },
      ]),
      getStatus: vi.fn(async () => status),
      setDomains: vi.fn(async () => {}),
      enableSsl: vi.fn(async () => {}),
    },
    cli: { isInstalled: vi.fn(async () => cliInstalled) },
    proxy: { start: vi.fn(), stop: vi.fn() },
    mkcert: { install: vi.fn() },
    projects: {
      list: vi.fn(async () => [
        { id: "p1", name: "MyApp", path: "C:/projects/myapp" },
      ]),
    },
  };
}

async function mountPage(status: SiteStatus, cliInstalled = false) {
  stubApi(status, cliInstalled);
  const w = mount(SitesPage);
  await flushPromises();
  return w;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("SitesPage card vocabulary", () => {
  it("gives the proxy a sigil that tracks whether it is running", async () => {
    const up = await mountPage(PROXY_UP);
    expect(up.findComponent(ServiceSigil).classes()).toContain("text-ember");
    expect(up.text()).toContain("Risen");

    setActivePinia(createPinia());
    const down = await mountPage(PROXY_DOWN);
    expect(down.findComponent(ServiceSigil).classes()).toContain(
      "text-dormant"
    );
    expect(down.text()).toContain("Dormant");
  });

  it("gives exactly one sigil to the whole row", async () => {
    // Proxy is a running service; the CA and the CLI are installed artefacts.
    const w = await mountPage(PROXY_UP, true);
    expect(w.findAllComponents(ServiceSigil)).toHaveLength(1);
  });

  it("states the CA in plain words, because a trusted root is not a lifecycle", async () => {
    const w = await mountPage(PROXY_UP);

    const ca = w.get("[data-testid='ca-card']").text();
    expect(ca).toContain("Root CA trusted");
    expect(ca).not.toContain("Risen");
    expect(ca).not.toContain("Dormant");
  });

  it("surfaces the mkcert binary as a separate fact from CA trust", async () => {
    const trusted = await mountPage(PROXY_UP);
    expect(trusted.get("[data-testid='mkcert-binary']").text()).toBe(
      "mkcert binary installed"
    );

    setActivePinia(createPinia());
    const binaryOnly = await mountPage({
      ...PROXY_UP,
      https: {
        binaryInstalled: true,
        caInstalled: false,
        certPath: null,
        keyPath: null,
      },
    });
    expect(binaryOnly.get("[data-testid='mkcert-binary']").text()).toBe(
      "mkcert binary installed"
    );
    expect(binaryOnly.text()).toContain("Root CA not trusted");
    // A binary without a trusted CA is exactly what the Install button is for.
    expect(binaryOnly.text()).toContain("Install");
  });

  it("keeps the CLI card on plain Installed wording", async () => {
    const w = await mountPage(PROXY_UP, true);
    expect(w.text()).toContain("horde command installed");
    expect(w.text()).toContain("Uninstall");
  });

  it("carries no ember anywhere when only the proxy is down", async () => {
    const w = await mountPage(PROXY_DOWN);
    expect(w.find(".text-ember").exists()).toBe(false);
  });
});

describe("SitesPage SSL control", () => {
  it("uses a plain switch with no sigil, because it is a config toggle", async () => {
    const w = await mountPage(PROXY_UP);

    const sw = w.get("[data-slot='switch']");
    expect(sw.exists()).toBe(true);
    expect(sw.text()).not.toContain("Risen");
    expect(w.text()).not.toContain("Dormant");
  });

  it("labels the switch for assistive tech", async () => {
    const w = await mountPage(PROXY_UP);

    const sw = w.get("[data-slot='switch']");
    const id = sw.attributes("id")!;
    expect(w.find(`label[for='${id}']`).text()).toBe("HTTPS");
  });

  it("commits the toggle straight through as Enabled/Disabled", async () => {
    const w = await mountPage(PROXY_UP);
    const api = (
      window as unknown as {
        electronAPI: { sites: { enableSsl: ReturnType<typeof vi.fn> } };
      }
    ).electronAPI;

    await w.get("[data-slot='switch']").trigger("click");
    await flushPromises();

    expect(api.sites.enableSsl).toHaveBeenCalledWith("p1", true);
  });
});

describe("SitesPage domains", () => {
  it("renders saved domains as chips rather than a text field", async () => {
    const w = await mountPage(PROXY_UP);
    expect(w.text()).toContain("myapp.test");
    expect(w.text()).not.toContain("Apply");
  });

  it("renders the project path in mono, because a path is machine data", async () => {
    const w = await mountPage(PROXY_UP);
    const mono = w.findAll(".font-mono").map((n) => n.text());
    expect(mono).toContain("C:/projects/myapp");
  });

  it("routes a chip removal to setDomains", async () => {
    const w = await mountPage(PROXY_UP);
    const api = (
      window as unknown as {
        electronAPI: { sites: { setDomains: ReturnType<typeof vi.fn> } };
      }
    ).electronAPI;

    await w.find("button[aria-label='Remove myapp.test']").trigger("click");
    await flushPromises();

    expect(api.sites.setDomains).toHaveBeenCalledWith("p1", []);
  });
});
