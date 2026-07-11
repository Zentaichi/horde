<script setup lang="ts">
import { Sun, Moon } from '@lucide/vue';
import { useTheme } from '@/shared/composables/useTheme';
import { Button } from '@/shared/ui/button';

const { isDark, toggle } = useTheme();
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="size-8"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggle"
  >
    <Sun v-if="isDark" class="size-4" />
    <Moon v-else class="size-4" />
  </Button>
</template>
