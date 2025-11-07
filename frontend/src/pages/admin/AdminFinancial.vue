<template>
  <div class="space-y-6">
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />

    <BaseCard>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Dashboard Financeiro
          </h1>
          <p class="text-sm text-neutral-500">
            Visualize receitas, despesas e saldo do caixa por evento
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

    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <!-- Resumo Geral -->
    <BaseCard v-if="!loading && generalSummary">
      <h2 class="mb-4 text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Resumo Geral
      </h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Receita Bruta</p>
          <p class="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(generalSummary.totals.grossCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Taxas MP</p>
          <p class="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            -{{ formatCurrency((generalSummary.totals.pix?.feesCents || (generalSummary.totals.grossCents - generalSummary.totals.netCents) || generalSummary.totals.feesCents) || 0) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Receita Líquida</p>
          <p class="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {{ formatCurrency(generalSummary.totals.netCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Despesas</p>
          <p class="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            -{{ formatCurrency(generalSummary.totals.expensesCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Recebido em Dinheiro</p>
          <p class="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(generalSummary.totals.cashCents || 0) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">PIX Líquido</p>
          <p class="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(generalSummary.totals.pix?.netCents || 0) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Taxas PIX</p>
          <p class="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            -{{ formatCurrency(generalSummary.totals.pix?.feesCents || 0) }}
          </p>
        </div>
        <div class="rounded-lg border-2 border-primary-500 bg-primary-50 p-4 dark:bg-primary-900/20">
          <p class="text-xs font-medium uppercase text-primary-600 dark:text-primary-400">Saldo do Caixa</p>
          <p class="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
            {{ formatCurrency(generalSummary.totals.cashBalanceCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Total Geral (Líquido)</p>
          <p class="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(generalSummary.totals.generalNetCents || generalSummary.totals.netCents) }}
          </p>
        </div>
      </div>
    </BaseCard>

    <!-- Filtro por Evento -->
    <BaseCard v-if="!loading">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="flex-1">
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Filtrar por Evento
          </label>
          <select
            v-model="selectedEventId"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
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
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          @click="showExpenseForm = true"
        >
          + Adicionar Despesa
        </button>
      </div>
    </BaseCard>

    <!-- Resumo do Evento Selecionado -->
    <BaseCard v-if="!loading && eventSummary && selectedEventId">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          {{ eventSummary.event.title }}
        </h2>
        <button
          type="button"
          class="text-sm text-primary-600 hover:underline"
          @click="loadEventDetails"
        >
          Ver Detalhes
        </button>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Receita Bruta</p>
          <p class="mt-1 text-xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(eventSummary.totals.grossCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Taxas MP</p>
          <p class="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
            -{{ formatCurrency((eventSummary.totals.pix?.feesCents || (eventSummary.totals.grossCents - eventSummary.totals.netCents) || eventSummary.totals.feesCents) || 0) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Receita Líquida</p>
          <p class="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
            {{ formatCurrency(eventSummary.totals.netCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Despesas</p>
          <p class="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
            -{{ formatCurrency(eventSummary.totals.expensesCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Recebido em Dinheiro</p>
          <p class="mt-1 text-xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(eventSummary.totals.cashCents || 0) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">PIX Líquido</p>
          <p class="mt-1 text-xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(eventSummary.totals.pix?.netCents || 0) }}
          </p>
        </div>
        <div class="rounded-lg border-2 border-primary-500 bg-primary-50 p-4 dark:bg-primary-900/20">
          <p class="text-xs font-medium uppercase text-primary-600 dark:text-primary-400">Saldo</p>
          <p class="mt-1 text-xl font-bold text-primary-600 dark:text-primary-400">
            {{ formatCurrency(eventSummary.totals.cashBalanceCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Total Geral (Líquido)</p>
          <p class="mt-1 text-xl font-bold text-neutral-800 dark:text-neutral-50">
            {{ formatCurrency(eventSummary.totals.generalNetCents || eventSummary.totals.netCents) }}
          </p>
        </div>
      </div>
      <div class="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        <p>{{ eventSummary.paidRegistrationsCount }} inscrições pagas em {{ eventSummary.paidOrdersCount }} pedidos</p>
      </div>
    </BaseCard>

    <!-- Lista de Despesas -->
    <BaseCard v-if="!loading && selectedEventId && expenses.length > 0">
      <h2 class="mb-4 text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Despesas do Evento
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th class="pb-2">Data</th>
              <th class="pb-2">Descrição</th>
              <th class="pb-2">Responsável</th>
              <th class="pb-2">Itens</th>
              <th class="pb-2 text-right">Valor</th>
              <th class="pb-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
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
                {{ expense.items || "—" }}
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

    <!-- Formulário de Despesa -->
    <BaseCard v-if="!loading && showExpenseForm && selectedEventId">
      <h2 class="mb-4 text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        {{ editingExpense ? "Editar Despesa" : "Nova Despesa" }}
      </h2>
      <form @submit.prevent="submitExpense" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Descrição *
            </label>
            <input
              v-model="expenseForm.description"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Data *
            </label>
            <input
              v-model="expenseForm.date"
              type="date"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Responsável *
            </label>
            <input
              v-model="expenseForm.madeBy"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
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
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              @input="expenseForm.amountCents = Math.round(parseFloat(($event.target as HTMLInputElement).value || '0') * 100)"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Itens (lista de produtos/serviços)
          </label>
          <textarea
            v-model="expenseForm.items"
            rows="3"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Comprovante (foto/arquivo)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
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
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50"
          >
            {{ submitting ? "Salvando..." : editingExpense ? "Atualizar" : "Salvar" }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
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

    <!-- Mensagem de erro se não conseguir carregar -->
    <BaseCard v-if="!loading && !generalSummary && !errorDialog.open">
      <p class="text-center text-neutral-500">
        Não foi possível carregar os dados do dashboard financeiro. Verifique sua conexão e tente novamente.
      </p>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { RouterLink } from "vue-router";
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
  // TODO: Implementar página de detalhes do evento
  console.log("Carregar detalhes do evento", selectedEventId.value);
};

const handleReceiptUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const base64 = await fileToBase64(file);
    expenseForm.value.receiptBase64 = base64;
    expenseForm.value.receiptPreview = file.name;
  } catch (error) {
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

