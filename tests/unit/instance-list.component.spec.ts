// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";

import InstanceList from "@/features/database/components/InstanceList.vue";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import { useDatabaseStore } from "@/features/database/stores/databaseStore";
import type { DatabaseInstance } from "@/shared/types/database";

const RUNNING: DatabaseInstance = {
  instanceId: "i1",
  engine: "mysql",
  displayName: "MySQL",
  version: "8.0.36",
  port: 3307,
  running: true,
  label: "app",
};

const STOPPED: DatabaseInstance = {
  instanceId: "i2",
  engine: "postgres",
  displayName: "Postgres",
  version: "16.2",
  port: 5433,
  running: false,
};

function mountList(instances: DatabaseInstance[]) {
  const store = useDatabaseStore();
  store.instances = instances;
  return mount(InstanceList, { props: { engine: "mysql" } });
}

function buttonLabelled(w: ReturnType<typeof mountList>, label: string) {
  return w.findAll("button").find((b) => b.text().trim() === label)!;
}

beforeEach(() => {
  setActivePinia(createPinia());
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    databases: {
      listInstances: vi.fn(async () => []),
      listDatabases: vi.fn(async () => []),
      start: vi.fn(),
      stop: vi.fn(),
      removeInstance: vi.fn(),
      createDatabase: vi.fn(),
      dropDatabase: vi.fn(),
      exportDatabase: vi.fn(),
      importDatabase: vi.fn(),
    },
    showSaveDialog: vi.fn(async () => null),
    showOpenDialog: vi.fn(async () => null),
  };
});

describe("InstanceList aggregate tally", () => {
  it("counts the array it actually renders", () => {
    const w = mountList([RUNNING, STOPPED]);
    expect(w.get("[data-testid='instance-tally']").text()).toBe(
      "1 running / 1 stopped"
    );
  });

  it("counts across engines, because the list is not filtered by the prop", () => {
    const w = mountList([RUNNING, STOPPED]);
    // Both a mysql and a postgres instance are on screen under engine="mysql".
    expect(w.text()).toContain("MySQL");
    expect(w.text()).toContain("Postgres");
    expect(w.get("[data-testid='instance-tally']").text()).toContain(
      "1 running / 1 stopped"
    );
  });

  it("shows no tally when there are no instances", () => {
    const w = mountList([]);
    expect(w.find("[data-testid='instance-tally']").exists()).toBe(false);
  });

  it("reports zero of each when every instance is running", () => {
    const w = mountList([RUNNING]);
    expect(w.get("[data-testid='instance-tally']").text()).toBe(
      "1 running / 0 stopped"
    );
  });
});

describe("InstanceList per-instance state", () => {
  it("marks a running instance as risen and a stopped one as dormant", () => {
    const w = mountList([RUNNING, STOPPED]);
    const text = w.text();
    expect(text).toContain("Risen");
    expect(text).toContain("Dormant");
  });

  it("puts ember only on the running instance", () => {
    const w = mountList([RUNNING, STOPPED]);

    const sigils = w.findAllComponents(ServiceSigil);
    const ember = sigils.filter((s) => s.classes().includes("text-ember"));
    const dormant = sigils.filter((s) => s.classes().includes("text-dormant"));
    // One header sigil per instance, plus the badge sigil on the risen one.
    expect(ember).toHaveLength(2);
    expect(dormant).toHaveLength(2);
  });

  it("keeps ember off the card when nothing is running", () => {
    const w = mountList([STOPPED]);
    expect(w.find(".text-ember").exists()).toBe(false);
  });
});

describe("InstanceList machine data", () => {
  it("renders the port in mono and drops the word Port", () => {
    const w = mountList([RUNNING]);
    expect(w.text()).not.toContain("Port ");
    const mono = w.findAll(".font-mono").map((n) => n.text());
    expect(mono).toContain(":3307");
  });

  it("keeps the engine name sans and the version in mono", () => {
    const w = mountList([RUNNING]);
    const mono = w.findAll(".font-mono").map((n) => n.text());
    expect(mono).toContain("8.0.36");
    expect(mono).not.toContain("MySQL");
  });
});

describe("InstanceList action hierarchy", () => {
  it("keeps Delete as a titled icon button rather than an overflow menu", () => {
    const w = mountList([STOPPED]);

    const titles = w.findAll("button").map((b) => b.attributes("title"));
    expect(titles).toContain("Delete instance");
    // The label is gone from the button face.
    expect(w.findAll("button").map((b) => b.text())).not.toContain("Delete");
    // No menu widget was introduced for this.
    expect(w.find("[role='menu']").exists()).toBe(false);
  });

  it("still confirms inline before deleting", async () => {
    const w = mountList([STOPPED]);

    const del = w
      .findAll("button")
      .find((b) => b.attributes("title") === "Delete instance")!;
    await del.trigger("click");

    expect(w.text()).toContain("Delete?");
    expect(buttonLabelled(w, "Yes").exists()).toBe(true);
    expect(buttonLabelled(w, "No").exists()).toBe(true);
  });

  it("does not weight Import the same as Stop", () => {
    const w = mountList([RUNNING]);

    // Stop is the strong control; Import is a benign utility and recedes.
    expect(buttonLabelled(w, "Stop").classes()).toContain("border-border");
    expect(buttonLabelled(w, "Import").classes()).not.toContain(
      "border-border"
    );
  });

  it("promotes Start as the primary action when the instance is stopped", () => {
    const w = mountList([STOPPED]);
    const start = buttonLabelled(w, "Start");
    expect(start.classes()).toContain("bg-primary");
    expect(w.text()).not.toContain("Import");
  });

  it("cannot delete a running instance", () => {
    const w = mountList([RUNNING]);
    const del = w
      .findAll("button")
      .find((b) => b.attributes("title") === "Delete instance")!;
    expect(del.attributes("disabled")).toBeDefined();
  });
});
