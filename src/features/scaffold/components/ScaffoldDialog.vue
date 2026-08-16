<template>
  <div>
    <Button variant="outline" size="sm" @click="open = !open">
      <Sparkles class="size-4 mr-1.5" />
      Quick Create
    </Button>

    <div v-if="open" class="mt-3 rounded-md border border-border p-4 space-y-3">
      <div class="text-sm font-medium">Create project from template</div>

      <select
        v-model="template"
        class="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
      >
        <option v-for="t in templates" :key="t.id" :value="t.id">
          {{ t.displayName }}
        </option>
      </select>

      <input
        v-model="name"
        placeholder="Project name (e.g. my-app)"
        class="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
      />

      <div class="flex items-center gap-2">
        <input
          v-model="parentDir"
          placeholder="Parent directory"
          class="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
        <Button variant="outline" size="sm" @click="browse">Browse</Button>
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div
        v-if="logs.length"
        class="h-40 overflow-auto rounded-md bg-muted p-2 text-xs font-mono"
      >
        <div v-for="(line, i) in logs" :key="i">{{ line }}</div>
      </div>

      <Button
        size="sm"
        :disabled="running || !name || !parentDir"
        @click="create"
      >
        {{ running ? "Creating..." : "Create" }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useScaffoldStore } from "../stores/scaffoldStore";
import { Button } from "@/shared/ui/button";
import { Sparkles } from "@lucide/vue";

const emit = defineEmits<{
  created: [];
}>();

const store = useScaffoldStore();
const { templates, running, logs, error } = storeToRefs(store);

const open = ref(false);
const template = ref("");
const name = ref("");
const parentDir = ref("");

onMounted(async () => {
  await store.fetchTemplates();
  if (templates.value.length) template.value = templates.value[0].id;
});

async function browse() {
  const dir = await window.electronAPI.showOpenDialog({});
  if (dir) parentDir.value = dir;
}

async function create() {
  await store.create({
    template: template.value,
    name: name.value,
    parentDir: parentDir.value,
  });
  if (!store.error) {
    name.value = "";
    emit("created");
  }
}
</script>
