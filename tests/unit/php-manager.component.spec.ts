// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";

import InstalledVersionList from "@/features/php/components/InstalledVersionList.vue";
import VersionCard from "@/shared/ui/VersionCard.vue";
import ExtensionList from "@/features/extensions/components/ExtensionList.vue";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import { usePhpStore } from "@/features/php/stores/phpStore";

const VERSIONS = [
  { version: "8.4.24", path: "C:/php/8.4.24", installed: true },
  { version: "8.3.12", path: "C:/php/8.3.12", installed: true },
];

beforeEach(() => {
  setActivePinia(createPinia());
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    openDirectory: vi.fn(),
  };
});

describe("InstalledVersionList", () => {
  it("marks only the global version as risen", () => {
    const store = usePhpStore();
    store.activeVersion = "8.4.24";
    const w = mount(InstalledVersionList, { props: { versions: VERSIONS } });

    const badges = w.findAll("[data-slot='badge']");
    expect(badges).toHaveLength(1);
    expect(badges[0].text()).toBe("Risen");
  });

  it("drops the retired Active and In Use words entirely", () => {
    const store = usePhpStore();
    store.activeVersion = "8.4.24";
    const w = mount(InstalledVersionList, { props: { versions: VERSIONS } });

    const text = w.text();
    expect(text).not.toContain("Active");
    expect(text).not.toContain("In Use");
    expect(text).toContain("Risen");
  });

  it("keeps the global version in the sans label and the number in mono", () => {
    const store = usePhpStore();
    store.activeVersion = "8.4.24";
    const w = mount(InstalledVersionList, { props: { versions: VERSIONS } });

    const mono = w.findAll("span.font-mono").map((n) => n.text());
    expect(mono).toContain("8.4.24");
    expect(mono).toContain("8.3.12");
    // The word "PHP" stays in the sans label, not dragged into mono.
    expect(w.text()).toContain("PHP");
  });

  it("still offers Set as Global on non-global versions only", () => {
    const store = usePhpStore();
    store.activeVersion = "8.4.24";
    const w = mount(InstalledVersionList, { props: { versions: VERSIONS } });

    const labels = w.findAll("button").map((b) => b.text());
    expect(labels.filter((l) => l.includes("Set as Global"))).toHaveLength(1);
  });

  it("shows no state badge at all when nothing is global", () => {
    const store = usePhpStore();
    store.activeVersion = null;
    const w = mount(InstalledVersionList, { props: { versions: VERSIONS } });

    expect(w.findAll("[data-slot='badge']")).toHaveLength(0);
    expect(w.findComponent(ServiceSigil).exists()).toBe(false);
  });
});

describe("VersionCard", () => {
  it("reports an installed but not running version as dormant", () => {
    const w = mount(VersionCard, {
      props: {
        label: "PHP",
        version: "8.4.24",
        installed: true,
        downloading: false,
      },
    });
    expect(w.text()).toContain("Dormant");
    expect(w.text()).not.toContain("Installed");
  });

  it("shows no state badge and offers Download when absent", () => {
    const w = mount(VersionCard, {
      props: {
        label: "PHP",
        version: "8.4.24",
        installed: false,
        downloading: false,
      },
    });
    expect(w.findAll("[data-slot='badge']")).toHaveLength(0);
    expect(w.text()).toContain("Download");
  });

  it("keeps available versions free of ember", () => {
    const w = mount(VersionCard, {
      props: {
        label: "MySQL",
        version: "8.0.36",
        installed: true,
        downloading: false,
      },
    });
    expect(w.find(".text-ember").exists()).toBe(false);
  });

  it("renders the version in mono without dragging the label into mono", () => {
    const w = mount(VersionCard, {
      props: {
        label: "MySQL",
        version: "8.0.36",
        installed: false,
        downloading: false,
      },
    });
    const mono = w.find("span.font-mono");
    expect(mono.text()).toBe("8.0.36");
    expect(mono.text()).not.toContain("MySQL");
  });
});

describe("ExtensionList", () => {
  const extensions = [
    { name: "curl", enabled: true, bundled: true as const },
    { name: "gd", enabled: false, bundled: true as const },
  ];

  it("uses plain Enabled and Disabled wording", () => {
    const w = mount(ExtensionList, { props: { extensions } });
    const text = w.text();
    expect(text).toContain("Enabled");
    expect(text).toContain("Disabled");
    expect(text).not.toContain("Risen");
    expect(text).not.toContain("Dormant");
  });

  it("carries no sigil and no ember, because a toggle is not a lifecycle", () => {
    const w = mount(ExtensionList, { props: { extensions } });
    expect(w.findComponent(ServiceSigil).exists()).toBe(false);
    expect(w.find(".text-ember").exists()).toBe(false);
  });

  it("gives each toggle an accessible name and pressed state", () => {
    const w = mount(ExtensionList, { props: { extensions } });
    const toggles = w.findAll("button");
    expect(toggles).toHaveLength(2);
    expect(toggles[0].attributes("aria-label")).toBe("Toggle curl");
    expect(toggles[0].attributes("aria-pressed")).toBe("true");
    expect(toggles[1].attributes("aria-pressed")).toBe("false");
  });
});
