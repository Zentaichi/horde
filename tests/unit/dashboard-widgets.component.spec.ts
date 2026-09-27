// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import PhpStatusWidget from "@/widgets/PhpStatusWidget.vue";
import DatabaseStatusWidget from "@/widgets/DatabaseStatusWidget.vue";
import DevServerStatusWidget from "@/widgets/DevServerStatusWidget.vue";
import ProjectStatusWidget from "@/widgets/ProjectStatusWidget.vue";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";

const INSTALLED_PHP = [
  { version: "8.4.24", path: "C:/php/8.4.24", installed: true },
];

function stubApi(overrides: Record<string, unknown> = {}) {
  const api = {
    php: {
      getActiveVersion: vi.fn(async () => null),
      getInstalledVersions: vi.fn(async () => []),
    },
    databases: {
      listEngines: vi.fn(async () => [
        { engine: "mysql", displayName: "MySQL" },
      ]),
      listInstances: vi.fn(async () => []),
    },
    devserver: {
      listAll: vi.fn(async () => []),
    },
    projects: {
      list: vi.fn(async () => []),
    },
    ...overrides,
  };
  (window as unknown as { electronAPI: unknown }).electronAPI = api;
  return api;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("PhpStatusWidget", () => {
  it("reports the global version as a risen mono payload", async () => {
    stubApi({
      php: {
        getActiveVersion: vi.fn(async () => "8.4.24"),
        getInstalledVersions: vi.fn(async () => INSTALLED_PHP),
      },
    });
    const w = mount(PhpStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Risen · 8.4.24"));
    expect(w.find("span.font-mono").text()).toBe("8.4.24");
    expect(w.findComponent(ServiceSigil).classes()).toContain("text-ember");
  });

  it("is dormant, not absent, when versions exist but none is global", async () => {
    stubApi({
      php: {
        getActiveVersion: vi.fn(async () => null),
        getInstalledVersions: vi.fn(async () => INSTALLED_PHP),
      },
    });
    const w = mount(PhpStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Dormant"));
    expect(w.text()).not.toContain("Risen");
  });

  it("is absent rather than dormant when nothing is installed", async () => {
    stubApi();
    const w = mount(PhpStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Not installed"));
    expect(w.findComponent(ServiceSigil).classes()).toContain("text-dormant");
  });
});

describe("DatabaseStatusWidget", () => {
  it("is risen when at least one instance is running", async () => {
    stubApi({
      databases: {
        listEngines: vi.fn(async () => [
          { engine: "mysql", displayName: "MySQL" },
        ]),
        listInstances: vi.fn(async () => [
          {
            instanceId: "a",
            engine: "mysql",
            displayName: "MySQL",
            version: "8.0.36",
            port: 3306,
            running: true,
          },
        ]),
      },
    });
    const w = mount(DatabaseStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Risen"));
    expect(w.text()).toContain(":3306");
  });

  it("is dormant when instances exist but none is running", async () => {
    stubApi({
      databases: {
        listEngines: vi.fn(async () => [
          { engine: "mysql", displayName: "MySQL" },
        ]),
        listInstances: vi.fn(async () => [
          {
            instanceId: "a",
            engine: "mysql",
            displayName: "MySQL",
            version: "8.0.36",
            port: 3306,
            running: false,
          },
        ]),
      },
    });
    const w = mount(DatabaseStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Dormant"));
  });

  it("is absent when there are no instances at all", async () => {
    stubApi();
    const w = mount(DatabaseStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Not installed"));
  });
});

describe("DevServerStatusWidget", () => {
  it("is risen when a dev server is running", async () => {
    stubApi({
      devserver: {
        listAll: vi.fn(async () => [
          {
            projectId: "p1",
            projectName: "MyApp",
            docroot: "C:/projects/myapp",
            phpVersion: "8.4.24",
            port: 8000,
            running: true,
          },
        ]),
      },
    });
    const w = mount(DevServerStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Risen"));
    expect(w.text()).toContain(":8000");
  });

  it("is absent when no dev server exists", async () => {
    stubApi();
    const w = mount(DevServerStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("Not installed"));
  });
});

describe("ProjectStatusWidget", () => {
  it("carries no sigil, because a project catalogue is not a lifecycle", async () => {
    stubApi({
      projects: {
        list: vi.fn(async () => [
          {
            id: "p1",
            name: "MyApp",
            path: "C:/projects/myapp",
            phpVersion: "8.4.24",
            isPhpVersionInstalled: true,
          },
        ]),
      },
    });
    const w = mount(ProjectStatusWidget);
    await vi.waitFor(() => expect(w.text()).toContain("MyApp"));
    expect(w.findComponent(ServiceSigil).exists()).toBe(false);
  });
});
