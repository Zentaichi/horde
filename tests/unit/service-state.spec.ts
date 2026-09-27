import { describe, expect, it } from "vitest";
import {
  STATE_COPY,
  aggregateState,
  devServerState,
  instanceState,
  phpState,
  proxyState,
  stateLabel,
  versionState,
} from "@/shared/lib/serviceState";

describe("serviceState vocabulary", () => {
  it("exposes exactly three states with the agreed copy", () => {
    expect(Object.keys(STATE_COPY).sort()).toEqual([
      "absent",
      "dormant",
      "risen",
    ]);
    expect(STATE_COPY.absent).toBe("Not installed");
    expect(STATE_COPY.dormant).toBe("Dormant");
    expect(STATE_COPY.risen).toBe("Risen");
  });

  it("retired words never reappear in the copy", () => {
    const copy = Object.values(STATE_COPY).join(" ").toLowerCase();
    for (const retired of [
      "active",
      "running",
      "stopped",
      "installed version",
    ]) {
      expect(copy).not.toContain(retired);
    }
  });
});

describe("stateLabel", () => {
  it("returns the bare state word when there is no context", () => {
    expect(stateLabel("absent")).toBe("Not installed");
    expect(stateLabel("dormant")).toBe("Dormant");
    expect(stateLabel("risen")).toBe("Risen");
  });

  it("appends context only for a risen state", () => {
    expect(stateLabel("risen", "8.4.24")).toBe("Risen · 8.4.24");
    expect(stateLabel("risen", ":3306")).toBe("Risen · :3306");
    expect(stateLabel("dormant", "8.4.24")).toBe("Dormant");
    expect(stateLabel("absent", "8.4.24")).toBe("Not installed");
  });

  it("treats an empty context as no context", () => {
    expect(stateLabel("risen", "")).toBe("Risen");
  });
});

describe("phpState", () => {
  it("is risen once a global version is selected", () => {
    expect(phpState("8.4.24", 3)).toBe("risen");
  });

  it("is dormant when versions are installed but none is global", () => {
    expect(phpState(null, 1)).toBe("dormant");
  });

  it("is absent when nothing is installed, not dormant", () => {
    expect(phpState(null, 0)).toBe("absent");
  });
});

describe("versionState", () => {
  it("is dormant when installed and absent otherwise", () => {
    expect(versionState(true)).toBe("dormant");
    expect(versionState(false)).toBe("absent");
  });
});

describe("instanceState", () => {
  it("is risen only while running", () => {
    expect(instanceState(true)).toBe("risen");
    expect(instanceState(false)).toBe("dormant");
  });
});

describe("devServerState", () => {
  it("is risen while serving and absent otherwise, with no dormant tier", () => {
    expect(devServerState(true)).toBe("risen");
    expect(devServerState(false)).toBe("absent");
  });
});

describe("proxyState", () => {
  it("is never absent, since the proxy binary is always managed", () => {
    expect(proxyState(true)).toBe("risen");
    expect(proxyState(false)).toBe("dormant");
  });
});

describe("aggregateState", () => {
  const none = {
    databaseRunning: 0,
    devServerRunning: 0,
    proxyRunning: false,
  };

  it("is dormant only when every member is idle", () => {
    expect(aggregateState(none)).toBe("dormant");
  });

  it("is risen when any single member is serving", () => {
    expect(aggregateState({ ...none, databaseRunning: 1 })).toBe("risen");
    expect(aggregateState({ ...none, devServerRunning: 1 })).toBe("risen");
    expect(aggregateState({ ...none, proxyRunning: true })).toBe("risen");
  });

  it("is never absent, because Horde always manages the proxy", () => {
    // Not even with nothing installed or running: there is no such state.
    expect(aggregateState(none)).not.toBe("absent");
  });

  it("has a dormant tier even though dev servers individually do not", () => {
    // The aggregate is a group, not a service, so "installed but idle" is
    // meaningful here in a way it is not for a single dev server.
    expect(aggregateState(none)).toBe("dormant");
    expect(devServerState(false)).toBe("absent");
  });
});
