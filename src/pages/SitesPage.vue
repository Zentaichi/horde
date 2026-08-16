<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Sites</h1>
      <p class="text-sm text-muted-foreground">
        Local domains, HTTPS, and the reverse proxy
      </p>
    </div>

    <div
      v-if="error"
      class="flex items-start justify-between gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
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

    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="text-base flex items-center gap-2">
            <span
              class="size-2.5 rounded-full"
              :class="proxyRunning ? 'bg-green-500' : 'bg-gray-400'"
            ></span>
            Reverse Proxy
          </CardTitle>
          <CardDescription>
            {{
              proxyRunning
                ? `Running on :${proxy?.port} (https :${proxy?.httpsPort})`
                : "Stopped"
            }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            v-if="proxyRunning"
            variant="outline"
            size="sm"
            :disabled="loading"
            @click="siteStore.stopProxy()"
          >
            Stop
          </Button>
          <Button
            v-else
            size="sm"
            :disabled="loading"
            @click="siteStore.startProxy()"
          >
            Start
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base flex items-center gap-2">
            <span
              class="size-2.5 rounded-full"
              :class="caInstalled ? 'bg-green-500' : 'bg-gray-400'"
            ></span>
            HTTPS (mkcert)
          </CardTitle>
          <CardDescription>
            {{ caInstalled ? "Root CA trusted" : "Root CA not installed" }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            v-if="!caInstalled"
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
          <CardTitle class="text-base flex items-center gap-2">
            <span
              class="size-2.5 rounded-full"
              :class="cliInstalled ? 'bg-green-500' : 'bg-gray-400'"
            ></span>
            CLI Companion
          </CardTitle>
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
              <div class="text-xs text-muted-foreground truncate">
                {{ project.path }}
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm shrink-0">
              HTTPS
              <input
                type="checkbox"
                :checked="siteByProject[project.id]?.sslEnabled ?? false"
                @change="onToggleSsl(project.id, $event)"
              />
            </label>
          </div>

          <div class="mt-2 flex items-center gap-2">
            <input
              :value="drafts[project.id] ?? ''"
              @input="onDraft(project.id, $event)"
              @keydown.enter="onApplyDomains(project.id)"
              placeholder="myproject.test, api.myproject.test"
              class="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              :disabled="loading"
              @click="onApplyDomains(project.id)"
            >
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { storeToRefs } from "pinia";
import { useSiteStore } from "@/features/sites/stores/siteStore";
import { useProjectStore } from "@/features/projects/stores/projectStore";
import type { Site } from "@/shared/types/site";
import { Button } from "@/shared/ui/button";
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

const drafts = reactive<Record<string, string>>({});

const proxy = computed(() => status.value?.proxy ?? null);
const proxyRunning = computed(() => proxy.value?.running ?? false);
const caInstalled = computed(() => status.value?.https.caInstalled ?? false);

const siteByProject = computed<Record<string, Site>>(() => {
  const map: Record<string, Site> = {};
  for (const s of sites.value) map[s.projectId] = s;
  return map;
});

onMounted(async () => {
  await Promise.all([projectStore.fetchProjects(), siteStore.fetchAll()]);
  for (const p of projects.value) {
    if (!(p.id in drafts)) {
      drafts[p.id] = siteByProject.value[p.id]?.domains.join(", ") ?? "";
    }
  }
});

function onDraft(projectId: string, event: Event) {
  drafts[projectId] = (event.target as HTMLInputElement).value;
}

function onToggleSsl(projectId: string, event: Event) {
  const enabled = (event.target as HTMLInputElement).checked;
  void siteStore.toggleSsl(projectId, enabled);
}

function onApplyDomains(projectId: string) {
  const raw = drafts[projectId] ?? "";
  const domains = raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  void siteStore.setDomains(projectId, domains);
}
</script>
