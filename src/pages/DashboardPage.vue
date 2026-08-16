<template>
  <PageContainer class="flex flex-col">
    <div class="shrink-0">
      <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-sm text-muted-foreground">
        Resurrect and animate your dev services
      </p>
    </div>

    <div
      class="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain grid grid-cols-1 md:grid-cols-2 gap-4 content-start"
    >
      <PhpStatusWidget />
      <DatabaseStatusWidget />
      <ProjectStatusWidget />
      <DevServerStatusWidget />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import PageContainer from "@/shared/ui/PageContainer.vue";
import PhpStatusWidget from "@/widgets/PhpStatusWidget.vue";
import DatabaseStatusWidget from "@/widgets/DatabaseStatusWidget.vue";
import ProjectStatusWidget from "@/widgets/ProjectStatusWidget.vue";
import DevServerStatusWidget from "@/widgets/DevServerStatusWidget.vue";
</script>
