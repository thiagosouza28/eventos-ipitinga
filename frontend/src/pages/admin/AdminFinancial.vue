<template>
  <div class="space-y-6">
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />

    <BaseCard
      class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30"
    >
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Controle financeiro
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Dashboard Financeiro</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Visualize receitas, despesas e o saldo consolidado dos eventos.
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        >
          Voltar ao painel
        </RouterLink>
      </div>
    </BaseCard>
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <!-- Resumo Geral -->
    <BaseCard
  v-if="!loading && generalSummary"
  class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">Resumo geral</p>
      <h2 class="text-2xl font-semibold text-neutral-900 dark:text-white">Visão consolidada</h2>
    </div>
    <p class="text-xs text-neutral-500 dark:text-neutral-400">
      Atualizado automaticamente conforme as movimentações dos eventos.
    </p>
  </div>
  <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Receita bruta</p>
      <p class="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
        {{ formatCurrency(generalSummary.totals.grossCents) }}
      </p>
    </div>
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Taxas MP</p>
      <p class="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
        -{{ formatCurrency((generalSummary.totals.pix?.feesCents || (generalSummary.totals.grossCents - generalSummary.totals.netCents) || generalSummary.totals.feesCents) || 0) }}
      </p>
    </div>
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Receita líquida</p>
      <p class="mt-2 text-2xl font-bold text-primary-600 dark:text-primary-300">
        {{ formatCurrency(generalSummary.totals.netCents) }}
      </p>
    </div>
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Despesas</p>
      <p class="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
        -{{ formatCurrency(generalSummary.totals.expensesCents) }}
      </p>
    </div>
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Recebido em dinheiro</p>
      <p class="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
        {{ formatCurrency(generalSummary.totals.cashCents || 0) }}
      </p>
    </div>
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">PIX líquido</p>
      <p class="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
        {{ formatCurrency(generalSummary.totals.pix?.netCents || 0) }}
      </p>
    </div>
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Taxas PIX</p>
      <p class="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
        -{{ formatCurrency(generalSummary.totals.pix?.feesCents || 0) }}
      </p>
    </div>
    <div class="rounded-2xl border border-primary-400/60 bg-gradient-to-br from-primary-600/10 to-primary-400/10 p-4 shadow-lg shadow-primary-300/30 dark:border-primary-500/30 dark:from-primary-900/30 dark:to-primary-700/20">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary-600 dark:text-primary-300">Saldo do caixa</p>
      <p class="mt-2 text-2xl font-bold text-primary-600 dark:text-primary-300">
        {{ formatCurrency(generalSummary.totals.cashBalanceCents) }}
      </p>
    </div>
    <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Total geral (líquido)</p>
      <p class="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
        {{ formatCurrency(generalSummary.totals.generalNetCents || generalSummary.totals.netCents) }}
      </p>
    </div>
  </div>
