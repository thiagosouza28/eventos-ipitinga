<template>
  <div class="space-y-6">
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />

    <Modal
      :model-value="transferModal.open"
      title="Registrar repasse"
      @update:modelValue="transferModal.open = $event"
    >
      <div v-if="transferModal.responsibleId" class="space-y-4">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-neutral-900/40">
          <p class="text-xs uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Responsável</p>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">
            {{ transferModal.responsibleName }}
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ transferModal.responsibleEmail || "E-mail não informado" }}
          </p>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            PIX: {{ transferModal.pixKey || "Não informado" }}
          </p>
        </div>

        <div class="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-500/40 dark:bg-primary-900/10">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-primary-700 dark:text-primary-300">
              Disponível para repasse
            </p>
            <span class="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary-800 shadow-sm dark:bg-primary-800/40 dark:text-primary-100">
              {{ transferOrders.length }} pedido(s)
            </span>
          </div>
          <p class="mt-2 text-3xl font-bold text-primary-700 dark:text-primary-200">
            {{ formatCurrency(transferModal.amountCents) }}
          </p>
          <p class="text-xs text-primary-700/80 dark:text-primary-200/80">
            Inclui somente pedidos pendentes elegíveis.
          </p>
        </div>

        <div class="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-neutral-900/60">
          <p class="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
            Pedidos inclusos
          </p>
          <div v-if="transferOrders.length === 0" class="py-2 text-neutral-500 dark:text-neutral-400">
            Nenhum pedido pendente.
          </div>
          <div
            v-else
            v-for="order in transferOrders"
            :key="order.id"
            class="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60"
          >
            <div>
              <p class="font-semibold text-neutral-900 dark:text-white">#{{ order.id.slice(0, 6) }}</p>
              <p class="text-xs text-neutral-500">
                {{ order.event?.title ?? "Evento" }} — {{ order.registrations?.length || 0 }} inscr.
              </p>
            </div>
            <div class="text-right">
              <p class="font-semibold text-neutral-800 dark:text-white">{{ formatCurrency(order.amountToTransfer) }}</p>
              <p class="text-xs text-neutral-500">{{ order.transferStatus }}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button class="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-white/20" @click="transferModal.open = false">
            Cancelar
          </button>
          <button
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="loadingTransfer || transferOrders.length === 0 || transferModal.amountCents <= 0 || !transferModal.pixKey"
            @click="confirmTransfer"
          >
            {{ loadingTransfer ? "Enviando..." : "Registrar repasse" }}
          </button>
        </div>
      </div>
    </Modal>

    <div class="grid gap-6 lg:grid-cols-3">
      <BaseCard class="lg:col-span-3 bg-gradient-to-r from-neutral-900/70 via-neutral-900/40 to-neutral-800/40 border border-white/5 shadow-lg">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Financeiro</p>
            <h2 class="text-2xl font-bold text-neutral-900 dark:text-white">Responsáveis dos eventos</h2>
            <p class="text-sm text-neutral-600 dark:text-neutral-300">
              Repasses calculados por responsável (createdBy) com taxa automática de 0,94% para cada pedido pago.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="rounded-lg bg-neutral-100 px-4 py-3 text-right text-sm font-semibold dark:bg-neutral-800/80">
              <p class="text-neutral-500 dark:text-neutral-400">Responsáveis ativos</p>
              <p class="text-xl text-neutral-900 dark:text-white">{{ totals.responsibles }}</p>
            </div>
            <div class="rounded-lg bg-emerald-500/15 px-4 py-3 text-right text-sm font-semibold text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-100">
              <p class="text-emerald-700 dark:text-emerald-200">Disponível total</p>
              <p class="text-xl">{{ formatCurrency(totals.availableCents) }}</p>
            </div>
            <button
              class="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25"
              @click="() => refreshAll(null)"
            >
              Atualizar
            </button>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseCard class="border border-white/5 bg-neutral-900/60 shadow">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">Painel geral</h3>
        <div class="flex items-center gap-3 text-sm text-neutral-400">
          <span class="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-200">Bruto {{ formatCurrency(totals.collectedCents) }}</span>
          <span class="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-200">Líquido {{ formatCurrency(totals.netCents) }}</span>
        </div>
      </div>
      <TableSkeleton v-if="loading" />
      <div v-else-if="!summaries.length" class="rounded-md border border-dashed border-neutral-700/60 bg-neutral-900/40 p-6 text-center text-sm text-neutral-400">
        Nenhum repasse encontrado para os eventos do seu escopo.
      </div>
      <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="summary in summaries"
          :key="summary.responsible.id"
          class="group rounded-lg border border-transparent bg-neutral-50 p-4 text-left ring-emerald-500 transition hover:border-emerald-200 hover:shadow-md dark:bg-neutral-900/60"
          :class="summary.responsible.id === selectedResponsibleId ? 'border-emerald-300 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900' : ''"
          @click="selectResponsible(summary.responsible.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Responsável</p>
              <p class="text-lg font-semibold text-neutral-900 dark:text-white">{{ summary.responsible.name || "Sem nome" }}</p>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ summary.responsible.email || "E-mail não informado" }}</p>
              <p class="mt-1 text-xs text-neutral-500">PIX: {{ summary.responsible.pixKey || "Não informado" }}</p>
            </div>
            <div class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
              {{ summary.pendingOrdersCount }} pendentes
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-md bg-white/80 p-3 dark:bg-neutral-800/70">
              <p class="text-xs text-neutral-500">Arrecadado (bruto)</p>
              <p class="font-semibold text-neutral-900 dark:text-white">{{ formatCurrency(summary.totals.collectedCents) }}</p>
            </div>
            <div class="rounded-md bg-white/80 p-3 dark:bg-neutral-800/70">
              <p class="text-xs text-neutral-500">Taxas (0,94%)</p>
              <p class="font-semibold text-neutral-900 dark:text-white">-{{ formatCurrency(summary.totals.feesCents) }}</p>
            </div>
            <div class="rounded-md bg-white/80 p-3 dark:bg-neutral-800/70">
              <p class="text-xs text-neutral-500">Líquido</p>
              <p class="font-semibold text-neutral-900 dark:text-white">{{ formatCurrency(summary.totals.netCents) }}</p>
            </div>
            <div class="rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 p-3 text-white shadow-sm dark:from-emerald-600 dark:to-teal-600">
              <p class="text-xs text-white/90">Disponível</p>
              <p class="font-semibold">{{ formatCurrency(summary.totals.availableCents) }}</p>
            </div>
          </div>
          <div class="mt-3 flex justify-end">
            <button
              class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!summary.responsible.pixKey || summary.totals.availableCents <= 0"
              @click.stop="openTransfer(summary)"
            >
              Registrar repasse
            </button>
          </div>
        </button>
      </div>
    </BaseCard>

    <div v-if="selectedSummary" class="grid gap-6 lg:grid-cols-3">
      <BaseCard class="lg:col-span-2 space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Selecionado</p>
            <h3 class="text-2xl font-semibold text-neutral-900 dark:text-white">
              {{ selectedSummary.responsible.name || "Responsável" }}
            </h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ selectedSummary.responsible.email || "E-mail não informado" }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-neutral-500">Pix cadastrado</p>
            <p class="font-semibold text-neutral-900 dark:text-white">{{ selectedSummary.responsible.pixKey || "Não informado" }}</p>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-lg bg-neutral-50 p-4 shadow-sm dark:bg-neutral-900/60">
            <p class="text-xs text-neutral-500">Bruto</p>
            <p class="text-xl font-semibold text-neutral-900 dark:text-white">{{ formatCurrency(selectedSummary.totals.collectedCents) }}</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-4 shadow-sm dark:bg-neutral-900/60">
            <p class="text-xs text-neutral-500">Taxas (0,94%)</p>
            <p class="text-xl font-semibold text-neutral-900 dark:text-white">-{{ formatCurrency(selectedSummary.totals.feesCents) }}</p>
          </div>
          <div class="rounded-lg bg-neutral-50 p-4 shadow-sm dark:bg-neutral-900/60">
            <p class="text-xs text-neutral-500">Líquido</p>
            <p class="text-xl font-semibold text-neutral-900 dark:text-white">{{ formatCurrency(selectedSummary.totals.netCents) }}</p>
          </div>
          <div class="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow md:col-span-2 lg:col-span-3 dark:from-emerald-600 dark:to-teal-600">
            <p class="text-xs text-white/90">Disponível para repasse</p>
            <div class="mt-1 flex items-center justify-between">
              <p class="text-2xl font-bold">
                {{ formatCurrency(selectedSummary.totals.availableCents) }}
              </p>
              <button
                class="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!selectedSummary.responsible.pixKey || selectedSummary.totals.availableCents <= 0"
                @click="openTransfer(selectedSummary)"
              >
                Registrar repasse
              </button>
            </div>
            <p class="text-xs text-white/80">Transferido: {{ formatCurrency(selectedSummary.totals.transferredCents) }}</p>
          </div>
        </div>

        <div>
          <h4 class="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">Pedidos pendentes</h4>
          <TableSkeleton v-if="loadingPending" />
          <div v-else class="space-y-3">
            <div
              v-if="pendingOrders.length === 0"
              class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-400"
            >
              Nenhum pedido pendente.
            </div>
            <div
              v-else
              v-for="order in pendingOrders"
              :key="order.id"
              class="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-neutral-900/60"
            >
              <div>
                <p class="font-semibold text-neutral-900 dark:text-white">#{{ order.id.slice(0, 6) }}</p>
                <p class="text-xs text-neutral-500">
                  {{ order.event?.title ?? "Evento" }} — {{ order.registrations?.length || 0 }} inscr.
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold text-neutral-900 dark:text-white">{{ formatCurrency(order.amountToTransfer) }}</p>
                <p class="text-xs text-neutral-500">{{ order.transferStatus }}</p>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-neutral-900 dark:text-white">Histórico de repasses</h4>
          <span class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300">
            {{ transfers.length }} registros
          </span>
        </div>
        <TableSkeleton v-if="loadingTransfers" />
        <div v-else class="space-y-2">
          <div
            v-if="transfers.length === 0"
            class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-400"
          >
            Nenhum repasse registrado.
          </div>
          <div
            v-else
            v-for="transfer in transfers"
            :key="transfer.id"
            class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-white/10 dark:bg-neutral-900/40"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-neutral-900 dark:text-white">#{{ transfer.id.slice(0, 6) }}</p>
                <p class="text-xs text-neutral-500">{{ formatDate(transfer.createdAt) }}</p>
              </div>
              <div class="text-right">
                <p class="font-semibold text-neutral-800 dark:text-white">{{ formatCurrency(transfer.amount) }}</p>
                <p class="text-xs text-neutral-500">
                  {{ transfer.status }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
    <div
      v-else
      class="rounded-lg border border-dashed border-neutral-700/60 bg-neutral-900/40 p-8 text-center text-sm text-neutral-400"
    >
      Nenhum responsável encontrado para o seu escopo financeiro.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import BaseCard from "../../components/ui/BaseCard.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import Modal from "../../components/ui/Modal.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import { formatCurrency, formatDate } from "../../utils/format";
import { useAdminStore } from "../../stores/admin";
import { useAuthStore } from "../../stores/auth";
import type { ResponsibleFinanceSummary, ResponsiblePendingOrder, TransferRecord } from "../../types/api";

const admin = useAdminStore();
const auth = useAuthStore();

const loading = ref(true);
const loadingPending = ref(false);
const loadingTransfers = ref(false);
const loadingTransfer = ref(false);
const summaries = ref<ResponsibleFinanceSummary[]>([]);
const transferOrders = ref<ResponsiblePendingOrder[]>([]);
const transfers = ref<TransferRecord[]>([]);
const selectedResponsibleId = ref<string | null>(null);
const pendingOrders = ref<ResponsiblePendingOrder[]>([]);

const transferModal = reactive({
  open: false,
  responsibleId: "",
  responsibleName: "",
  responsibleEmail: "",
  pixKey: "",
  amountCents: 0
});

const errorDialog = reactive({
  open: false,
  title: "",
  message: "",
  details: ""
});

const isAdminGeral = computed(() => auth.role === "AdminGeral");
const selectedSummary = computed(() => {
  if (!summaries.value.length) return null;
  const target = summaries.value.find((entry) => entry.responsible.id === selectedResponsibleId.value);
  return target ?? summaries.value[0] ?? null;
});

const totals = computed(() => {
  return summaries.value.reduce(
    (acc, current) => ({
      responsibles: summaries.value.length,
      collectedCents: acc.collectedCents + (current.totals.collectedCents ?? 0),
      feesCents: acc.feesCents + (current.totals.feesCents ?? 0),
      netCents: acc.netCents + (current.totals.netCents ?? 0),
      availableCents: acc.availableCents + (current.totals.availableCents ?? 0),
      transferredCents: acc.transferredCents + (current.totals.transferredCents ?? 0)
    }),
    { responsibles: summaries.value.length, collectedCents: 0, feesCents: 0, netCents: 0, availableCents: 0, transferredCents: 0 }
  );
});

const showError = (title: string, error: unknown) => {
  const anyError = error as { message?: string; response?: { data?: { message?: string; details?: any } } };
  errorDialog.title = title;
  errorDialog.message =
    anyError?.response?.data?.message || anyError?.message || "Não foi possível completar a operação.";
  errorDialog.details =
    typeof anyError?.response?.data?.details === "string"
      ? anyError.response?.data.details
      : anyError?.response?.data?.details
      ? JSON.stringify(anyError.response?.data?.details, null, 2)
      : "";
  errorDialog.open = true;
};

const normalizeSummaries = (data: unknown): ResponsibleFinanceSummary[] => {
  if (Array.isArray(data)) return data as ResponsibleFinanceSummary[];
  if (data && typeof data === "object") {
    const maybeArray = (data as any).data ?? (data as any).items ?? (data as any).summaries;
    if (Array.isArray(maybeArray)) return maybeArray as ResponsibleFinanceSummary[];
  }
  return [];
};

const loadSummaries = async () => {
  const data = await admin.loadResponsibleFinance();
  const parsed = normalizeSummaries(data);
  summaries.value = parsed;
  return parsed;
};

const loadPendingOrders = async (responsibleId: string) => {
  loadingPending.value = true;
  try {
    const list = await admin.loadResponsiblePendingOrders(responsibleId);
    pendingOrders.value = list;
    transferOrders.value = list;
  } catch (error) {
    pendingOrders.value = [];
    transferOrders.value = [];
    showError("Erro ao carregar pedidos pendentes", error);
  } finally {
    loadingPending.value = false;
  }
};

const loadTransfers = async (responsibleId: string) => {
  loadingTransfers.value = true;
  try {
    transfers.value = await admin.loadResponsibleTransfers(responsibleId);
  } catch (error) {
    transfers.value = [];
    showError("Erro ao carregar histórico de repasses", error);
  } finally {
    loadingTransfers.value = false;
  }
};

const selectResponsible = async (responsibleId: string) => {
  selectedResponsibleId.value = responsibleId;
  pendingOrders.value = [];
  transfers.value = [];
  await Promise.all([loadPendingOrders(responsibleId), loadTransfers(responsibleId)]);
};

const refreshAll = async (preferredId?: string | null) => {
  loading.value = true;
  try {
    const parsed = await loadSummaries();
    const currentId = preferredId ?? selectedResponsibleId.value;
    const exists = currentId && parsed.some((entry) => entry.responsible.id === currentId);
    const nextId = exists ? currentId : parsed[0]?.responsible.id ?? null;
    selectedResponsibleId.value = nextId;
    pendingOrders.value = [];
    transfers.value = [];
    if (nextId) {
      await selectResponsible(nextId);
    }
  } catch (error) {
    showError("Erro ao carregar dados financeiros", error);
  } finally {
    loading.value = false;
  }
};

const openTransfer = async (summary: ResponsibleFinanceSummary) => {
  transferModal.responsibleId = summary.responsible.id;
  transferModal.responsibleName = summary.responsible.name ?? "";
  transferModal.responsibleEmail = summary.responsible.email ?? "";
  transferModal.pixKey = summary.responsible.pixKey ?? "";
  transferModal.amountCents = summary.totals.availableCents || 0;
  transferModal.open = true;
  await loadPendingOrders(summary.responsible.id);
};

const confirmTransfer = async () => {
  if (!transferModal.responsibleId) return;
  if (!isAdminGeral.value && auth.role !== "AdminDistrital") {
    showError("Permissão insuficiente", new Error("Apenas administradores podem registrar repasse."));
    return;
  }
  loadingTransfer.value = true;
  try {
    await admin.createResponsibleTransfer(transferModal.responsibleId);
    transferModal.open = false;
    await refreshAll(transferModal.responsibleId);
  } catch (error) {
    showError("Erro ao executar repasse", error);
  } finally {
    loadingTransfer.value = false;
  }
};

onMounted(async () => {
  await refreshAll();
});
</script>
