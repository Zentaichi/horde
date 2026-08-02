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
      <div class="flex items-start justify-between">
        <div>
          <h3 class="font-medium text-sm">{{ project.name }}</h3>
          <p class="text-xs text-muted-foreground truncate max-w-md">
            {{ project.path }}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <Badge v-if="project.phpVersion" variant="secondary" class="text-xs">
            PHP {{ project.phpVersion }}
          </Badge>
          <Badge
            v-if="project.phpVersion && project.isPhpVersionInstalled === false"
            variant="destructive"
            class="text-xs"
          >
            Not installed
          </Badge>
          <Badge
            v-if="serverMap[project.id] !== undefined"
            variant="outline"
            class="text-xs text-green-600 dark:text-green-400 border-green-500/30"
          >
            <Circle class="size-1.5 fill-current inline-block mr-1" />
            localhost:{{ serverMap[project.id] }}
          </Badge>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            @click="$emit('scan', project.id)"
          >
            <RefreshCw class="size-3 mr-1" />
            Rescan
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
          variant="outline"
          size="xs"
          @click="$emit('openDir', project.id)"
        >
          <FolderOpen class="size-3 mr-1" />
          Open
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
import { RefreshCw, FolderOpen, Trash2, Circle } from "@lucide/vue";
import DevServerPanel from "@/features/devserver/components/DevServerPanel.vue";

defineProps<{
  projects: Project[];
  serverMap: Record<string, number>;
}>();

defineEmits<{
  scan: [projectId: string];
  openDir: [projectId: string];
  remove: [projectId: string];
}>();

const store = useProjectStore();

function recentScanResult(projectId: string) {
  const result = store.getScanResult(projectId);
  if (!result) return null;
  if (Date.now() - result.timestamp > 4000) return null;
  return result;
}
</script>
