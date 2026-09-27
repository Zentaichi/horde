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

function mountList(instances: DatabaseInstance[], engine = "mysql") {
  const store = useDatabaseStore();
  store.instances = instances;
  return mount(InstanceList, { props: { engine } });
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

describe("InstanceList engine scoping", () => {
  it("shows only instances belonging to the selected engine", () => {
    // Regression: the list rendered every engine's instances unfiltered, so
    // picking PostgreSQL still showed MySQL.
    const w = mountList([RUNNING, STOPPED], "mysql");

    expect(w.text()).toContain("MySQL");
    expect(w.text()).not.toContain("Postgres");
  });

  it("swaps content when the engine changes", () => {
    const w = mountList([RUNNING, STOPPED], "postgres");

    expect(w.text()).toContain("Postgres");
    expect(w.text()).not.toContain("MySQL");
  });

  it("shows the empty state when the engine has no instances", () => {
    // Only a mysql instance exists, but postgres is selected.
    const w = mountList([RUNNING], "postgres");

    expect(w.find("[data-testid='instance-tally']").exists()).toBe(false);
    // engineDisplayName resolves to "PostgreSQL" only once `engines` is
    // populated; unstubbed it falls back to the raw key, so match either.
    expect(w.text()).toMatch(/No postgres instances/i);
  });
});

describe("InstanceList aggregate tally", () => {
  it("counts the engine-scoped array it actually renders", () => {
    const w = mountList([RUNNING, STOPPED]);
    // STOPPED is postgres, so the mysql-scoped tally sees only RUNNING.
    expect(w.get("[data-testid='instance-tally']").text()).toBe(
      "1 running / 0 stopped"
    );
  });

  it("is per-engine, not global", () => {
    // RUNNING is mysql and running; STOPPED is postgres and stopped. Neither
    // engine has both, so each scoped tally must see exactly one instance.
    expect(
      mountList([RUNNING, STOPPED], "mysql")
        .get("[data-testid='instance-tally']")
        .text()
    ).toBe("1 running / 0 stopped");
    expect(
      mountList([RUNNING, STOPPED], "postgres")
        .get("[data-testid='instance-tally']")
        .text()
    ).toBe("0 running / 1 stopped");
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
  it("marks a running instance as risen", () => {
    expect(mountList([RUNNING]).text()).toContain("Risen");
  });

  it("marks a stopped instance as dormant", () => {
    expect(mountList([STOPPED], "postgres").text()).toContain("Dormant");
  });

  it("puts ember only on the running instance", () => {
    // Two mysql siblings so this compares against a stopped instance.
    const stoppedSibling: DatabaseInstance = {
      ...RUNNING,
      instanceId: "i9",
      version: "8.0.35",
      port: 3308,
      running: false,
    };
    const w = mountList([RUNNING, stoppedSibling]);

    const sigils = w.findAllComponents(ServiceSigil);
    const ember = sigils.filter((s) => s.classes().includes("text-ember"));
    const dormant = sigils.filter((s) => s.classes().includes("text-dormant"));
    // Per instance: one header sigil plus one badge sigil, on both states.
    expect(ember).toHaveLength(2);
    expect(dormant).toHaveLength(2);
  });

  it("keeps ember off the card when nothing is running", () => {
    const w = mountList([STOPPED], "postgres");
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
    const w = mountList([STOPPED], "postgres");

    const titles = w.findAll("button").map((b) => b.attributes("title"));
    expect(titles).toContain("Delete instance");
    // The label is gone from the button face.
    expect(w.findAll("button").map((b) => b.text())).not.toContain("Delete");
    // No menu widget was introduced for this.
    expect(w.find("[role='menu']").exists()).toBe(false);
  });

  it("still confirms inline before deleting", async () => {
    const w = mountList([STOPPED], "postgres");

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
    const w = mountList([STOPPED], "postgres");
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
