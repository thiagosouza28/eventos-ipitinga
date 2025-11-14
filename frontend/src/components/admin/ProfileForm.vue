<template>
  <div class="space-y-4">
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Nome do perfil</label>
        <input
          class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          :value="name"
          type="text"
          required
          @input="emit('update:name', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Descrição</label>
        <input
          class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          :value="description ?? ''"
          type="text"
          placeholder="Opcional"
          @input="emit('update:description', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="space-y-3">
      <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Permissões por módulo</p>
      <div
        v-for="module in modules"
        :key="module.key"
        class="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
      >
        <p class="text-sm font-semibold capitalize text-neutral-800 dark:text-neutral-100">
          {{ module.label }}
        </p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label
            v-for="action in actions"
            :key="action.key"
            class="inline-flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"
          >
            <input
              class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              type="checkbox"
              :checked="isActionEnabled(module.key, action.key)"
              @change="togglePermission(module.key, action.key, ($event.target as HTMLInputElement).checked)"
            />
            {{ action.label }}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRaw } from "vue";
import type { PermissionAction, PermissionState } from "../../types/api";

type PermissionEntry = {
  module: string;
  actions: PermissionState;
};

import { permissionModules, permissionActions } from "../../config/permission-schema";

const props = defineProps<{
  name: string;
  description?: string | null;
  permissions: PermissionEntry[];
  modules?: Array<{ key: string; label: string }>;
  actions?: Array<{ key: PermissionAction; label: string }>;
}>();

const emit = defineEmits<{
  (event: "update:name", value: string): void;
  (event: "update:description", value: string): void;
  (event: "update:permissions", value: PermissionEntry[]): void;
}>();

const modules = computed(() => props.modules ?? permissionModules);
const actions = computed(() => props.actions ?? permissionActions);

const findEntry = (moduleKey: string) => props.permissions.find((entry) => entry.module === moduleKey);

const isActionEnabled = (moduleKey: string, action: PermissionAction) => {
  const entry = findEntry(moduleKey);
  return entry ? entry.actions[action] : false;
};

const togglePermission = (moduleKey: string, action: PermissionAction, enabled: boolean) => {
  const next = props.permissions.map((entry) =>
    entry.module === moduleKey
      ? {
          module: entry.module,
          actions: { ...toRaw(entry.actions), [action]: enabled }
        }
      : entry
  );
  emit("update:permissions", next);
};
</script>
