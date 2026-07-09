<template>
  <div class="mt-6">
    <h2 class="text-xl font-semibold mb-3">Installed PHP Versions</h2>

    <div v-if="versions.length > 0" class="space-y-3">
      <Card v-for="version in versions" :key="version.version">
        <CardContent class="flex items-center justify-between p-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-base">PHP {{ version.version }}</span>
            </div>
            <code class="text-xs text-muted-foreground block truncate" :title="version.path">
              {{ version.path }}
            </code>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled
            class="shrink-0 ml-4"
            title="Coming in Phase 1"
          >
            Set as Global
          </Button>
        </CardContent>
      </Card>
    </div>

    <p v-else class="text-sm text-muted-foreground">
      No versions installed yet. Download one above to get started.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { PhpVersion } from '@/shared/types/php';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

defineProps<{
  versions: PhpVersion[];
}>();
</script>
