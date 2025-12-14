<template>
  <div class="flex flex-1 flex-col px-4 py-10 lg:py-16">
    <div class="mx-auto w-full max-w-4xl space-y-6">
      <BaseCard
        class="border border-white/30 bg-gradient-to-br from-white/85 via-primary-50/40 to-primary-100/40 shadow-xl dark:border-white/10 dark:from-neutral-900/70 dark:via-neutral-900/40 dark:to-primary-950/30"
      >
        <div class="flex flex-col gap-3 text-center sm:text-left">
          <p class="text-xs uppercase tracking-[0.4em] text-primary-600 dark:text-primary-300">
            Consulta rápida
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">
            Encontre comprovantes emitidos
          </h1>
          <p class="text-sm text-neutral-600 dark:text-neutral-300">
            Informe CPF e data de nascimento do participante para acessar os recibos e baixar seus PDFs em segundos.
          </p>
        </div>
      </BaseCard>

      <BaseCard
        class="border border-white/40 bg-white/90 shadow-2xl shadow-primary-900/5 backdrop-blur dark:border-white/10 dark:bg-white/5"
      >
        <form @submit.prevent="search" class="space-y-6">
          <div class="grid gap-5 md:grid-cols-2">
            <div class="space-y-2">
              <label class="block text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300">
                CPF do participante
              </label>
              <input
                v-model="cpf"
                type="text"
                placeholder="000.000.000-00"
                inputmode="numeric"
                autocomplete="off"
                required
                class="w-full rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
                @input="onCpfInput"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300">
                Data de nascimento
              </label>
              <DateField
                v-model="birthDate"
                required
                class="w-full rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-inner focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
              />
            </div>
          </div>
          <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <span
              v-if="hasSearched && !loading && showResultSummary"
              class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400"
            >
              {{ results.length }} comprovante(s) listado(s)
            </span>
            <button
              type="submit"
              :class="[primaryButtonClass, 'w-full sm:w-auto px-6 py-2']"
              :disabled="loading"
            >
              {{ loading ? "Buscando..." : "Buscar comprovantes" }}
            </button>
          </div>
        </form>
      </BaseCard>

      <BaseCard
        v-if="showFeedbackCard"
        class="border border-white/20 bg-white/80 shadow-xl dark:border-white/10 dark:bg-neutral-900/60"
      >
        <div
          v-if="errorMessage"
          class="rounded-2xl border border-red-200/60 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
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
            class="flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/80 px-4 py-3 text-sm transition hover:border-primary-200 hover:bg-primary-50/60 dark:border-white/5 dark:bg-neutral-900/60 dark:hover:border-primary-400/60 dark:hover:bg-primary-500/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="font-medium text-neutral-700 dark:text-neutral-100">
                {{ receipt.eventTitle }}
              </p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Status: {{ formatStatus(receipt.status) }} - emitido em {{ formatIssuedAt(receipt.issuedAt) }}
              </p>
            </div>
            <button
              type="button"
              :class="[primaryButtonClass, 'px-5 py-2 text-xs uppercase tracking-[0.3em]']"
              :disabled="openingReceiptId === receipt.registrationId"
              @click="openReceiptPreview(receipt)"
            >
              <span v-if="openingReceiptId === receipt.registrationId" class="flex items-center justify-center gap-2">
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Abrindo...
              </span>
              <span v-else>Visualizar</span>
            </button>
          </div>
        </div>

        <p v-if="previewError" class="text-sm text-red-600 dark:text-red-300">
          {{ previewError }}
        </p>

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
import { createPreviewSession } from "../../utils/documentPreview";

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

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60";

const resetFeedback = () => {
  errorMessage.value = "";
  emptyMessage.value = "";
  previewError.value = "";
};

const clearResults = () => {
  results.value = [];
  hasSearched.value = false;
  openingReceiptId.value = "";
};

const { api } = useApi();
const cpf = ref("");
const birthDate = ref("");
const results = ref<ReceiptSummary[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const emptyMessage = ref("");
const hasSearched = ref(false);
const openingReceiptId = ref("");
const previewError = ref("");

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

const openReceiptPreview = async (receipt: ReceiptSummary) => {
  previewError.value = "";
  openingReceiptId.value = receipt.registrationId;
  try {
    await createPreviewSession(
      [
        {
          id: receipt.registrationId,
          title: receipt.eventTitle,
          fileName: `comprovante-${receipt.registrationId}.pdf`,
          sourceUrl: resolveReceiptUrl(receipt.receiptUrl),
          mimeType: "application/pdf"
        }
      ],
      { context: "Comprovante de inscrição" }
    );
  } catch (error: any) {
    previewError.value = error?.message ?? "Não foi possível abrir o comprovante agora.";
  } finally {
    openingReceiptId.value = "";
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
