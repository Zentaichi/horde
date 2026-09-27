// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import DomainEditor from "@/features/sites/components/DomainEditor.vue";

function mountEditor(domains: string[] = []) {
  return mount(DomainEditor, { props: { domains } });
}

async function type(w: ReturnType<typeof mountEditor>, value: string) {
  await w.get("input").setValue(value);
}

describe("DomainEditor chips", () => {
  it("renders one chip per domain, in mono", () => {
    const w = mountEditor(["acme.test", "api.acme.test"]);

    const mono = w.findAll(".font-mono").map((n) => n.text());
    expect(mono).toEqual(["acme.test", "api.acme.test"]);
  });

  it("drops the Apply affordance entirely", () => {
    const w = mountEditor(["acme.test"]);
    expect(w.text()).not.toContain("Apply");
  });

  it("gives every remove control an accessible name", () => {
    const w = mountEditor(["acme.test"]);

    const remove = w.get("button");
    expect(remove.attributes("aria-label")).toBe("Remove acme.test");
    expect(remove.attributes("title")).toBe("Remove acme.test");
  });
});

describe("DomainEditor commit trigger", () => {
  it("commits on Enter", async () => {
    const w = mountEditor(["acme.test"]);
    await type(w, "api.acme.test");
    await w.get("input").trigger("keydown.enter");

    expect(w.emitted("commit")).toEqual([[["acme.test", "api.acme.test"]]]);
  });

  it("commits on blur, so a click-away is not lost", async () => {
    const w = mountEditor([]);
    await type(w, "acme.test");
    await w.get("input").trigger("blur");

    expect(w.emitted("commit")).toEqual([[["acme.test"]]]);
  });

  it("treats a comma-separated run as one commit", async () => {
    const w = mountEditor([]);
    await type(w, "a.test, b.test");
    await w.get("input").trigger("keydown.enter");

    // One commit -> one hosts-file write -> one UAC prompt.
    expect(w.emitted("commit")).toHaveLength(1);
    expect(w.emitted("commit")![0]).toEqual([["a.test", "b.test"]]);
  });

  it("holds the draft until the commit lands, so a rejection keeps the text", async () => {
    const w = mountEditor([]);
    await type(w, "a.test");
    await w.get("input").trigger("keydown.enter");

    // Nothing has come back from the parent yet.
    expect(w.get("input").element.value).toBe("a.test");

    // Once the parent re-renders with the domain, the field clears.
    await w.setProps({ domains: ["a.test"] });
    expect(w.get("input").element.value).toBe("");
  });

  it("keeps the draft when the parent re-renders without it", async () => {
    const w = mountEditor([]);
    await type(w, "not a domain");
    await w.get("input").trigger("keydown.enter");

    // A failed commit leaves `domains` untouched, so the text must survive.
    await w.setProps({ domains: [] });
    expect(w.get("input").element.value).toBe("not a domain");
  });

  it("suppresses a redundant commit, which would cost an elevation", async () => {
    const w = mountEditor(["acme.test"]);
    await type(w, "acme.test");
    await w.get("input").trigger("keydown.enter");

    expect(w.emitted("commit")).toBeUndefined();
  });

  it("does not fire on blur with an empty field", async () => {
    const w = mountEditor(["acme.test"]);
    await w.get("input").trigger("blur");

    expect(w.emitted("commit")).toBeUndefined();
  });

  it("commits the remaining domains when a chip is removed", async () => {
    const w = mountEditor(["keep.test", "drop.test"]);
    await w.findAll("button")[1].trigger("click");

    expect(w.emitted("commit")).toEqual([[["keep.test"]]]);
  });
});

describe("DomainEditor normalisation", () => {
  it("mirrors the backend: lowercases and trims", async () => {
    const w = mountEditor([]);
    await type(w, "  ACME.Test  ");
    await w.get("input").trigger("keydown.enter");

    expect(w.emitted("commit")![0]).toEqual([["acme.test"]]);
  });

  it("drops duplicates within a single run", async () => {
    const w = mountEditor([]);
    await type(w, "a.test, A.TEST");
    await w.get("input").trigger("keydown.enter");

    expect(w.emitted("commit")![0]).toEqual([["a.test"]]);
  });
});
