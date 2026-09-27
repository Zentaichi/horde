<template>
  <div class="space-y-3">
    <div
      v-if="projects.length === 0"
      class="text-sm text-muted-foreground py-8 text-center"
    >
      No projects added yet. Click "Add Project" to get started.
    </div>

    <div
      v-for="project in projects"
      :key="project.id"
      class="border border-border rounded-lg p-4 space-y-2"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <ServiceSigil
              :risen="isServed(project.id)"
              size="sm"
              class="shrink-0"
            />
            <h3 class="font-medium text-sm truncate">{{ project.name }}</h3>
          </div>
          <p class="text-xs text-muted-foreground font-mono truncate max-w-md">
            {{ project.path }}
          </p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <Badge v-if="project.phpVersion" variant="secondary" class="text-xs">
            PHP <span class="font-mono">{{ project.phpVersion }}</span>
          </Badge>
          <Badge
            v-if="project.phpVersion && project.isPhpVersionInstalled === false"
            variant="destructive"
            class="text-xs"
          >
            Not installed
          </Badge>
          <ServiceStatus
            v-if="isServed(project.id)"
            state="risen"
            size="sm"
            :context="`:${serverMap[project.id]}`"
          />
          <Badge
            v-if="firstDomain(project)"
            variant="outline"
            class="text-xs font-mono"
          >
            {{ firstDomain(project) }}
          </Badge>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            class="text-muted-foreground"
            title="Rescan for .php-version"
            @click="$emit('scan', project.id)"
          >
            <RefreshCw class="size-3.5" />
          </Button>
          <span
            v-if="recentScanResult(project.id)"
            class="text-xs italic"
            :class="
              recentScanResult(project.id)?.version
                ? 'text-green-500'
                : 'text-muted-foreground'
            "
          >
            {{
              recentScanResult(project.id)?.version
                ? "Found PHP " + recentScanResult(project.id)?.version
                : "No .php-version file"
            }}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          class="text-muted-foreground"
          title="Open project folder"
          @click="$emit('openDir', project.id)"
        >
          <FolderOpen class="size-3.5" />
        </Button>
        <DevServerPanel :project-id="project.id" />
        <div class="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          class="text-muted-foreground hover:text-destructive"
          title="Remove project"
          @click="$emit('remove', project.id)"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Project } from "@/shared/types/project";
import { useProjectStore } from "@/features/projects/stores/projectStore";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import ServiceStatus from "@/shared/ui/ServiceStatus.vue";
import { RefreshCw, FolderOpen, Trash2 } from "@lucide/vue";
import DevServerPanel from "@/features/devserver/components/DevServerPanel.vue";

const props = defineProps<{
  projects: Project[];
  serverMap: Record<string, number>;
}>();

defineEmits<{
  scan: [projectId: string];
  openDir: [projectId: string];
  remove: [projectId: string];
}>();

const store = useProjectStore();

/**
 * A dev server is either serving or absent -- `DevServerManager` deletes the
 * entry on stop, so `serverMap` carrying a port is exactly the risen condition.
 * See `devServerState` for why there is no dormant tier here.
 */
function isServed(projectId: string) {
  return props.serverMap[projectId] !== undefined;
}

function firstDomain(project: Project) {
  return project.domains?.[0];
}

function recentScanResult(projectId: string) {
  const result = store.getScanResult(projectId);
  if (!result) return null;
  if (Date.now() - result.timestamp > 4000) return null;
  return result;
}
</script>
