<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Dashboard administrativo
          </h1>
          <p class="text-sm text-neutral-500">
            Painel geral de eventos, pedidos e inscricoes.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <RouterLink
            to="/admin/events"
            class="inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
          >
            Gerenciar eventos
          </RouterLink>
          <RouterLink
            to="/admin/districts"
            class="inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
          >
            Distritos
          </RouterLink>
          <RouterLink
            to="/admin/churches"
            class="inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
          >
            Igrejas
          </RouterLink>
          <RouterLink
            v-if="auth.isAdminGeral"
            to="/admin/ministries"
            class="inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
          >
            Ministerios
          </RouterLink>
          <RouterLink
            v-if="auth.isAdminGeral"
            :to="{ name: 'admin-users' }"
            class="inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
          >
            Cadastrar usuarios
          </RouterLink>
          <RouterLink
            to="/admin/registrations"
            class="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 sm:w-auto"
          >
            Ver inscricoes
          </RouterLink>
          <RouterLink
            to="/admin/financial"
            class="inline-flex w-full items-center justify-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 sm:w-auto"
          >
            Dashboard Financeiro
          </RouterLink>
          <RouterLink
            v-if="checkinTarget"
            :to="`/admin/checkin/${checkinTarget}`"
            class="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 sm:w-auto"
          >
            Abrir check-in
          </RouterLink>
          <span
            v-else
            class="block w-full rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-center text-sm text-neutral-400 sm:w-auto"
          >
            Cadastre um evento para liberar o check-in
          </span>
        </div>
      </div>
    </BaseCard>

    <div class="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
      <BaseCard class="space-y-2">
        <p class="text-sm text-neutral-500">Eventos ativos</p>
        <p class="text-3xl font-semibold text-neutral-800 dark:text-neutral-50">
          {{ activeEvents }}
        </p>
      </BaseCard>
      <BaseCard class="space-y-2">
        <p class="text-sm text-neutral-500">Pedidos carregados</p>
        <p class="text-3xl font-semibold text-neutral-800 dark:text-neutral-50">
          {{ admin.orders.length }}
        </p>
      </BaseCard>
      <BaseCard class="space-y-2">
        <p class="text-sm text-neutral-500">Inscricoes carregadas</p>
        <p class="text-3xl font-semibold text-neutral-800 dark:text-neutral-50">
          {{ admin.registrations.length }}
        </p>
      </BaseCard>
    </div>

    <BaseCard>
      <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
        Eventos cadastrados
      </h2>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th class="pb-2">Evento</th>
              <th class="pb-2">Periodo</th>
              <th class="pb-2">Status</th>
              <th class="pb-2 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr v-for="event in admin.events" :key="event.id">
              <td class="py-3">
                <div class="font-medium text-neutral-800 dark:text-neutral-100">
                  {{ event.title }}
                </div>
                <div class="text-xs text-neutral-500">Slug: {{ event.slug }}</div>
              </td>
              <td class="py-3 text-sm">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </td>
              <td class="py-3">
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                    event.isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-200 text-neutral-600'
                  ]"
                >
                  {{ event.isActive ? "Ativo" : "Inativo" }}
                </span>
              </td>
              <td class="py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <RouterLink
                    :to="`/evento/${event.slug}`"
                    target="_blank"
                    class="text-sm text-primary-600 hover:text-primary-500"
                  >
                    Ver público
                  </RouterLink>
                  <RouterLink :to="`/admin/checkin/${event.id}`" class="text-sm text-primary-600 hover:text-primary-500">
                    Check-in
                  </RouterLink>
                </div>
              </td>
            </tr>
            <tr v-if="!admin.events.length">
              <td class="py-3 text-sm text-neutral-500" colspan="4">
                Nenhum evento cadastrado ate o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
import { formatDate } from "../../utils/format";
import { useAuthStore } from "../../stores/auth";

const admin = useAdminStore();
const auth = useAuthStore();

onMounted(async () => {
  await admin.loadEvents();
  await admin.loadOrders({});
  await admin.loadRegistrations({});
});

const activeEvents = computed(() => admin.events.filter((event) => event.isActive).length);
const checkinTarget = computed(() => {
  const preferred = admin.events.find((event) => event.isActive);
  return preferred?.id ?? admin.events[0]?.id ?? null;
});
</script>
