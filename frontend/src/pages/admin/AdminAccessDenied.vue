<template>
  <div class="mx-auto max-w-3xl">
    <BaseCard>
      <div class="space-y-4 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-300">
          <ShieldExclamationIcon class="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 class="text-2xl font-semibold text-neutral-900 dark:text-white">Acesso negado</h1>
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Você não possui permissão para acessar este módulo ou ação. Entre em contato com o Administrador Geral para
          solicitar acesso.
        </p>
        <div v-if="moduleLabel" class="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
          Módulo solicitado: <span class="font-semibold text-neutral-600 dark:text-neutral-200">{{ moduleLabel }}</span>
        </div>
        <div class="flex flex-wrap justify-center gap-3 pt-2">
          <RouterLink
            v-if="auth.hasPermission('dashboard', 'view')"
            class="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-200"
            :to="{ name: 'admin-dashboard' }"
          >
            Voltar ao painel
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
            :to="fallbackRoute"
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
import { RouterLink, useRoute } from "vue-router";
import { ShieldExclamationIcon } from "@heroicons/vue/24/outline";

import BaseCard from "../../components/ui/BaseCard.vue";
import { permissionModules } from "../../config/permission-schema";
import { useAuthStore } from "../../stores/auth";

const route = useRoute();
const auth = useAuthStore();

const moduleLabel = computed(() => {
  const moduleKey = route.query.module as string | undefined;
  if (!moduleKey) return null;
  return permissionModules.find((module) => module.key === moduleKey)?.label ?? moduleKey;
});

const fallbackRoute = computed(() =>
  auth.isAuthenticated ? { name: "admin-login" } : { name: "admin-login" }
);
</script>
