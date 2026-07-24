<template>
  <div>
    <Button variant="outline" size="sm" @click="$emit('add')" :disabled="loading">
      <Plus class="size-4 mr-1.5" />
      Add Project
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/shared/ui/button';
import { Plus } from '@lucide/vue';

defineProps<{
  loading: boolean;
}>();

defineEmits<{
  add: [];
}>();
</script>
