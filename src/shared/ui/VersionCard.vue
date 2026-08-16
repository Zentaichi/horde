<script setup lang="ts">
import { ref } from "vue";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import ProgressBar from "@/shared/ui/ProgressBar.vue";
import { FolderOpen } from "@lucide/vue";
import type { DownloadProgress } from "@/shared/types/php";

withDefaults(
  defineProps<{
    name: string;
    installed: boolean;
    downloading: boolean;
    progress?: DownloadProgress;
    startedAt?: number;
  }>(),
  {
    progress: undefined,
    startedAt: undefined,
  }
);

const emit = defineEmits<{
  download: [];
  uninstall: [];
  openDir: [];
}>();

const confirmingUninstall = ref(false);
</script>

<template>
  <Card>
    <CardContent class="p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-semibold truncate">{{ name }}</span>
          <Badge v-if="installed" variant="secondary" class="shrink-0">
            Installed
          </Badge>
        </div>

        <div class="flex items-center gap-2 shrink-0 ml-4">
          <template v-if="installed">
            <template v-if="confirmingUninstall">
              <span class="text-xs text-destructive font-medium"
                >Are you sure?</span
              >
              <Button
                variant="destructive"
                size="sm"
                @click="
                  emit('uninstall');
                  confirmingUninstall = false;
                "
              >
                Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="confirmingUninstall = false"
              >
                No
              </Button>
            </template>
            <template v-else>
              <Button
                variant="ghost"
                size="sm"
                class="text-muted-foreground hover:text-destructive"
                @click="confirmingUninstall = true"
              >
                Uninstall
              </Button>
            </template>
            <Button
              variant="ghost"
              size="icon"
              class="size-7 shrink-0"
              title="Open in Explorer"
              @click="emit('openDir')"
            >
              <FolderOpen class="size-3.5" />
            </Button>
          </template>
          <template v-else>
            <Button
              v-if="!downloading"
              variant="default"
              size="sm"
              @click="emit('download')"
            >
              Download
            </Button>
            <Button v-else variant="outline" size="sm" disabled>
              Downloading...
            </Button>
          </template>
        </div>
      </div>

      <ProgressBar
        v-if="downloading && progress"
        :progress="progress"
        :started-at="startedAt"
      />
    </CardContent>
  </Card>
</template>
