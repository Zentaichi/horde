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

export function devServerState(
  present: boolean,
  running: boolean
): ServiceState {
  if (running) return "risen";
  return present ? "dormant" : "absent";
}

export function proxyState(running: boolean): ServiceState {
  return running ? "risen" : "dormant";
}
