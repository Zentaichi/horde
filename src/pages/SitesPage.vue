<template>
  <PageContainer class="flex flex-col">
    <div class="shrink-0">
      <h1 class="text-2xl font-bold tracking-tight">Sites</h1>
      <p class="text-sm text-muted-foreground">
        Local domains, HTTPS, and the reverse proxy
      </p>
    </div>

    <div
      v-if="error"
      class="shrink-0 flex items-start justify-between gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
    >
      <p class="flex-1">{{ error }}</p>
      <button
        @click="siteStore.clearError()"
        class="shrink-0 hover:opacity-70"
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>

    <div
      class="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain space-y-6"
    >
      <div class="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle class="text-base flex items-center gap-2">
              <ServiceSigil :risen="proxyRunning" size="sm" class="shrink-0" />
              Reverse Proxy
            </CardTitle>
            <CardDescription>
              <ServiceStatus
                v-if="status"
                :state="proxyState(proxyRunning)"
                size="sm"
                :show-sigil="false"
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              v-if="status"
              class="text-xs text-muted-foreground font-mono mb-3"
            >
              :{{ proxy?.port }} · https :{{ proxy?.httpsPort }}
            </p>
            <Button
              v-if="status && proxyRunning"
              variant="outline"
              size="sm"
              :disabled="loading"
              @click="siteStore.stopProxy()"
            >
              Stop
            </Button>
            <Button
              v-else-if="status"
              size="sm"
              :disabled="loading"
              @click="siteStore.startProxy()"
            >
              Start
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="ca-card">
          <CardHeader>
            <CardTitle class="text-base">HTTPS (mkcert)</CardTitle>
            <CardDescription>
              {{ caInstalled ? "Root CA trusted" : "Root CA not trusted" }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              v-if="status"
              class="text-xs text-muted-foreground mb-3"
              data-testid="mkcert-binary"
            >
              {{
                binaryInstalled
                  ? "mkcert binary installed"
                  : "mkcert binary not installed"
              }}
            </p>
            <Button
              v-if="status && !caInstalled"
              size="sm"
              :disabled="loading"
              @click="siteStore.installHttps()"
            >
              Install
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">CLI Companion</CardTitle>
            <CardDescription>
              {{ cliInstalled ? "horde command installed" : "Not installed" }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              v-if="cliInstalled"
              variant="outline"
              size="sm"
              :disabled="loading"
              @click="siteStore.uninstallCli()"
            >
              Uninstall
            </Button>
            <Button
              v-else
              size="sm"
              :disabled="loading"
              @click="siteStore.installCli()"
            >
              Install
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Project Domains</CardTitle>
          <CardDescription>
            Map a domain to each project. Serving requires the project's dev
            server to be running.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="project in projects"
            :key="project.id"
            class="border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium truncate">{{ project.name }}</div>
                <div class="text-xs text-muted-foreground font-mono truncate">
                  {{ project.path }}
                </div>
              </div>
              <div class="flex items-center gap-2 text-sm shrink-0">
                <label :for="`ssl-${project.id}`">HTTPS</label>
                <Switch
                  :id="`ssl-${project.id}`"
                  :model-value="siteByProject[project.id]?.sslEnabled ?? false"
                  :disabled="loading"
                  @update:model-value="onToggleSsl(project.id, $event)"
                />
              </div>
            </div>

            <div class="mt-3">
              <DomainEditor
                :domains="siteByProject[project.id]?.domains ?? []"
                :disabled="loading"
                @commit="onCommitDomains(project.id, $event)"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useSiteStore } from "@/features/sites/stores/siteStore";
import { useProjectStore } from "@/features/projects/stores/projectStore";
import DomainEditor from "@/features/sites/components/DomainEditor.vue";
import type { Site } from "@/shared/types/site";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import ServiceStatus from "@/shared/ui/ServiceStatus.vue";
import { proxyState } from "@/shared/lib/serviceState";
import PageContainer from "@/shared/ui/PageContainer.vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { X } from "@lucide/vue";

const siteStore = useSiteStore();
const projectStore = useProjectStore();

const { sites, status, loading, error, cliInstalled } = storeToRefs(siteStore);
const { projects } = storeToRefs(projectStore);

const proxy = computed(() => status.value?.proxy ?? null);
const proxyRunning = computed(() => proxy.value?.running ?? false);
const caInstalled = computed(() => status.value?.https.caInstalled ?? false);
const binaryInstalled = computed(
  () => status.value?.https.binaryInstalled ?? false
);

const siteByProject = computed<Record<string, Site>>(() => {
  const map: Record<string, Site> = {};
  for (const s of sites.value) map[s.projectId] = s;
  return map;
});

onMounted(async () => {
  await Promise.all([projectStore.fetchProjects(), siteStore.fetchAll()]);
});

function onToggleSsl(projectId: string, enabled: boolean) {
  void siteStore.toggleSsl(projectId, enabled);
}

function onCommitDomains(projectId: string, domains: string[]) {
  void siteStore.setDomains(projectId, domains);
}
</script>
