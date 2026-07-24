<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-sm text-muted-foreground">
        Overview of your local development environment
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PhpStatusWidget />
      <DatabaseStatusWidget />
      <ProjectStatusWidget />
      <DevServerStatusWidget />
    </div>
  </div>
</template>

<script setup lang="ts">
import PhpStatusWidget from '@/widgets/PhpStatusWidget.vue';
import DatabaseStatusWidget from '@/widgets/DatabaseStatusWidget.vue';
import ProjectStatusWidget from '@/widgets/ProjectStatusWidget.vue';
import DevServerStatusWidget from '@/widgets/DevServerStatusWidget.vue';
</script>
