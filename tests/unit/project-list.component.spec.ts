// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";

import ProjectList from "@/features/projects/components/ProjectList.vue";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import type { Project } from "@/shared/types/project";

const SERVED: Project = {
  id: "p1",
  name: "MyApp",
  path: "C:/projects/myapp",
  phpVersion: "8.4.24",
  isPhpVersionInstalled: true,
  domains: ["myapp.test", "www.myapp.test"],
};

const IDLE: Project = {
  id: "p2",
  name: "Blog",
  path: "C:/projects/blog",
  phpVersion: "8.3.12",
  isPhpVersionInstalled: true,
};

beforeEach(() => {
  setActivePinia(createPinia());
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    devserver: {
      listAll: vi.fn(async () => []),
      getLogs: vi.fn(async () => []),
      onLog: vi.fn(() => () => {}),
    },
  };
});

describe("ProjectList dev-server sigil", () => {
  it("marks a served project as risen and names the port", () => {
    const w = mount(ProjectList, {
      props: { projects: [SERVED], serverMap: { p1: 8000 } },
    });

    const sigil = w.findComponent(ServiceSigil);
    expect(sigil.classes()).toContain("text-ember");
    expect(w.text()).toContain("Risen");
    expect(w.text()).toContain(":8000");
  });

  it("never reports a dormant dev server, because stop() deletes the entry", () => {
    const w = mount(ProjectList, {
      props: { projects: [IDLE], serverMap: {} },
    });

    expect(w.text()).not.toContain("Dormant");
    expect(w.findAll("[data-slot='badge']")).toHaveLength(1);
    expect(w.findComponent(ServiceSigil).classes()).toContain("text-dormant");
  });

  it("keeps ember off the card when nothing is serving", () => {
    const w = mount(ProjectList, {
      props: { projects: [SERVED, IDLE], serverMap: {} },
    });

    expect(w.find(".text-ember").exists()).toBe(false);
  });

  it("marks ember only on the project that is actually served", () => {
    const w = mount(ProjectList, {
      props: { projects: [SERVED, IDLE], serverMap: { p1: 8000 } },
    });

    // The served card's header sigil and its status badge are the only ember.
    const sigils = w.findAllComponents(ServiceSigil);
    const ember = sigils.filter((s) => s.classes().includes("text-ember"));
    const dormant = sigils.filter((s) => s.classes().includes("text-dormant"));
    expect(ember).toHaveLength(2);
    expect(dormant).toHaveLength(1);
  });
});

describe("ProjectList chips", () => {
  it("renders the path in mono, because a path is machine data", () => {
    const w = mount(ProjectList, {
      props: { projects: [IDLE], serverMap: {} },
    });

    expect(w.find("p.font-mono").text()).toBe("C:/projects/blog");
  });

  it("keeps the PHP label sans and the version in mono", () => {
    const w = mount(ProjectList, {
      props: { projects: [IDLE], serverMap: {} },
    });

    const mono = w.findAll(".font-mono").map((n) => n.text());
    expect(mono).toContain("8.3.12");
    expect(mono).not.toContain("PHP");
    expect(w.text()).toContain("PHP");
  });

  it("shows only the first mapped domain", () => {
    const w = mount(ProjectList, {
      props: { projects: [SERVED], serverMap: {} },
    });

    const mono = w.findAll(".font-mono").map((n) => n.text());
    expect(mono).toContain("myapp.test");
    expect(mono).not.toContain("www.myapp.test");
  });

  it("omits the domain chip for an unmapped project", () => {
    const w = mount(ProjectList, {
      props: { projects: [IDLE], serverMap: {} },
    });

    const mono = w.findAll(".font-mono").map((n) => n.text());
    expect(mono).not.toContain("myapp.test");
  });
});

describe("ProjectList actions", () => {
  it("reduces Rescan and Open to titled icon buttons", () => {
    const w = mount(ProjectList, {
      props: { projects: [IDLE], serverMap: {} },
    });

    const text = w.text();
    expect(text).not.toContain("Rescan");
    expect(text).not.toContain("Open");

    const titles = w.findAll("button").map((b) => b.attributes("title"));
    expect(titles).toContain("Rescan for .php-version");
    expect(titles).toContain("Open project folder");
  });

  it("emits scan and openDir from the icon buttons", async () => {
    const w = mount(ProjectList, {
      props: { projects: [IDLE], serverMap: {} },
    });

    const byTitle = (title: string) =>
      w.findAll("button").find((b) => b.attributes("title") === title)!;

    await byTitle("Rescan for .php-version").trigger("click");
    await byTitle("Open project folder").trigger("click");

    expect(w.emitted("scan")).toEqual([["p2"]]);
    expect(w.emitted("openDir")).toEqual([["p2"]]);
  });

  it("keeps Serve on a neutral outline, because P1 reserves ember for risen", () => {
    const w = mount(ProjectList, {
      props: { projects: [IDLE], serverMap: {} },
    });

    expect(w.text()).toContain("Serve");
    expect(w.find(".text-ember").exists()).toBe(false);
  });
});
