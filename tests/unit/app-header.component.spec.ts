// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h } from "vue";

import App from "@/app/App.vue";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";

/**
 * The header pulls in the real router, so stub it rather than standing up a
 * router instance -- the nav links are not what these tests are about.
 */
const RouterLinkStub = defineComponent({
  props: { to: { type: String, required: false } },
  setup(props, { slots }) {
    return () => h("a", { href: props.to }, slots.default?.());
  },
});

function stubApi(opts: {
  instances?: { running: boolean }[];
  servers?: { running: boolean }[];
  proxyRunning?: boolean;
}) {
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    databases: {
      listInstances: vi.fn(async () =>
        (opts.instances ?? []).map((i, n) => ({
          instanceId: `i${n}`,
          engine: "mysql",
          version: "8.0.36",
          port: 3306,
          ...i,
        }))
      ),
    },
    devserver: { listAll: vi.fn(async () => opts.servers ?? []) },
    sites: {
      list: vi.fn(async () => []),
      getStatus: vi.fn(async () => ({
        hostsReady: true,
        proxy: {
          running: opts.proxyRunning ?? false,
          port: 8080,
          httpsPort: 8443,
        },
        https: {
          binaryInstalled: true,
          caInstalled: true,
          certPath: null,
          keyPath: null,
        },
      })),
    },
    cli: { isInstalled: vi.fn(async () => false) },
  };
}

async function mountHeader(opts: Parameters<typeof stubApi>[0]) {
  stubApi(opts);
  const w = mount(App, {
    global: { stubs: { RouterLink: RouterLinkStub, RouterView: true } },
  });
  await flushPromises();
  return w;
}

function sigil(w: Awaited<ReturnType<typeof mountHeader>>) {
  return w.findComponent(ServiceSigil);
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("App header aggregate sigil", () => {
  it("is dormant when nothing is serving", async () => {
    const w = await mountHeader({});
    expect(sigil(w).classes()).toContain("text-dormant");
    expect(w.find(".text-ember").exists()).toBe(false);
  });

  it("rises for a running database instance", async () => {
    const w = await mountHeader({ instances: [{ running: true }] });
    expect(sigil(w).classes()).toContain("text-ember");
  });

  it("rises for a running dev server", async () => {
    const w = await mountHeader({
      servers: [
        {
          projectId: "p1",
          projectName: "MyApp",
          docroot: "C:/p",
          phpVersion: "8.4.24",
          port: 8000,
          running: true,
        },
      ],
    });
    expect(sigil(w).classes()).toContain("text-ember");
  });

  it("rises for a running proxy", async () => {
    const w = await mountHeader({ proxyRunning: true });
    expect(sigil(w).classes()).toContain("text-ember");
  });

  it("stays dormant when a database instance merely exists but is stopped", async () => {
    const w = await mountHeader({ instances: [{ running: false }] });
    expect(sigil(w).classes()).toContain("text-dormant");
  });
});

describe("App header transition discipline", () => {
  it("does not animate before the first fetch settles", async () => {
    stubApi({ instances: [{ running: true }] });
    const w = mount(App, {
      global: { stubs: { RouterLink: RouterLinkStub, RouterView: true } },
    });

    // Pre-fetch: dormant and static, so the load cannot fake a state change.
    const before = w.findComponent(ServiceSigil);
    expect(before.classes()).toContain("text-dormant");
    expect(before.classes().join(" ")).not.toContain("transition-");

    await flushPromises();
    expect(w.findComponent(ServiceSigil).classes()).toContain("text-ember");
  });

  it("animates once the fetch has settled", async () => {
    const w = await mountHeader({ instances: [{ running: true }] });
    expect(sigil(w).classes().join(" ")).toContain("transition-");
  });
});

describe("App header semantics", () => {
  it("keeps the 30px brand logo static and separate from the signal", async () => {
    const w = await mountHeader({ instances: [{ running: true }] });

    // The wordmark is the brand anchor and must not become the indicator.
    const logo = w.findComponent({ name: "HordeLogo" });
    expect(logo.exists()).toBe(true);
    // Exactly one sigil, the 16px inline one beside the wordmark.
    expect(w.findAllComponents(ServiceSigil)).toHaveLength(1);
  });

  it("gives the bare sigil an accessible name, since no text sits beside it", async () => {
    const up = await mountHeader({ instances: [{ running: true }] });
    const on = up.get("[role='img']");
    expect(on.attributes("aria-label")).toBe(
      "At least one Horde service is running"
    );

    setActivePinia(createPinia());
    const down = await mountHeader({});
    expect(down.get("[role='img']").attributes("aria-label")).toBe(
      "No Horde services are running"
    );
  });

  it("leaves the active nav underline neutral, because P1 reserves ember for risen", async () => {
    const w = await mountHeader({ instances: [{ running: true }] });
    // Only the aggregate sigil may carry ember in the header.
    expect(w.findAll(".text-ember")).toHaveLength(1);
  });
});
