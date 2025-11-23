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
            <th class="pb-2 text-right">Detalhes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
          <template v-for="order in admin.orders" :key="order.id">
          <tr>
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
            <td class="py-3 text-right">
              <button
                class="rounded-full border border-neutral-300 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                @click="toggleOrderDetails(order.id)"
              >
                {{ expandedOrderId === order.id ? "Ocultar" : "Ver inscrições" }}
              </button>
            </td>
          </tr>
          <tr v-if="expandedOrderId === order.id" class="bg-neutral-50/60 dark:bg-neutral-900/40">
            <td colspan="6" class="px-4 pb-4 text-sm text-neutral-700 dark:text-neutral-200">
              <div class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Inscrições do pedido
              </div>
              <div v-if="order.registrations.length === 0" class="rounded-lg border border-dashed border-neutral-300 p-3 text-xs text-neutral-500 dark:border-neutral-700">
                Nenhuma inscrição vinculada a este pedido.
              </div>
              <div
                v-else
                class="grid gap-3 md:grid-cols-2"
              >
                <div
                  v-for="registration in order.registrations"
                  :key="registration.id"
                  class="rounded-lg border border-neutral-200 p-3 transition hover:border-primary-200 dark:border-neutral-700 dark:hover:border-primary-700"
                >
                  <div class="font-semibold text-neutral-800 dark:text-neutral-100">
                    {{ registration.fullName }}
                  </div>
                  <div class="text-xs text-neutral-500">
                    CPF: {{ maskCpf(registration.cpf) }} • {{ formatCurrency(registration.priceCents ?? 0) }}
                  </div>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      class="inline-flex rounded-full px-3 py-1 font-semibold uppercase"
                      :class="registrationStatusBadge(registration.status)"
                    >
                      {{ registration.status }}
                    </span>
                    <span class="text-neutral-500 dark:text-neutral-300">
                      Igreja: {{ findChurchName(registration.churchId) }} / {{ findDistrictName(registration.districtId) }}
                    </span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
import { useCatalogStore } from "../../stores/catalog";
import { maskCpf, formatCurrency } from "../../utils/format";

const admin = useAdminStore();
const catalog = useCatalogStore();
const filters = reactive({ eventId: "", status: "" });
const orderStatuses = ["PENDING", "PAID", "PARTIALLY_REFUNDED", "CANCELED", "EXPIRED"];
const expandedOrderId = ref<string | null>(null);

onMounted(async () => {
  await Promise.all([admin.loadEvents(), catalog.loadDistricts(), catalog.loadChurches()]);
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

const findDistrictName = (districtId: string) =>
  catalog.districts.find((district) => district.id === districtId)?.name ?? "Distrito";

const findChurchName = (churchId: string) =>
  catalog.churches.find((church) => church.id === churchId)?.name ?? "Igreja";

const toggleOrderDetails = (orderId: string) => {
  expandedOrderId.value = expandedOrderId.value === orderId ? null : orderId;
};

const statusBadge = (status: string) => {
  switch (status) {
    case "PAID":
      return "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100";
    case "PARTIALLY_REFUNDED":
      return "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white";
    case "CANCELED":
    case "EXPIRED":
      return "bg-black text-white dark:bg-neutral-900 dark:text-white";
    default:
      return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100";
  }
};

const registrationStatusBadge = (status: string) => {
  switch (status) {
    case "PAID":
    case "CHECKED_IN":
      return "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100";
    case "PENDING_PAYMENT":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100";
    case "CANCELED":
      return "bg-black text-white dark:bg-neutral-900 dark:text-white";
    case "REFUNDED":
      return "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white";
    default:
      return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100";
  }
};
</script>
