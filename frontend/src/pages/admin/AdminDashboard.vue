<template>
  <div class="space-y-6">
    <Modal
      :model-value="checkinDialog.open"
      title="Abrir check-in"
      @update:modelValue="checkinDialog.open = $event"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">Evento</label>
          <select
            v-model="checkinDialog.eventId"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option
              v-for="event in selectableCheckinEvents"
              :key="event.id"
              :value="event.id"
            >
              {{ event.title }}
            </option>
          </select>
        </div>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-neutral-200 dark:hover:bg-white/10"
            @click="checkinDialog.open = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-full bg-gradient-to-r from-[#6ea2ff] to-[#496ffb] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#5b7df733] transition hover:translate-y-0.5 disabled:opacity-60 dark:from-primary-600 dark:to-primary-500 dark:shadow-primary-500/40"
            :disabled="!checkinDialog.eventId"
            @click="confirmCheckinNavigation"
          >
            Abrir check-in
          </button>
        </div>
      </div>
    </Modal>
    <BaseCard class="bg-gradient-to-br from-white via-[#f7f8ff]/60 to-[#ecf3ff]/80 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/20">
      <div class="flex flex-col gap-5">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.2em] text-primary-500 dark:text-primary-300">Visao geral</p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
            Dashboard administrativo
          </h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Gerencie eventos, pedidos, lotes e inscricoes com atalhos rapidos.
          </p>
        </div>
        <div class="w-full">
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <component
              v-for="action in quickActions"
              :key="action.id"
              :is="action.to ? RouterLink : 'button'"
              v-bind="action.to ? { to: action.to } : { type: 'button' }"
              class="group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              :class="[getQuickActionClasses(action.variant), action.disabled ? 'opacity-60 cursor-not-allowed' : '']"
              :disabled="!action.to && action.disabled"
              @click="!action.to && !action.disabled ? action.onClick?.() : undefined"
            >
              <div>
                <p class="text-base font-semibold text-white">{{ action.label }}</p>
                <span class="text-xs text-white/70">{{ action.subtitle }}</span>
              </div>
              <component :is="action.icon" class="h-5 w-5 text-white/80" aria-hidden="true" />
            </component>
          </div>
          <div
            v-if="!hasCheckinEvents"
            class="mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          >
            Cadastre um evento ativo para liberar o check-in.
          </div>
        </div>
      </div>
    </BaseCard>

    <div class="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
      <BaseCard class="relative overflow-hidden border-none bg-gradient-to-br from-[#7aaeff] via-[#5d8eff] to-[#3c6bff] text-white shadow-lg shadow-[#516af633] dark:from-primary-600 dark:via-primary-600 dark:to-primary-700 dark:shadow-primary-500/40">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-white/80">Eventos ativos</p>
            <p class="text-4xl font-semibold">{{ activeEvents }}</p>
          </div>
          <CalendarDaysIcon class="h-10 w-10 text-white/70" aria-hidden="true" />
        </div>
      </BaseCard>
      <BaseCard class="relative overflow-hidden border-none bg-gradient-to-br from-white to-[#eef2ff] text-neutral-900 shadow-lg shadow-neutral-200/80 dark:from-neutral-900 dark:to-neutral-900/60 dark:shadow-black/40">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Pedidos carregados</p>
            <p class="text-4xl font-semibold text-neutral-900 dark:text-neutral-50">{{ admin.orders.length }}</p>
          </div>
          <ClipboardDocumentListIcon class="h-10 w-10 text-primary-500" aria-hidden="true" />
        </div>
      </BaseCard>
      <BaseCard class="relative overflow-hidden border-none bg-gradient-to-br from-[#eef4ff] via-white to-[#f8f1ff] shadow-lg shadow-primary-200/60 dark:from-primary-900/40 dark:via-neutral-900 dark:to-purple-900/30">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Inscricoes carregadas</p>
            <p class="text-4xl font-semibold text-neutral-900 dark:text-neutral-50">{{ admin.registrations.length }}</p>
          </div>
          <UsersIcon class="h-10 w-10 text-primary-500 dark:text-primary-300" aria-hidden="true" />
        </div>
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
import { computed, onMounted, reactive } from "vue";
import { RouterLink, useRouter } from "vue-router";
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon
} from "@heroicons/vue/24/outline";
import type { Component } from "vue";

import BaseCard from "../../components/ui/BaseCard.vue";
import Modal from "../../components/ui/Modal.vue";
import { useAdminStore } from "../../stores/admin";
import { formatDate } from "../../utils/format";
import { useAuthStore } from "../../stores/auth";

type QuickActionVariant = "primary" | "secondary" | "outline";
type QuickAction = {
  id: string;
  label: string;
  subtitle: string;
  to?: string | Record<string, unknown>;
  onClick?: () => void;
  disabled?: boolean;
  icon: Component;
  variant?: QuickActionVariant;
};

