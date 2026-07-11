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

      <Card class="h-full">
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center gap-2 text-base">
            <Circle class="size-2.5 text-muted-foreground" />
            Databases
          </CardTitle>
          <CardDescription>
            MySQL — Coming in Phase 1
          </CardDescription>
        </CardHeader>
        <CardContent class="pb-2">
          <p class="text-sm text-muted-foreground">
            Download and manage portable MySQL servers. PostgreSQL and MariaDB
            support planned for Phase 3.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            class="w-full"
            disabled
          >
            Coming Soon
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Circle } from '@lucide/vue';
import PhpStatusWidget from '@/widgets/PhpStatusWidget.vue';
</script>
