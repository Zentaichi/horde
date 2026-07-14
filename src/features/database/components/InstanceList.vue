<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-xl font-semibold">Instances</h2>
      <Button variant="outline" size="sm" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? 'Cancel' : 'New Instance' }}
      </Button>
    </div>

    <Card v-if="showCreateForm" class="mb-4">
      <CardContent class="p-4 space-y-3">
        <h3 class="font-medium text-sm">Create MySQL Instance</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-muted-foreground block mb-1">Version</label>
            <select
              v-model="createVersion"
              class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
            >
              <option value="" disabled>Select version...</option>
              <option v-for="v in installedVersions[engine] || []" :key="v" :value="v">
                {{ v }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-xs text-muted-foreground block mb-1">Port</label>
            <input
              v-model.number="createPort"
              type="number"
              class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              placeholder="3306"
            />
          </div>
        </div>
        <Button
          size="sm"
          :disabled="!createVersion || !createPort || loading"
          @click="onCreate"
        >
          {{ loading ? 'Initializing...' : 'Create Instance' }}
        </Button>
      </CardContent>
    </Card>

    <div v-if="instances.length > 0" class="space-y-3">
      <Card v-for="instance in instances" :key="instance.instanceId">
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <Circle
                :class="instance.running ? 'text-green-500 fill-green-500' : 'text-muted-foreground'"
                class="size-2.5 shrink-0"
              />
              <div class="min-w-0">
                <div class="font-semibold text-sm truncate">
                  {{ instance.engine || 'MySQL' }} {{ instance.version }}
                </div>
                <div class="text-xs text-muted-foreground">
                  Port {{ instance.port }}
                  <span v-if="instance.label">— {{ instance.label }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 ml-4">
              <template v-if="confirmingDelete === instance.instanceId">
                <span class="text-xs text-destructive font-medium">Delete?</span>
                <Button variant="destructive" size="sm" @click="onDelete(instance.instanceId)">
                  Yes
                </Button>
                <Button variant="outline" size="sm" @click="confirmingDelete = null">
                  No
                </Button>
              </template>
              <template v-else>
                <Button
                  v-if="instance.running"
                  variant="outline"
                  size="sm"
                  @click="store.stopInstance(instance.instanceId)"
                >
                  Stop
                </Button>
                <Button
                  v-else
                  variant="default"
                  size="sm"
                  @click="store.startInstance(instance.instanceId)"
                >
                  Start
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-muted-foreground hover:text-destructive"
                  :disabled="instance.running"
                  @click="confirmingDelete = instance.instanceId"
                >
                  Delete
                </Button>
              </template>
            </div>
          </div>

          <div v-if="instance.running" class="mt-3 pt-3 border-t border-border">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Databases</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-7 text-xs"
                @click="toggleDbPanel(instance.instanceId)"
              >
                <Database :class="expandedDb === instance.instanceId ? 'size-3.5 mr-1' : 'size-3.5 mr-1 rotate-0'" class="size-3.5 mr-1" />
                {{ expandedDb === instance.instanceId ? 'Hide' : 'Manage' }}
              </Button>
            </div>

            <template v-if="expandedDb === instance.instanceId">
              <!-- Database List -->
              <div v-if="databases[instance.instanceId]?.length" class="space-y-1 mb-3">
                <div
                  v-for="db in databases[instance.instanceId]"
                  :key="db"
                  class="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 text-sm"
                >
                  <span class="truncate">{{ db }}</span>
                  <button
                    class="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                    :disabled="droppingDb === db"
                    @click="onDropDatabase(instance.instanceId, db)"
                  >
                    <Trash2 v-if="droppingDb !== db" class="size-3.5" />
                    <Loader v-else class="size-3.5 animate-spin" />
                  </button>
                </div>
              </div>
              <p v-if="dbLoading[instance.instanceId]" class="text-xs text-muted-foreground py-2">Loading...</p>
              <p v-else-if="!databases[instance.instanceId]?.length" class="text-xs text-muted-foreground py-2">No user databases.</p>

              <div class="flex items-center gap-2">
                <input
                  v-model="newDbName"
                  type="text"
                  placeholder="Database name..."
                  class="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs"
                  @keyup.enter="onCreateDatabase(instance.instanceId)"
                />
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7 text-xs shrink-0"
                  :disabled="!newDbName.trim() || creatingDb === instance.instanceId"
                  @click="onCreateDatabase(instance.instanceId)"
                >
                  <Plus v-if="creatingDb !== instance.instanceId" class="size-3 mr-1" />
                  <Loader v-else class="size-3 mr-1 animate-spin" />
                  Create
                </Button>
              </div>
            </template>
          </div>
        </CardContent>
      </Card>
    </div>

    <p v-else-if="!showCreateForm" class="text-sm text-muted-foreground">
      No instances. Download a MySQL version and create your first instance.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useDatabaseStore } from '../stores/databaseStore';
import { storeToRefs } from 'pinia';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Circle, Database, Loader, Plus, Trash2 } from '@lucide/vue';

defineProps<{
  engine: string;
}>();

const store = useDatabaseStore();
const { instances, installedVersions, loading } = storeToRefs(store);

const showCreateForm = ref(false);
const createVersion = ref('');
const createPort = ref(3306);
const confirmingDelete = ref<string | null>(null);

const expandedDb = ref<string | null>(null);
const databases = reactive<Record<string, string[]>>({});
const dbLoading = reactive<Record<string, boolean>>({});
const newDbName = ref('');
const creatingDb = ref<string | null>(null);
const droppingDb = ref<string | null>(null);

watch(instances, () => {
  databases;
}, { deep: true });

async function loadDatabases(instanceId: string) {
  dbLoading[instanceId] = true;
  databases[instanceId] = await store.fetchDatabases(instanceId);
  dbLoading[instanceId] = false;
}

function toggleDbPanel(instanceId: string) {
  if (expandedDb.value === instanceId) {
    expandedDb.value = null;
  } else {
    expandedDb.value = instanceId;
    if (!databases[instanceId]) {
      loadDatabases(instanceId);
    }
  }
}

async function onCreateDatabase(instanceId: string) {
  const name = newDbName.value.trim();
  if (!name) return;
  creatingDb.value = instanceId;
  try {
    await store.createDatabase(instanceId, name);
    newDbName.value = '';
    await loadDatabases(instanceId);
  } catch {
    // Error handled by store
  } finally {
    creatingDb.value = null;
  }
}

async function onDropDatabase(instanceId: string, db: string) {
  droppingDb.value = db;
  try {
    await store.dropDatabase(instanceId, db);
    await loadDatabases(instanceId);
  } catch {
    // Error handled by store
  } finally {
    droppingDb.value = null;
  }
}

const nextPort = computed(() => {
  const usedPorts = new Set(instances.value.map((i) => i.port));
  let port = 3306;
  while (usedPorts.has(port)) port++;
  return port;
});

async function onCreate() {
  if (!createVersion.value || !createPort.value) return;
  await store.initializeInstance({
    engine: 'mysql',
    version: createVersion.value,
    port: createPort.value,
  });
  showCreateForm.value = false;
  createVersion.value = '';
  createPort.value = nextPort.value;
}

async function onDelete(instanceId: string) {
  await store.removeInstance(instanceId);
  confirmingDelete.value = null;
}
</script>