const admin = useAdminStore();
const auth = useAuthStore();
const router = useRouter();

const canViewEvents = computed(() => auth.hasPermission("events", "view"));
const canViewOrders = computed(() => auth.hasPermission("orders", "view"));
const canViewRegistrations = computed(() => auth.hasPermission("registrations", "view"));
const canViewFinancial = computed(() => auth.hasPermission("financial", "view"));
const canManageCatalog = computed(() => auth.hasPermission("catalog", "view"));
const canManageDistricts = computed(() => auth.hasPermission("districts", "view"));
const canManageChurches = computed(() => auth.hasPermission("churches", "view"));

onMounted(async () => {
  const tasks: Promise<unknown>[] = [];
  if (canViewEvents.value) tasks.push(admin.loadEvents());
  if (canViewOrders.value) tasks.push(admin.loadOrders({}));
  if (canViewRegistrations.value) tasks.push(admin.loadRegistrations({}));
  try {
    await Promise.all(tasks);
  } catch (error) {
    console.error("Falha ao carregar dados iniciais do dashboard", error);
  }
});

const activeEvents = computed(() => admin.events.filter((event) => event.isActive).length);
const selectableCheckinEvents = computed(() => {
  const actives = admin.events.filter((event) => event.isActive);
  return actives.length ? actives : admin.events;
});
const hasCheckinEvents = computed(() => selectableCheckinEvents.value.length > 0);

const checkinDialog = reactive({
  open: false,
  eventId: ""
});

const openCheckinDialog = () => {
  if (!hasCheckinEvents.value) return;
  checkinDialog.eventId = selectableCheckinEvents.value[0]?.id ?? "";
  checkinDialog.open = true;
};

const confirmCheckinNavigation = async () => {
  if (!checkinDialog.eventId) return;
  checkinDialog.open = false;
  await router.push({ name: "admin-checkin", params: { eventId: checkinDialog.eventId } });
};

const quickActions = computed<QuickAction[]>(() => {
  const actions: QuickAction[] = [];

  if (canViewEvents.value) {
    actions.push({
      id: "events",
      label: "Gerenciar eventos",
      subtitle: "Datas, lotes e comunicados",
      to: "/admin/events",
      icon: CalendarDaysIcon,
      variant: "secondary"
    });
  }
  if (canManageDistricts.value) {
    actions.push({
      id: "districts",
      label: "Distritos",
      subtitle: "Estruture regioes de apoio",
      to: "/admin/districts",
      icon: MapPinIcon,
      variant: "outline"
    });
  }
  if (canManageChurches.value) {
    actions.push({
      id: "churches",
      label: "Igrejas",
      subtitle: "Cadastre congregacoes",
      to: "/admin/churches",
      icon: BuildingOffice2Icon,
      variant: "outline"
    });
  }

  if (auth.isAdminGeral) {
    actions.push(
      {
        id: "ministries",
        label: "Ministerios",
        subtitle: "Coordene equipes",
        to: "/admin/ministries",
        icon: UsersIcon,
        variant: "outline"
      },
      {
        id: "users",
        label: "Cadastrar usuarios",
        subtitle: "Perfis de acesso",
        to: { name: "admin-users" },
        icon: UserPlusIcon,
        variant: "outline"
      },
      {
        id: "profiles",
        label: "Permissões",
        subtitle: "Controle de módulos",
        to: "/admin/profiles",
        icon: ShieldCheckIcon,
        variant: "outline"
      }
    );
  }

  actions.push(
    ...(canViewRegistrations.value
      ? [
          {
            id: "registrations",
            label: "Ver inscricoes",
            subtitle: "Controle em tempo real",
            to: "/admin/registrations",
            icon: ClipboardDocumentListIcon,
            variant: "primary"
          } as QuickAction
        ]
      : []),
    ...(canViewFinancial.value
      ? [
          {
            id: "financial",
            label: "Dashboard financeiro",
            subtitle: "Fluxo de receitas",
            to: "/admin/financial",
            icon: BanknotesIcon,
            variant: "primary"
          } as QuickAction
        ]
      : [])
  );

  actions.push({
    id: "checkin",
    label: "Abrir check-in",
    subtitle: "Escaneie participantes",
    icon: QrCodeIcon,
    variant: "secondary",
    disabled: !hasCheckinEvents.value,
    onClick: openCheckinDialog
  });

  return actions;
});

const getQuickActionClasses = (_variant?: QuickActionVariant) =>
  "border border-[#dbe6ff] bg-gradient-to-br from-[#a8c9ff] via-[#6f9eff] to-[#4b72ff] text-white shadow-[0_28px_60px_-35px_rgba(75,114,255,0.65)] transition hover:-translate-y-0.5 hover:shadow-xl dark:border-primary-400 dark:from-primary-600 dark:via-primary-500 dark:to-primary-700 dark:shadow-primary-500/40";
</script>
