// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ServiceStatus from "@/shared/ui/ServiceStatus.vue";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";

describe("ServiceStatus", () => {
  it("names the absent state with plain text", () => {
    const w = mount(ServiceStatus, { props: { state: "absent" } });
    expect(w.text()).toBe("Not installed");
  });

  it("names the dormant state with plain text", () => {
    const w = mount(ServiceStatus, { props: { state: "dormant" } });
    expect(w.text()).toBe("Dormant");
  });

  it("names the risen state with plain text when there is no context", () => {
    const w = mount(ServiceStatus, { props: { state: "risen" } });
    expect(w.text()).toBe("Risen");
  });

  it("appends context to a risen state and marks it mono", () => {
    const w = mount(ServiceStatus, {
      props: { state: "risen", context: "8.4.24" },
    });
    expect(w.text()).toBe("Risen · 8.4.24");
    expect(w.find("span.font-mono").text()).toBe("8.4.24");
  });

  it("never marks a dormant context as mono payload", () => {
    const w = mount(ServiceStatus, {
      props: { state: "dormant", context: "8.4.24" },
    });
    expect(w.text()).toBe("Dormant");
    expect(w.find("span.font-mono").exists()).toBe(false);
  });

  it("conveys state through text, so the sigil is hidden from assistive tech", () => {
    const w = mount(ServiceStatus, { props: { state: "risen" } });
    const sigil = w.findComponent(ServiceSigil);
    expect(sigil.exists()).toBe(true);
    expect(sigil.attributes("aria-hidden")).toBe("true");
    expect(sigil.attributes("aria-label")).toBeUndefined();
  });

  it("applies the ember treatment only when risen", () => {
    const risen = mount(ServiceStatus, { props: { state: "risen" } });
    const dormant = mount(ServiceStatus, { props: { state: "dormant" } });
    expect(risen.find(".text-ember").exists()).toBe(true);
    expect(risen.find(".text-dormant").exists()).toBe(false);
    expect(dormant.find(".text-ember").exists()).toBe(false);
    expect(dormant.find(".text-dormant").exists()).toBe(true);
  });

  it("can hide the sigil without losing the state text", () => {
    const w = mount(ServiceStatus, {
      props: { state: "dormant", showSigil: false },
    });
    expect(w.findComponent(ServiceSigil).exists()).toBe(false);
    expect(w.text()).toBe("Dormant");
  });
});

describe("ServiceSigil", () => {
  it("is decorative by default", () => {
    const w = mount(ServiceSigil);
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.attributes("role")).toBeUndefined();
  });

  it("becomes an labelled image when given a label", () => {
    const w = mount(ServiceSigil, { props: { label: "Any service risen" } });
    expect(w.attributes("role")).toBe("img");
    expect(w.attributes("aria-label")).toBe("Any service risen");
    expect(w.attributes("aria-hidden")).toBeUndefined();
  });

  it("scales with size and never applies a glow while dormant", () => {
    for (const [size, expected] of [
      ["sm", "16"],
      ["md", "22"],
      ["lg", "30"],
    ] as const) {
      const w = mount(ServiceSigil, { props: { size } });
      expect(w.find("svg").attributes("width")).toBe(expected);
      expect(w.attributes("style")).toBeUndefined();
    }
  });

  it("applies the ember glow when risen", () => {
    const w = mount(ServiceSigil, { props: { risen: true } });
    expect(w.attributes("style")).toContain("drop-shadow(var(--ember-glow))");
  });
});
