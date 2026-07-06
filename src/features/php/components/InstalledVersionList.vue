<template>
  <div class="mt-6">
    <h2 class="text-xl font-semibold mb-2">Installed PHP Versions</h2>
    <ul v-if="versions.length > 0" class="space-y-2">
      <li v-for="version in versions" :key="version.version" class="p-2 bg-gray-100 rounded">
        {{ version.version }}
      </li>
    </ul>
    <p v-else class="text-gray-500">No versions installed yet.</p>
  </div>
</template>

<script setup lang="ts">
import type { PhpVersion } from '../stores/phpStore';

defineProps<{
  versions: PhpVersion[];
}>();
</script>