<template>
  <div class="space-y-6">
    <TableSkeleton v-if="loadingDashboard" helperText="📡 Carregando painel administrativo..." />
    <template v-else>
    <BaseCard
      class="bg-gradient-to-r from-white via-[#f7f9ff] to-[#e7ecff] dark:from-[#131a2f] dark:via-[#0f162a] dark:to-[#0b1223]"
    >
      <div class="flex flex-col gap-6">
        <div class="max-w-4xl">
          <p class="text-xs uppercase tracking-[0.35em] text-[#6f7cff] dark:text-[#b7c8ff]">Visão geral</p>
          <h1 class="mt-1 text-3xl font-semibold text-[color:var(--text)]">Dashboard administrativo</h1>
          <p class="mt-2 text-sm text-[color:var(--text-muted)]">
            Gerencie eventos, pedidos, lotes e inscrições com atalhos rápidos.
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            class="flex flex-col gap-3 rounded-[26px] bg-gradient-to-br from-[#6f9bff] via-[#4d7dff] to-[#1f4fff] p-5 text-white shadow-[0_25px_80px_rgba(72,103,255,0.35)] dark:shadow-[0_25px_70px_rgba(16,25,56,0.55)]"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-[0.3em] text-white/70">Eventos ativos</span>
              <CalendarDaysIcon class="h-10 w-10 text-white/80" aria-hidden="true" />
            </div>
            <p class="text-4xl font-semibold">{{ activeEvents }}</p>
          </div>
          <div
            class="flex flex-col gap-3 rounded-[26px] bg-gradient-to-br from-white via-[#f5f7ff] to-[#eaf1ff] p-5 text-[#111827] shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:from-[#161d36] dark:via-[#111a2d] dark:to-[#0d1426] dark:text-[color:var(--text)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.55)] dark:border dark:border-[rgba(255,255,255,0.06)]"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]">Pedidos carregados</span>
              <ClipboardDocumentListIcon class="h-10 w-10 text-[#4b61ff] dark:text-[#9eb5ff]" aria-hidden="true" />
            </div>
            <p class="text-4xl font-semibold">{{ admin.orders.length }}</p>
          </div>
          <div
            class="flex flex-col gap-3 rounded-[26px] bg-gradient-to-br from-white via-[#f2f7ff] to-[#fef2ff] p-5 text-[#111827] shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:from-[#161c33] dark:via-[#121a2f] dark:to-[#0e1527] dark:text-[color:var(--text)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.55)] dark:border dark:border-[rgba(255,255,255,0.06)]"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]">Inscrições carregadas</span>
              <UsersIcon class="h-10 w-10 text-[#4b61ff] dark:text-[#b8a2ff]" aria-hidden="true" />
            </div>
            <p class="text-4xl font-semibold">{{ admin.registrations.length }}</p>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      class="bg-[color:var(--surface-card)]/95 border-[color:var(--border-card)] dark:bg-[color:var(--surface-card)]/92 dark:border-[rgba(255,255,255,0.12)]"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">Eventos cadastrados</p>
          <h2 class="text-xl font-semibold text-[color:var(--text)]">Resumo dos eventos</h2>
        </div>
      </div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            <tr>
              <th class="pb-4 font-semibold">Evento</th>
              <th class="pb-4 font-semibold">Período</th>
              <th class="pb-4 font-semibold">Status</th>
              <th class="pb-4 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eaecf5] dark:divide-[rgba(255,255,255,0.08)]">
            <tr v-for="event in admin.events" :key="event.id" class="text-[color:var(--text)]">
              <td class="py-4">
                <div class="font-semibold text-[color:var(--text)]">
                  {{ event.title }}
                </div>
                <div class="text-xs text-[color:var(--text-muted)]">Slug: {{ event.slug }}</div>
              </td>
              <td class="py-4 text-sm text-[color:var(--text-muted)]">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </td>
              <td class="py-4">
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    event.isActive
                      ? 'bg-[#e4ecff] text-[#1f4fff] dark:bg-[rgba(86,129,255,0.35)] dark:text-[#f6f8ff]'
                      : 'bg-neutral-200 text-neutral-600 dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--text-muted)]'
                  ]"
                >
                  {{ event.isActive ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="py-4 text-right">
                <div class="flex items-center justify-end gap-3 text-sm">
                  <RouterLink
                    :to="`/evento/${event.slug}`"
                    target="_blank"
                    class="text-[#1f4fff] hover:underline dark:text-[#a8c4ff]"
                  >
                    Ver público
                  </RouterLink>
                  <RouterLink :to="`/admin/checkin/${event.id}`" class="text-[#1f4fff] hover:underline dark:text-[#a8c4ff]">
                    Check-in
                  </RouterLink>
                </div>
              </td>
            </tr>
            <tr v-if="!admin.events.length">
              <td class="py-4 text-center text-sm text-[color:var(--text-muted)]" colspan="4">
                Nenhum evento cadastrado ate o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { CalendarDaysIcon, ClipboardDocumentListIcon, UsersIcon } from "@heroicons/vue/24/outline";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
import { formatDate } from "../../utils/format";
import { useAuthStore } from "../../stores/auth";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";

const admin = useAdminStore();
const auth = useAuthStore();
const loadingDashboard = ref(true);

const canViewEvents = computed(() => auth.hasPermission("events", "view"));
const canViewOrders = computed(() => auth.hasPermission("orders", "view"));
const canViewRegistrations = computed(() => auth.hasPermission("registrations", "view"));

onMounted(async () => {
  const tasks: Promise<unknown>[] = [];
  if (canViewEvents.value) tasks.push(admin.loadEvents());
  if (canViewOrders.value) tasks.push(admin.loadOrders({}));
  if (canViewRegistrations.value) tasks.push(admin.loadRegistrations({}));
  try {
    await Promise.all(tasks);
  } catch (error) {
    console.error("Falha ao carregar dados iniciais do dashboard", error);
  } finally {
    loadingDashboard.value = false;
  }
});

const activeEvents = computed(() => admin.events.filter((event) => event.isActive).length);
</script>
