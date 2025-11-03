<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Pedidos
          </h1>
          <p class="text-sm text-neutral-500">
            Acompanhe pedidos por status e valores totais.
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          ← Dashboard
        </RouterLink>
      </div>
    </BaseCard>

    <BaseCard>
      <form @submit.prevent="applyFilters" class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Evento
          </label>
          <select v-model="filters.eventId" class="mt-1 w-52 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option v-for="event in admin.events" :key="event.id" :value="event.id">
              {{ event.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Status
          </label>
          <select v-model="filters.status" class="mt-1 w-52 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option v-for="status in orderStatuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="resetFilters"
          >
            Limpar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          >
            Aplicar
          </button>
        </div>
      </form>
    </BaseCard>

    <BaseCard>
      <table class="w-full table-auto text-left text-sm">
        <thead class="text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th class="pb-2">Pedido</th>
            <th class="pb-2">Evento</th>
            <th class="pb-2">CPF comprador</th>
            <th class="pb-2">Status</th>
            <th class="pb-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
          <tr v-for="order in admin.orders" :key="order.id">
            <td class="py-3">
              <div class="font-medium text-neutral-800 dark:text-neutral-100">
                #{{ order.id.slice(0, 8) }}
              </div>
              <div class="text-xs text-neutral-500">
                {{ order.registrations.length }} inscrições
              </div>
            </td>
            <td class="py-3 text-sm">
              {{ findEventTitle(order.eventId) }}
            </td>
            <td class="py-3 text-sm text-neutral-500">
              {{ maskCpf(order.buyerCpf) }}
            </td>
            <td class="py-3">
              <span
                :class="[
                  'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                  statusBadge(order.status)
                ]"
              >
                {{ order.status }}
              </span>
            </td>
            <td class="py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
              {{ formatCurrency(order.totalCents) }}
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
import { maskCpf, formatCurrency } from "../../utils/format";

const admin = useAdminStore();
const filters = reactive({ eventId: "", status: "" });
const orderStatuses = ["PENDING", "PAID", "PARTIALLY_REFUNDED", "CANCELED", "EXPIRED"];

onMounted(async () => {
  await admin.loadEvents();
  await admin.loadOrders({});
});

const applyFilters = async () => {
  await admin.loadOrders({
    eventId: filters.eventId || undefined,
    status: filters.status || undefined
  });
};

const resetFilters = async () => {
  Object.assign(filters, { eventId: "", status: "" });
  await applyFilters();
};

const findEventTitle = (eventId: string) =>
  admin.events.find((event) => event.id === eventId)?.title ?? "Evento";

const statusBadge = (status: string) => {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PARTIALLY_REFUNDED":
      return "bg-yellow-100 text-yellow-700";
    case "CANCELED":
    case "EXPIRED":
      return "bg-neutral-200 text-neutral-600";
    default:
      return "bg-blue-100 text-blue-700";
  }
};
</script>
