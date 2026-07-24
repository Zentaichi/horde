<template>
  <div class="space-y-3">
    <div v-if="projects.length === 0" class="text-sm text-muted-foreground py-8 text-center">
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
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" size="xs" @click="$emit('scan', project.id)">
          <RefreshCw class="size-3 mr-1" />
          Rescan
        </Button>
        <Button variant="outline" size="xs" @click="$emit('openDir', project.id)">
          <FolderOpen class="size-3 mr-1" />
          Open
        </Button>
        <DevServerPanel :project-id="project.id" :project-name="project.name" />
        <div class="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          class="text-muted-foreground hover:text-destructive"
          @click="$emit('remove', project.id)"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '@/shared/types/project';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { RefreshCw, FolderOpen, Trash2 } from '@lucide/vue';
import DevServerPanel from '@/features/devserver/components/DevServerPanel.vue';

defineProps<{
  projects: Project[];
}>();

defineEmits<{
  scan: [projectId: string];
  openDir: [projectId: string];
  remove: [projectId: string];
}>();
</script>
