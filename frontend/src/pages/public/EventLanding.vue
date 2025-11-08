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
        <div class="flex h-full flex-col gap-4 md:flex-row">
          <div v-if="resolveBannerUrl(event.bannerUrl)" class="md:w-40">
            <img
              :src="resolveBannerUrl(event.bannerUrl)"
              alt="Banner do evento"
              class="h-32 w-full rounded-xl object-cover md:h-full"
              loading="lazy"
            />
          </div>
          <div class="flex flex-1 flex-col justify-between gap-4">
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
              <div
                :class="[
                  'text-lg font-semibold',
                  priceInfo(event).pending
                    ? 'text-neutral-500 dark:text-neutral-400'
                    : 'text-primary-600 dark:text-primary-400'
                ]"
              >
                {{ priceInfo(event).label }}
                <span v-if="!priceInfo(event).pending && !event.isFree"> por inscrição</span>
              </div>
              <p
                v-if="event.currentLot?.name"
                class="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
              >
                Lote vigente: {{ event.currentLot.name }}
              </p>
              <p
                v-else-if="!event.isFree"
                class="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-300"
              >
                Aguardando liberação do próximo lote
              </p>
            </div>
            <RouterLink
              :to="`/evento/${event.slug}`"
              class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
            >
              Fazer inscrições
            </RouterLink>
          </div>
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
import { API_BASE_URL } from "../../config/api";

const { api } = useApi();

const events = ref<Event[]>([]);
const loading = ref(false);
const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

const resolveBannerUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }
  const sanitized = value.replace(/^\/+/, "");
  if (!sanitized) return "";
  return `${apiOrigin.replace(/\/$/, "")}/uploads/${sanitized}`;
};

const priceInfo = (event: Event) => {
  if (event.isFree) {
    return { label: "Gratuito", pending: false };
  }
  if (event.currentLot) {
    return { label: formatCurrency(event.currentLot.priceCents), pending: false };
  }
  if (event.currentPriceCents && event.currentPriceCents > 0) {
    return { label: formatCurrency(event.currentPriceCents), pending: false };
  }
  return { label: "Aguardando liberação do lote", pending: true };
};

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
