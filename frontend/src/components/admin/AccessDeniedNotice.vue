<template>
  <div class="mx-auto max-w-3xl">
    <BaseCard>
      <div class="space-y-4 text-center px-6 py-8">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-300">
          <ShieldExclamationIcon class="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 class="text-2xl font-semibold text-neutral-900 dark:text-white">Acesso negado</h1>
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Você não possui permissão para acessar este módulo ou ação. Entre em contato com o Administrador Geral para solicitar acesso.
        </p>
        <div v-if="moduleLabel" class="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
          Módulo solicitado:
          <span class="font-semibold text-neutral-600 dark:text-neutral-200">{{ moduleLabel }}</span>
        </div>
        <div v-if="actionLabel" class="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
          Ação: <span class="font-semibold text-neutral-600 dark:text-neutral-200">{{ actionLabel }}</span>
        </div>
        <div class="flex flex-wrap justify-center gap-3 pt-2">
          <RouterLink
            v-if="canReturnToDashboard"
            class="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-200"
            :to="{ name: 'admin-dashboard' }"
          >
            Voltar ao painel
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
            :to="{ name: 'admin-login' }"
          >
            Trocar usuário
          </RouterLink>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ShieldExclamationIcon } from "@heroicons/vue/24/outline";

import BaseCard from "../ui/BaseCard.vue";
import { permissionModules } from "../../config/permission-schema";
import type { PermissionAction } from "../../types/api";
import { useAuthStore } from "../../stores/auth";

const props = defineProps<{
  module?: string;
  action?: PermissionAction;
}>();

const auth = useAuthStore();

const moduleLabel = computed(() => {
  if (!props.module) return null;
  return permissionModules.find((entry) => entry.key === props.module)?.label ?? props.module;
});

const actionDictionary: Record<PermissionAction, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  approve: "Aprovar",
  deactivate: "Desativar",
  reports: "Relatórios",
  financial: "Financeiro"
};

const actionLabel = computed(() => (props.action ? actionDictionary[props.action] ?? props.action : ""));
const canReturnToDashboard = computed(() => auth.hasPermission("dashboard", "view"));
</script>