</BaseCard>

        <!-- Filtro por Evento -->
    <BaseCard
      v-if="!loading"
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="flex-1">
          <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">
            Filtrar por evento
          </label>
          <select
            v-model="selectedEventId"
            class="mt-2 w-full rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            @change="loadEventSummary"
          >
            <option value="">Todos os eventos</option>
            <option v-for="event in admin.events" :key="event.id" :value="event.id">
              {{ event.title }}
            </option>
          </select>
        </div>
        <button
          v-if="selectedEventId"
          type="button"
          class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5"
          @click="showExpenseForm = true"
        >
          + Adicionar despesa
        </button>
      </div>
    </BaseCard>

    <!-- Resumo do Evento Selecionado -->
        <BaseCard
      v-if="!loading && eventSummary && selectedEventId"
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">Evento selecionado</p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-white">
            {{ eventSummary.event.title }}
          </h2>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="text-sm font-semibold text-primary-600 transition hover:-translate-y-0.5 dark:text-primary-300"
            @click="loadEventDetails"
          >
            Ver detalhes
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            :disabled="downloadingReport"
            @click="downloadEventReport"
          >
            {{ downloadingReport ? "Gerando PDF..." : "Baixar PDF" }}
          </button>
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>Receita bruta</p>
          <strong>{{ formatCurrency(eventSummary.totals.grossCents) }}</strong>
        </div>
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>Taxas MP</p>
          <strong class="text-red-600 dark:text-red-400">-{{ formatCurrency((eventSummary.totals.pix?.feesCents || (eventSummary.totals.grossCents - eventSummary.totals.netCents) || eventSummary.totals.feesCents) || 0) }}</strong>
        </div>
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>Receita líquida</p>
          <strong class="text-primary-600 dark:text-primary-300">
            {{ formatCurrency(eventSummary.totals.netCents) }}
          </strong>
        </div>
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>Despesas</p>
          <strong class="text-red-600 dark:text-red-400">-{{ formatCurrency(eventSummary.totals.expensesCents) }}</strong>
        </div>
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>Recebido em dinheiro</p>
          <strong>{{ formatCurrency(eventSummary.totals.cashCents || 0) }}</strong>
        </div>
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>PIX líquido</p>
          <strong>{{ formatCurrency(eventSummary.totals.pix?.netCents || 0) }}</strong>
        </div>
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>Saldo</p>
          <strong class="text-primary-600 dark:text-primary-300">
            {{ formatCurrency(eventSummary.totals.cashBalanceCents) }}
          </strong>
        </div>
        <div class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/20 dark:border-white/10 dark:bg-white/5">
          <p>Total geral (líquido)</p>
          <strong>{{ formatCurrency(eventSummary.totals.generalNetCents || eventSummary.totals.netCents) }}</strong>
        </div>
      </div>
      <div class="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        <p>{{ eventSummary.paidRegistrationsCount }} inscrições pagas em {{ eventSummary.paidOrdersCount }} pedidos</p>
      </div>
    </BaseCard>

    <!-- Lista de Despesas -->
    <BaseCard v-if="!loading && selectedEventId && expenses.length > 0" class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40">
      <h2 class="mb-4 text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Despesas do Evento
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200">
          <thead class="bg-white/60 text-[11px] uppercase tracking-[0.3em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
            <tr>
              <th class="pb-2">Data</th>
              <th class="pb-2">DescriÃ§Ã£o</th>
              <th class="pb-2">ResponsÃ¡vel</th>
              <th class="pb-2">Itens</th>
              <th class="pb-2 text-right">Valor</th>
              <th class="pb-2 text-right">AÃ§Ãµes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr v-for="expense in expenses" :key="expense.id">
              <td class="py-2 text-neutral-700 dark:text-neutral-100">
                {{ formatDate(expense.date) }}
              </td>
              <td class="py-2 text-neutral-700 dark:text-neutral-100">
                {{ expense.description }}
              </td>
              <td class="py-2 text-sm text-neutral-600 dark:text-neutral-400">
                {{ expense.madeBy }}
              </td>
              <td class="py-2 text-sm text-neutral-600 dark:text-neutral-400">
                {{ expense.items || "â€”" }}
              </td>
              <td class="py-2 text-right font-medium text-red-600 dark:text-red-400">
                -{{ formatCurrency(expense.amountCents) }}
              </td>
              <td class="py-2 text-right">
                <div class="flex items-center justify-end gap-2">
                  <a
                    v-if="expense.receiptUrl"
                    :href="expense.receiptUrl"
                    target="_blank"
                    class="text-sm text-primary-600 hover:underline"
                  >
                    Ver Comprovante
                  </a>
                  <button
                    class="text-sm text-primary-600 hover:underline"
                    @click="startEditExpense(expense)"
                  >
                    Editar
                  </button>
                  <button
                    class="text-sm text-red-600 hover:underline"
                    @click="confirmDeleteExpense(expense)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- FormulÃ¡rio de Despesa -->
    <BaseCard v-if="!loading && showExpenseForm && selectedEventId" class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40">
      <h2 class="mb-4 text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        {{ editingExpense ? "Editar Despesa" : "Nova Despesa" }}
      </h2>
      <form @submit.prevent="submitExpense" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              DescriÃ§Ã£o *
            </label>
            <input
              v-model="expenseForm.description"
              type="text"
              required
              class="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Data *
            </label>
            <DateField v-model="expenseForm.date" required class="mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              ResponsÃ¡vel *
            </label>
            <input
              v-model="expenseForm.madeBy"
              type="text"
              required
              class="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Valor (R$) *
            </label>
            <input
              :value="(expenseForm.amountCents / 100).toFixed(2)"
              type="number"
              step="0.01"
              min="0"
              required
              class="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
              @input="expenseForm.amountCents = Math.round(parseFloat(($event.target as HTMLInputElement).value || '0') * 100)"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Itens (lista de produtos/serviÃ§os)
          </label>
          <textarea
            v-model="expenseForm.items"
            rows="3"
            class="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Comprovante (foto/arquivo)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            class="mt-1 w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            @change="handleReceiptUpload"
          />
          <p v-if="expenseForm.receiptPreview" class="mt-2 text-xs text-neutral-500">
            Arquivo selecionado
          </p>
        </div>
        <div class="flex gap-3">
          <button
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:opacity-60"
          >
            {{ submitting ? "Salvando..." : editingExpense ? "Atualizar" : "Salvar" }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            @click="cancelExpenseForm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </BaseCard>

    <ConfirmDialog
      :model-value="confirmDelete.open"
      title="Excluir Despesa"
        :description="`Tem certeza que deseja excluir a despesa '${confirmDelete.expense?.description}'?`"
      confirm-label="Excluir"
      cancel-label="Cancelar"
      type="danger"
      @update:modelValue="confirmDelete.open = $event"
      @confirm="deleteExpense"
      @cancel="confirmDelete.open = false"
    />

    <!-- Mensagem de erro se nÃ£o conseguir carregar -->
    <BaseCard v-if="!loading && !generalSummary && !errorDialog.open">
      <p class="text-center text-neutral-500">
        NÃ£o foi possÃ­vel carregar os dados do dashboard financeiro. Verifique sua conexÃ£o e tente novamente.
      </p>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { RouterLink } from "vue-router";
import DateField from "../../components/forms/DateField.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import LoadingSpinner from "../../components/ui/LoadingSpinner.vue";
import { useAdminStore } from "../../stores/admin";
import { useApi } from "../../composables/useApi";
import { formatCurrency, formatDate } from "../../utils/format";

const admin = useAdminStore();
const { api } = useApi();

const loading = ref(true);
const generalSummary = ref<any>(null);
const eventSummary = ref<any>(null);
const selectedEventId = ref("");
const expenses = ref<any[]>([]);
const showExpenseForm = ref(false);
const editingExpense = ref<any>(null);
const submitting = ref(false);
const downloadingReport = ref(false);

const expenseForm = ref({
  description: "",
  date: new Date().toISOString().split("T")[0],
  madeBy: "",
  amountCents: 0,
  items: "",
  receiptBase64: "",
  receiptPreview: ""
});

const confirmDelete = ref({
  open: false,
  expense: null as any
});

const errorDialog = reactive({
  open: false,
  title: "Erro",
  message: "",
  details: ""
});

const loadGeneralSummary = async () => {
  try {
    const response = await api.get("/admin/financial/summary");
    generalSummary.value = response.data;
  } catch (error: any) {
    console.error("Erro ao carregar resumo geral:", error);
    showError("Erro ao carregar resumo geral", error);
    generalSummary.value = null;
  }
};

const loadEventSummary = async () => {
  if (!selectedEventId.value) {
    eventSummary.value = null;
    expenses.value = [];
    return;
  }

  try {
    loading.value = true;
    const [summaryResponse, expensesResponse] = await Promise.all([
      api.get(`/admin/financial/events/${selectedEventId.value}`),
      api.get(`/admin/events/${selectedEventId.value}/expenses`)
    ]);
    eventSummary.value = summaryResponse.data;
    expenses.value = expensesResponse.data || [];
  } catch (error: any) {
    showError("Erro ao carregar resumo do evento", error);
  } finally {
    loading.value = false;
  }
};

const loadEventDetails = () => {
  // TODO: Implementar pÃ¡gina de detalhes do evento
  console.log("Carregar detalhes do evento", selectedEventId.value);
};

const downloadEventReport = async () => {
  if (!selectedEventId.value) return;
  try {
    downloadingReport.value = true;
    const response = await admin.downloadFinancialReport(selectedEventId.value);
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filenameBase = eventSummary.value?.event?.slug || eventSummary.value?.event?.title || "evento";
    link.href = url;
    link.download = `relatorio-financeiro-${filenameBase}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    showError("Erro ao gerar relatório financeiro", error);
  } finally {
    downloadingReport.value = false;
  }
};


const handleReceiptUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const base64 = await fileToBase64(file);
    expenseForm.value.receiptBase64 = base64;
    expenseForm.value.receiptPreview = file.name;
  } catch (error: any) {
    showError("Erro ao processar arquivo", error);
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const submitExpense = async () => {
  try {
    submitting.value = true;
    const payload = {
      eventId: selectedEventId.value,
      description: expenseForm.value.description,
      date: new Date(expenseForm.value.date).toISOString(),
      amountCents: expenseForm.value.amountCents,
      madeBy: expenseForm.value.madeBy,
      items: expenseForm.value.items || undefined,
      receiptBase64: expenseForm.value.receiptBase64 || undefined
    };

    if (editingExpense.value) {
      await api.patch(`/admin/expenses/${editingExpense.value.id}`, payload);
    } else {
      await api.post(`/admin/events/${selectedEventId.value}/expenses`, payload);
    }

    cancelExpenseForm();
    await loadEventSummary();
  } catch (error: any) {
    showError("Erro ao salvar despesa", error);
  } finally {
    submitting.value = false;
  }
};

const startEditExpense = (expense: any) => {
  editingExpense.value = expense;
  expenseForm.value = {
    description: expense.description,
    date: new Date(expense.date).toISOString().split("T")[0],
    madeBy: expense.madeBy,
    amountCents: expense.amountCents,
    items: expense.items || "",
    receiptBase64: "",
    receiptPreview: expense.receiptUrl ? "Comprovante existente" : ""
  };
  showExpenseForm.value = true;
};

const cancelExpenseForm = () => {
  showExpenseForm.value = false;
  editingExpense.value = null;
  expenseForm.value = {
    description: "",
    date: new Date().toISOString().split("T")[0],
    madeBy: "",
    amountCents: 0,
    items: "",
    receiptBase64: "",
    receiptPreview: ""
  };
};

const confirmDeleteExpense = (expense: any) => {
  confirmDelete.value = {
    open: true,
    expense
  };
};

const deleteExpense = async () => {
  if (!confirmDelete.value.expense) return;

  try {
    await api.delete(`/admin/expenses/${confirmDelete.value.expense.id}`);
    confirmDelete.value.open = false;
    await loadEventSummary();
  } catch (error: any) {
    showError("Erro ao excluir despesa", error);
  }
};

const showError = (title: string, error: any) => {
  errorDialog.title = title;
  errorDialog.message = error.response?.data?.message || error.message || "Erro desconhecido";
  errorDialog.details = error.response?.data?.details || "";
  errorDialog.open = true;
};

onMounted(async () => {
  try {
    loading.value = true;
    await admin.loadEvents();
    await loadGeneralSummary();
  } catch (error: any) {
    console.error("Erro ao carregar dados iniciais:", error);
    showError("Erro ao carregar dashboard", error);
  } finally {
    loading.value = false;
  }
});
</script>





















