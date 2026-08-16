<template>
  <div class="h-screen flex flex-col bg-background overflow-hidden">
    <nav class="shrink-0 border-b border-border bg-card">
      <div class="mx-auto w-full max-w-6xl px-8 flex items-center gap-1 py-2">
        <router-link
          to="/dashboard"
          class="flex items-center gap-2 font-semibold text-sm tracking-tight px-2 hover:text-foreground transition-colors"
        >
          <HordeLogo :size="30" />
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
          <router-link
            to="/projects"
            class="text-sm px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            active-class="!text-foreground bg-accent"
          >
            Projects
          </router-link>
          <router-link
            to="/sites"
            class="text-sm px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            active-class="!text-foreground bg-accent"
          >
            Sites
          </router-link>
        </div>

        <div class="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </nav>
    <div class="flex-1 min-h-0 overflow-hidden">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import ThemeToggle from "@/shared/ui/ThemeToggle.vue";
import HordeLogo from "@/shared/ui/HordeLogo.vue";
</script>
