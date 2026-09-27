export type ServiceState = "absent" | "dormant" | "risen";

export const STATE_COPY: Record<ServiceState, string> = {
  absent: "Not installed",
  dormant: "Dormant",
  risen: "Risen",
};

export function stateLabel(state: ServiceState, context?: string): string {
  if (state === "risen" && context) return `${STATE_COPY.risen} · ${context}`;
  return STATE_COPY[state];
}

export function phpState(
  activeVersion: string | null,
  installedCount: number
): ServiceState {
  if (activeVersion) return "risen";
  if (installedCount > 0) return "dormant";
  return "absent";
}

export function versionState(installed: boolean): ServiceState {
  return installed ? "dormant" : "absent";
}

export function instanceState(running: boolean): ServiceState {
  return running ? "risen" : "dormant";
}

/**
 * Dev servers have no "dormant" state, unlike most other services.
 *
 * `DevServerManager` tracks servers in an in-memory map and `stop()` deletes
 * the entry outright, so a stopped dev server is indistinguishable from one
 * that never started -- there is nothing left to report. Reporting "dormant"
 * would mean the renderer had to remember an entry the main process has
 * already forgotten, and the next `fetchAll()` would silently drop it.
 *
 * The honest mapping is therefore binary: running, or not present.
 */
export function devServerState(running: boolean): ServiceState {
  return running ? "risen" : "absent";
}

export function proxyState(running: boolean): ServiceState {
  return running ? "risen" : "dormant";
}
