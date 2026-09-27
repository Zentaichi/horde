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

export interface AggregateInput {
  databaseRunning: number;
  devServerRunning: number;
  proxyRunning: boolean;
}

/**
 * Header aggregate: is *anything* Horde manages currently serving?
 *
 * Membership is database instances, dev servers, and the reverse proxy. A
 * selected global PHP version is deliberately excluded -- it is risen locally
 * on the Projects surface, but PHP is not a running service, so counting it
 * would light the global sigil for something that is merely configured.
 *
 * Never `absent`. Horde always manages the proxy, so "nothing at all is
 * installed" is not a state this app can be in; the same reasoning that keeps
 * `proxyState` from ever returning `absent` applies here. The aggregate is a
 * group, not a service, so it *does* have a dormant tier even though dev
 * servers individually do not.
 */
export function aggregateState(input: AggregateInput): ServiceState {
  const anyRunning =
    input.databaseRunning > 0 ||
    input.devServerRunning > 0 ||
    input.proxyRunning;
  return anyRunning ? "risen" : "dormant";
}
