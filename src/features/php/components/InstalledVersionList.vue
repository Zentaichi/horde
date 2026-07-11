<template>
  <div class="mt-6">
    <h2 class="text-xl font-semibold mb-3">Installed PHP Versions</h2>

    <div v-if="versions.length > 0" class="space-y-3">
      <Card v-for="version in versions" :key="version.version">
        <CardContent class="p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-semibold text-base truncate">PHP {{ version.version }}</span>
              <Badge v-if="version.version === activeVersion" variant="default" class="text-xs shrink-0">
                Active
              </Badge>
            </div>

            <div class="flex items-center gap-2 shrink-0 ml-4">
              <template v-if="confirmingUninstall === version.version">
                <span class="text-xs text-destructive font-medium">Are you sure?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  :disabled="uninstalling"
                  @click="onConfirmUninstall(version.version)"
                >
                  {{ uninstalling ? 'Removing...' : 'Yes' }}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="uninstalling"
                  @click="confirmingUninstall = null"
                >
                  No
                </Button>
              </template>
              <template v-else>
                <Button
                  v-if="version.version !== activeVersion"
                  variant="outline"
                  size="sm"
                  :disabled="switching"
                  @click="onSwitch(version.version)"
                >
                  {{ switching ? 'Setting...' : 'Set as Global' }}
                </Button>
                <Badge
                  v-else
                  variant="secondary"
                >
                  In Use
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-muted-foreground hover:text-destructive"
                  @click="confirmingUninstall = version.version"
                >
                  Uninstall
                </Button>
              </template>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <code
              class="text-xs text-muted-foreground truncate flex-1"
              :title="version.path"
            >
              {{ version.path }}
            </code>
            <Button
              variant="ghost"
              size="icon"
              class="size-7 shrink-0"
              title="Open in Explorer"
              @click="store.openVersionDir(version.path)"
            >
              <FolderOpen class="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <p v-else class="text-sm text-muted-foreground">
      No versions installed yet. Download one above to get started.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PhpVersion } from '@/shared/types/php';
import { storeToRefs } from 'pinia';
import { usePhpStore } from '../stores/phpStore';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { FolderOpen } from '@lucide/vue';

const store = usePhpStore();
const { activeVersion, switching, uninstalling } = storeToRefs(store);

const confirmingUninstall = ref<string | null>(null);

defineProps<{
  versions: PhpVersion[];
}>();

function onSwitch(version: string) {
  store.switchGlobalVersion(version);
}

async function onConfirmUninstall(version: string) {
  await store.uninstallVersion(version);
  confirmingUninstall.value = null;
}
</script>
