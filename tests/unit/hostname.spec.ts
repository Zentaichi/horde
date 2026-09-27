import { describe, expect, it } from "vitest";
import {
  invalidHostnames,
  isValidHostname,
} from "../../electron/utils/hostname";

describe("isValidHostname", () => {
  it("accepts ordinary hostnames", () => {
    for (const d of [
      "myapp.test",
      "api.myapp.test",
      "a.b.c.d.test",
      "my-app.test",
      "app1.test",
      "localhost",
    ]) {
      expect(isValidHostname(d), d).toBe(true);
    }
  });

  it("is case-insensitive", () => {
    expect(isValidHostname("MyApp.Test")).toBe(true);
  });

  it("rejects anything with a scheme, port, path, or space", () => {
    for (const d of [
      "http://myapp.test",
      "myapp.test:8080",
      "myapp.test/path",
      "my app.test",
      "*.myapp.test",
      "myapp.test.",
      ".myapp.test",
    ]) {
      expect(isValidHostname(d), d).toBe(false);
    }
  });

  it("rejects empty and over-long input", () => {
    expect(isValidHostname("")).toBe(false);
    expect(isValidHostname("a".repeat(254))).toBe(false);
  });

  it("rejects labels that are too long", () => {
    expect(isValidHostname(`${"a".repeat(64)}.test`)).toBe(false);
  });
});

describe("invalidHostnames", () => {
  it("returns only the offending entries", () => {
    expect(
      invalidHostnames(["good.test", "not a domain", "also-good.test"])
    ).toEqual(["not a domain"]);
  });

  it("returns an empty list when everything is valid", () => {
    expect(invalidHostnames(["a.test", "b.test"])).toEqual([]);
  });

  it("preserves order so the error message is predictable", () => {
    expect(invalidHostnames(["bad one", "ok.test", "bad two"])).toEqual([
      "bad one",
      "bad two",
    ]);
  });
});
