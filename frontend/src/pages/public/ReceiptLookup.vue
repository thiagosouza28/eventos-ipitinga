<template>
  <div class="flex flex-1 flex-col items-center">
    <div class="w-full max-w-3xl space-y-6 px-4 py-8 sm:px-0 lg:py-12">
      <BaseCard class="w-full">
        <form @submit.prevent="search" class="space-y-6">
          <div class="text-center sm:text-left">
            <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
              Consulta de comprovantes
            </h1>
            <p class="mt-1 text-sm text-neutral-500">
              Informe CPF e data de nascimento do participante para acessar os recibos.
            </p>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                CPF
              </label>
              <input
                v-model="cpf"
                type="text"
                placeholder="000.000.000-00"
                inputmode="numeric"
                autocomplete="off"
                required
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                @input="onCpfInput"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Data de nascimento
              </label>
              <DateField v-model="birthDate" required class="mt-1" />
            </div>
          </div>
          <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-end">
            <span v-if="hasSearched && !loading && showResultSummary" class="text-xs text-neutral-500">
              {{ results.length }} comprovante(s) listado(s)
            </span>
            <button
              type="submit"
              class="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              :disabled="loading"
            >
              {{ loading ? "Buscando..." : "Buscar comprovantes" }}
            </button>
          </div>
        </form>
      </BaseCard>

      <BaseCard v-if="showFeedbackCard" class="w-full">
        <div
          v-if="errorMessage"
          class="rounded-lg border border-red-400 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <div v-else-if="hasResults" class="space-y-4">
          <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
            Resultados encontrados
          </h2>
          <div
            v-for="receipt in results"
            :key="receipt.registrationId"
            class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm transition hover:border-primary-200 hover:bg-primary-50/30 dark:border-neutral-700 dark:bg-neutral-900/60 dark:hover:border-primary-400/60 dark:hover:bg-primary-500/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="font-medium text-neutral-700 dark:text-neutral-100">
                {{ receipt.eventTitle }}
              </p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Status: {{ formatStatus(receipt.status) }} - emitido em {{ formatIssuedAt(receipt.issuedAt) }}
              </p>
            </div>
            <a
              :href="resolveReceiptUrl(receipt.receiptUrl)"
              target="_blank"
              rel="noopener"
              :download="`comprovante-${receipt.registrationId}.pdf`"
              class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-500"
            >
              Baixar PDF
            </a>
          </div>
        </div>

        <p
          v-else
          class="text-sm text-neutral-600 dark:text-neutral-300"
        >
          {{ emptyMessage || "Nenhum comprovante encontrado para os dados informados." }}
        </p>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import DateField from "../../components/forms/DateField.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import { useApi } from "../../composables/useApi";
import { formatCPF, normalizeCPF } from "../../utils/cpf";
import { API_BASE_URL } from "../../config/api";

type ReceiptSummary = {
  registrationId: string;
  eventTitle: string;
  status: string;
  issuedAt: string;
  receiptUrl: string;
};

const statusLabels: Record<string, string> = {
  PAID: "Pago",
  CHECKED_IN: "Check-in realizado",
  REFUNDED: "Estornado"
};

const resetFeedback = () => {
  errorMessage.value = "";
  emptyMessage.value = "";
};

const clearResults = () => {
  results.value = [];
  hasSearched.value = false;
};

const { api } = useApi();
const cpf = ref("");
const birthDate = ref("");
const results = ref<ReceiptSummary[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const emptyMessage = ref("");
const hasSearched = ref(false);

const hasResults = computed(() => results.value.length > 0);
const showResultSummary = computed(() => hasResults.value);
const showFeedbackCard = computed(
  () => Boolean(errorMessage.value) || hasResults.value || (hasSearched.value && !loading.value)
);

const onCpfInput = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;
  cpf.value = formatCPF(input.value);
  resetFeedback();
  if (results.value.length) {
    clearResults();
  }
};

watch(birthDate, () => {
  resetFeedback();
  if (results.value.length) {
    clearResults();
  }
});

const formatStatus = (status: string) => statusLabels[status] ?? status;
const formatIssuedAt = (value: string) => new Date(value).toLocaleString("pt-BR");
const apiBase = (() => {
  try {
    return new URL(API_BASE_URL, window.location.origin);
  } catch {
    return new URL(window.location.origin);
  }
})();

const resolveReceiptUrl = (url: string) => {
  try {
    const target = new URL(url, apiBase);
    return `${apiBase.origin}${target.pathname}${target.search}`;
  } catch {
    return url;
  }
};

const search = async () => {
  const digits = normalizeCPF(cpf.value);
  resetFeedback();
  clearResults();

  if (digits.length !== 11) {
    errorMessage.value = "Informe um CPF válido com 11 dígitos.";
    return;
  }
  if (!birthDate.value) {
    errorMessage.value = "Informe a data de nascimento.";
    return;
  }

  hasSearched.value = true;
  loading.value = true;
  try {
    const response = await api.post("/receipts/lookup", {
      cpf: digits,
      birthDate: birthDate.value
    });
    results.value = [...response.data].sort(
      (a: ReceiptSummary, b: ReceiptSummary) =>
        new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );
    if (!results.value.length) {
      emptyMessage.value = "Nenhum comprovante encontrado para os dados informados.";
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? "Não foi possível consultar.";
  } finally {
    loading.value = false;
  }
};
</script>



