import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useDatabaseStore } from "@/features/database/stores/databaseStore";
import { useDevServerStore } from "@/features/devserver/stores/devServerStore";
import { useSiteStore } from "@/features/sites/stores/siteStore";
import {
  aggregateState,
  type AggregateInput,
  type ServiceState,
} from "@/shared/lib/serviceState";

/**
 * Header aggregate status, derived in the renderer from the Pinia stores.
 *
 * Deliberately no new IPC channel: every input already has one, and Q4 settled
 * that the aggregate is a pure fold over store state. It lives in `app/` rather
 * than `shared/` because it reads feature stores, which `shared` may not import.
 *
 * `ready` is the part that is easy to get wrong. `instances` and `servers` are
 * both `[]` before the first fetch *and* after a fetch that finds nothing, so
 * the aggregate cannot tell "not yet known" from "known to be empty". Rather
 * than invent a fourth word, the header stays dormant until the first fetch
 * settles and only then honours the 150ms sigil transition -- otherwise every
 * cold start fires a fake dormant -> risen flip that the user did not cause.
 */
export function useAggregateStatus() {
  const databaseStore = useDatabaseStore();
  const devServerStore = useDevServerStore();
  const siteStore = useSiteStore();

  const { instances } = storeToRefs(databaseStore);
  const { servers } = storeToRefs(devServerStore);
  const { status } = storeToRefs(siteStore);

  const ready = ref(false);

  const input = computed<AggregateInput>(() => ({
    databaseRunning: instances.value.filter((i) => i.running).length,
    devServerRunning: servers.value.filter((s) => s.running).length,
    proxyRunning: status.value?.proxy.running ?? false,
  }));

  const state = computed<ServiceState>(() => aggregateState(input.value));

  async function refresh() {
    await Promise.all([
      databaseStore.fetchInstances(),
      devServerStore.fetchAll(),
      siteStore.fetchAll(),
    ]);
    ready.value = true;
  }

  return { state, ready, refresh };
}
