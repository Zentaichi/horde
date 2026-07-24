<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useProjectStore } from '@/features/projects/stores/projectStore';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ArrowRight, Circle, FolderGit2 } from '@lucide/vue';

const store = useProjectStore();
const { projects } = storeToRefs(store);
const router = useRouter();

onMounted(async () => {
  await store.fetchProjects();
});

const count = computed(() => projects.value.length);

const phpVersionProjects = computed(() =>
  projects.value.filter((p) => p.phpVersion),
);
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <FolderGit2 class="size-4 text-muted-foreground" />
        Projects
      </CardTitle>
      <CardDescription>
        <template v-if="count > 0">
          <span class="font-medium text-foreground">{{ count }}</span>
          {{ count === 1 ? 'project' : 'projects' }} tracked
        </template>
        <template v-else>
          No projects added
        </template>
      </CardDescription>
    </CardHeader>

    <CardContent class="pb-2">
      <div v-if="phpVersionProjects.length > 0" class="space-y-1">
        <p class="text-xs text-muted-foreground mb-1">PHP version pins:</p>
        <div
          v-for="p in phpVersionProjects"
          :key="p.id"
          class="flex items-center gap-1.5 text-sm"
        >
          <Circle class="size-1.5 text-primary fill-primary" />
          <span class="truncate">{{ p.name }}</span>
          <Badge variant="secondary" class="text-xs ml-auto">
            {{ p.phpVersion }}
          </Badge>
        </div>
      </div>
      <p v-else-if="count > 0" class="text-sm text-muted-foreground">
        No .php-version files detected.
      </p>
    </CardContent>

    <CardFooter class="mt-auto">
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        @click="router.push('/projects')"
      >
        Manage Projects
        <ArrowRight class="size-3.5 ml-1.5" />
      </Button>
    </CardFooter>
  </Card>
</template>
