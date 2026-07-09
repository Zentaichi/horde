<template>
  <div class="min-h-screen bg-background">
    <nav class="border-b border-border bg-card px-4 py-3 flex items-center gap-4">
      <span class="font-semibold text-sm tracking-tight">Horde</span>
      <router-link
        to="/php"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
        active-class="!text-foreground font-medium"
      >
        PHP
      </router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>
