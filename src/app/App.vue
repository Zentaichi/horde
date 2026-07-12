<template>
  <div class="min-h-screen bg-background">
    <nav class="border-b border-border bg-card px-4 py-3 flex items-center gap-1">
      <router-link
        to="/dashboard"
        class="font-semibold text-sm tracking-tight px-2 hover:text-foreground transition-colors"
      >
        Horde
      </router-link>

      <div class="flex items-center gap-1 ml-2">
        <router-link
          to="/dashboard"
          class="text-sm px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          active-class="!text-foreground bg-accent"
        >
          Dashboard
        </router-link>
        <router-link
          to="/php"
          class="text-sm px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          active-class="!text-foreground bg-accent"
        >
          PHP
        </router-link>
        <router-link
          to="/databases"
          class="text-sm px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          active-class="!text-foreground bg-accent"
        >
          Databases
        </router-link>
      </div>

      <div class="ml-auto">
        <ThemeToggle />
      </div>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import ThemeToggle from '@/shared/ui/ThemeToggle.vue';
</script>
