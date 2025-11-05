<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Eventos disponíveis
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">
            Escolha um evento para iniciar suas inscrições.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <RouterLink
            to="/pendencias"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto sm:justify-start"
          >
            Ver pendências
          </RouterLink>
          <RouterLink
            to="/comprovante"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto sm:justify-start"
          >
            Consultar comprovante
          </RouterLink>
        </div>
      </div>
    </BaseCard>

    <div v-if="loading" class="py-10">
      <LoadingSpinner />
    </div>
    <div v-else class="grid gap-6 md:grid-cols-2">
      <BaseCard v-for="event in events" :key="event.id">
        <div class="flex h-full flex-col justify-between gap-4">
          <div class="space-y-2">
            <h2 class="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
              {{ event.title }}
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ event.description }}
            </p>
            <div class="flex flex-wrap gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span>📍 {{ event.location }}</span>
              <span>•</span>
              <span>{{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}</span>
            </div>
            <div class="text-lg font-semibold text-primary-600 dark:text-primary-400">
              {{ event.isFree ? "Gratuito" : formatCurrency(event.currentPriceCents ?? event.priceCents) }} por inscricao
            </div>
            <p
              v-if="event.currentLot?.name"
              class="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
            >
              Lote vigente: {{ event.currentLot.name }}
            </p>
          </div>
          <RouterLink
            :to="`/evento/${event.slug}`"
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          >
            Fazer inscrições
          </RouterLink>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import LoadingSpinner from "../../components/ui/LoadingSpinner.vue";
import { useApi } from "../../composables/useApi";
import type { Event } from "../../types/api";
import { formatCurrency, formatDate } from "../../utils/format";

const { api } = useApi();

const events = ref<Event[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const response = await api.get("/events");
    events.value = response.data;
  } finally {
    loading.value = false;
  }
});
</script>




