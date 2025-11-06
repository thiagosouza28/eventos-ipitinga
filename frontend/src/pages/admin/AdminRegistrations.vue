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
            Inscricoes
          </h1>
          <p class="text-sm text-neutral-500">
            Filtre e gerencie inscricoes por evento, distrito, igreja ou status.
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <- Dashboard
        </RouterLink>
      </div>
    </BaseCard>

    <!-- Nova área de Relatórios -->
    <BaseCard>
      <div class="grid gap-3 md:grid-cols-4 md:items-end">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 md:col-span-1">
          <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tipo de relatório</label>
          <select v-model="reportType" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto">
            <option value="event">Por evento</option>
            <option value="church">Por igreja</option>
          </select>
        </div>

        <div v-if="reportType === 'event'" class="md:col-span-2">
          <label class="block text-xs font-semibold uppercase text-neutral-500">Evento do relatório</label>
          <select v-model="reportEventId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Selecione o evento</option>
            <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
          </select>
        </div>

        <template v-if="reportType === 'church'">
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Distrito do relatório</label>
            <select v-model="reportDistrictId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="">Selecione</option>
              <option v-for="d in catalog.districts" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Igreja do relatório</label>
            <select v-model="reportChurchId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="">Selecione</option>
              <option v-for="c in churchesByDistrict(reportDistrictId)" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </template>

        <div class="md:col-span-1 flex justify-end">
          <button type="button" class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 w-full md:w-auto" :disabled="generatingReport" @click="onGenerateReport">
            {{ generatingReport ? "Gerando..." : "Gerar relatório" }}
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <form @submit.prevent="applyFilters" class="grid gap-4 md:grid-cols-5">
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Evento
          </label>
          <select v-model="filters.eventId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option v-for="event in admin.events" :key="event.id" :value="event.id">
              {{ event.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Distrito
          </label>
          <select v-model="filters.districtId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
              {{ district.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Igreja
          </label>
          <select v-model="filters.churchId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todas</option>
            <option
              v-for="church in churchesByDistrict(filters.districtId)"
              :key="church.id"
              :value="church.id"
            >
              {{ church.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Status
          </label>
          <select v-model="filters.status" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option
              v-for="option in registrationStatusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="flex items-end justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="resetFilters"
          >
            Limpar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="isApplying"
          >
            {{ isApplying ? "Aplicando..." : "Aplicar" }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 whitespace-nowrap"
            @click="openPaidAdd()"
          >
            + Nova inscrição
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 whitespace-nowrap"
            v-if="canCreateFree"
            @click="openAdd()"
          >
            + Nova inscrição (Gratuita)
          </button>
        </div>
      </form>
      <div
        v-if="false"
        class="mt-4 flex flex-col gap-3 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-700 md:flex-row md:items-center md:justify-between"
      >
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
            Tipo de relatório
          </label>
          <select
            v-model="reportType"
            class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto"
          >
            <option value="event">Por evento</option>
            <option value="church">Por igreja</option>
          </select>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="generatingReport"
          @click="generateReport"
        >
          {{ generatingReport ? "Gerando..." : "Gerar relatório" }}
        </button>
      </div>
    </BaseCard>

    <!-- Modal Nova Inscrição (Gratuita / Ano anterior) -->
    <div v-if="addDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-2xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900">
        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Adicionar inscrição</h3>
        <p class="mt-1 text-xs text-neutral-500">Use para vencedores do ano anterior (método de pagamento gratuito).</p>
        <form @submit.prevent="saveNewRegistration" class="mt-4 grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Evento</label>
            <select v-model="addForm.eventId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" required>
              <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nome</label>
            <input v-model="addForm.fullName" type="text" required minlength="3" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nascimento</label>
            <input v-model="addForm.birthDate" type="date" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">CPF</label>
            <input :value="addForm.cpf" @input="onAddCpfInput" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Distrito</label>
            <select v-model="addForm.districtId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Igreja</label>
            <select v-model="addForm.churchId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="church in churchesByDistrict(addForm.districtId)" :key="church.id" :value="church.id">{{ church.name }}</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Forma de pagamento</label>
            <select v-model="addForm.paymentMethod" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="PIX_MP">PIX</option>
              <option value="CASH">Dinheiro</option>
              <option value="FREE_PREVIOUS_YEAR">Gratuita (sorteio)</option>
            </select>
            <p class="mt-1 text-xs text-neutral-500">PIX gera link de pagamento; Dinheiro marca como pago; Gratuita confirma automaticamente.</p>
          </div>
          <div class="md:col-span-2 flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="closeAdd">Fechar</button>
            <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <BaseCard>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        {{ admin.registrations.length }} inscricoes encontradas
        </h2>
        <p class="text-xs text-neutral-500">
          Clique nos icones de acao para editar, cancelar ou estornar.
        </p>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th class="pb-2">Participante</th>
              <th class="pb-2">CPF</th>
              <th class="pb-2 text-center">Idade</th>
              <th class="pb-2 text-center">Nascimento</th>
              <th class="pb-2 text-right">Valor</th>
              <th class="pb-2">Evento</th>
              <th class="pb-2 text-center">Distrito</th>
              <th class="pb-2 text-center">Igreja</th>
              <th class="pb-2 text-center">Status</th>
              <th class="pb-2 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr v-for="registration in admin.registrations" :key="registration.id">
              <td class="py-3">
                <div class="font-medium text-neutral-800 dark:text-neutral-100">
                  {{ registration.fullName }}
                </div>
              </td>
              <td class="py-3 text-sm text-neutral-500">
                {{ maskCpf(registration.cpf) }}
              </td>
              <td class="py-3 text-center text-sm text-neutral-600 dark:text-neutral-300">
                {{ registration.ageYears ?? "-" }}
              </td>
              <td class="py-3 text-center text-sm text-neutral-600 dark:text-neutral-300">
                {{ formatBirthDate(registration.birthDate) }}
              </td>
              <td class="py-3 text-right text-sm text-neutral-600 dark:text-neutral-300">
                {{ formatCurrency(registration.priceCents ?? findEventPriceCents(registration.eventId)) }}
              </td>
              <td class="py-3 text-sm text-neutral-600 dark:text-neutral-300">
                {{ findEventTitle(registration.eventId) }}
              </td>
              <td class="py-3 text-center text-sm text-neutral-600 dark:text-neutral-300">
                {{ findDistrictName(registration.districtId) }}
              </td>
              <td class="py-3 text-center text-sm text-neutral-600 dark:text-neutral-300">
                {{ findChurchName(registration.churchId) }}
              </td>
              <td class="py-3 text-center">
                <span
                  :class="[
                    'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    statusBadgeClass(registration.status)
                  ]"
                >
                  {{ translateStatus(registration.status) }}
                </span>
              </td>
              <td class="py-3 text-right">
                <div class="flex flex-wrap justify-end gap-3 text-xs font-semibold uppercase tracking-wide">
                  <button
                    class="text-primary-600 hover:text-primary-500"
                    @click="openEdit(registration)"
                  >
                    Editar
                  </button>
                  <button
                    v-if="registration.status === 'PENDING_PAYMENT' && registration.orderId"
                    class="text-emerald-700 hover:text-emerald-600"
                    @click="markManualPaid(registration)"
                  >
                    Marcar pago
                  </button>
                  <button
                    v-if="isPaymentLinkVisible(registration)"
                    class="text-primary-600 hover:text-primary-500"
                    @click="copyPaymentLink(registration)"
                  >
                    Link pagamento
                  </button>
                  <button
                    v-if="canCancelRegistration(registration.status)"
                    class="text-amber-600 hover:text-amber-500"
                    @click="openConfirm('cancel', registration)"
                  >
                    Cancelar
                  </button>
                  <button
                    v-if="registration.status === 'PAID'"
                    class="text-blue-600 hover:text-blue-500"
                    @click="openConfirm('refund', registration)"
                  >
                    Estornar
                  </button>
                  <button
                    v-else-if="registration.status === 'REFUNDED'"
                    class="cursor-not-allowed text-neutral-400"
                    disabled
                  >
                    Estornada
                  </button>
                  <button
                    v-if="canDeleteRegistration(registration.status)"
                    class="text-red-600 hover:text-red-500"
                    @click="openConfirm('delete', registration)"
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

    <!-- Modal de edição -->
    <div v-if="editDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-2xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900">
        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Editar inscricao</h3>
        <form @submit.prevent="saveRegistration" class="mt-4 grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nome</label>
            <input
              v-model="editForm.fullName"
              type="text"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              required
              minlength="3"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nascimento</label>
            <input
              v-model="editForm.birthDate"
              type="date"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              required
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">CPF</label>
            <input
              :value="editForm.cpf"
              @input="onCpfInput"
              inputmode="numeric"
              autocomplete="off"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="000.000.000-00"
              required
              maxlength="14"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Distrito</label>
            <select v-model="editForm.districtId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                {{ district.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Igreja</label>
            <select v-model="editForm.churchId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="church in churchesByDistrict(editForm.districtId)" :key="church.id" :value="church.id">
                {{ church.name }}
              </option>
            </select>
          </div>
          <div class="md:col-span-2 flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="closeEdit">
              Fechar
            </button>
            <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500">
              Salvar alteracoes
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      :model-value="confirmState.open"
      :title="confirmState.title"
      :description="confirmState.description"
      :confirm-label="confirmState.confirmLabel"
      :cancel-label="confirmState.cancelLabel"
      :type="confirmState.type"
      @update:modelValue="handleDialogVisibility"
      @confirm="executeConfirmAction"
      @cancel="resetConfirmState"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch, computed } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import { useAdminStore } from '../../stores/admin';
import { useAuthStore } from '../../stores/auth';
import { useCatalogStore } from "../../stores/catalog";
import type { Church, Registration } from "../../types/api";
import { maskCpf, formatCurrency } from "../../utils/format";
import { validateCPF, normalizeCPF, formatCPF } from "../../utils/cpf";

const admin = useAdminStore();
const auth = useAuthStore();
const catalog = useCatalogStore();

const filters = reactive({
  eventId: "",
  districtId: "",
  churchId: "",
  status: ""
});

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_PAYMENT: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelada",
  REFUNDED: "Estornada",
  CHECKED_IN: "Check-in realizado"
};

const registrationStatusOptions = [
  { value: "DRAFT", label: statusLabels.DRAFT },
  { value: "PENDING_PAYMENT", label: statusLabels.PENDING_PAYMENT },
  { value: "PAID", label: statusLabels.PAID },
  { value: "CHECKED_IN", label: statusLabels.CHECKED_IN },
  { value: "CANCELED", label: statusLabels.CANCELED },
  { value: "REFUNDED", label: statusLabels.REFUNDED }
];

const canCreateFree = computed(() => {
  const role = auth.user?.role;
  return role === "AdminGeral" || role === "AdminDistrital";
});

const selected = ref<Registration | null>(null);
const editDialog = reactive({ open: false, original: null as Registration | null });
const editForm = reactive({
  fullName: "",
  birthDate: "",
  cpf: "",
  districtId: "",
  churchId: ""
});

const addDialog = reactive({ open: false });
const addForm = reactive({
  eventId: "",
  fullName: "",
  birthDate: "",
  cpf: "",
  districtId: "",
  churchId: "",
  paymentMethod: "PIX_MP" as 'PIX_MP' | 'CASH' | 'FREE_PREVIOUS_YEAR'
});
const filtersReady = ref(false);
const isApplying = ref(false);
let applyDebounce: number | null = null;
const pendingApply = ref(false);

const errorDialog = reactive({
  open: false,
  title: "Ocorreu um erro",
  message: "",
  details: ""
});

const extractErrorInfo = (error: unknown) => {
  const anyError = error as {
    response?: { data?: { message?: string; details?: unknown } };
    message?: string;
  };
  const responseData = anyError?.response?.data ?? {};
  const message =
    (typeof responseData.message === "string" && responseData.message) ||
    anyError?.message ||
    "Ocorreu um erro inesperado.";
  let details = "";
  const rawDetails = responseData?.details;
  if (rawDetails) {
    details =
      typeof rawDetails === "string" ? rawDetails : JSON.stringify(rawDetails, null, 2);
  }
  return { message, details };
};

const showError = (title: string, error: unknown) => {
  const { message, details } = extractErrorInfo(error);
  errorDialog.title = title;
  errorDialog.message = message;
  errorDialog.details = details;
  errorDialog.open = true;
};

type ConfirmAction = "cancel" | "refund" | "delete";

const confirmState = reactive({
  open: false,
  action: null as ConfirmAction | null,
  registration: null as Registration | null,
  title: "",
  description: "",
  confirmLabel: "Confirmar",
  cancelLabel: "Cancelar",
  type: "default" as "default" | "danger"
});

const buildFilterParams = () => ({
  eventId: filters.eventId || undefined,
  districtId: filters.districtId || undefined,
  churchId: filters.churchId || undefined,
  status: filters.status || undefined
});

const reportType = ref<"event" | "church">("event");
const reportEventId = ref<string>("");
const reportDistrictId = ref<string>("");
const reportChurchId = ref<string>("");
const generatingReport = ref(false);

const buildReportParams = () => {
  if (reportType.value === "event") {
    return { eventId: reportEventId.value || undefined } as Record<string, unknown>;
  }
  return {
    districtId: reportDistrictId.value || undefined,
    churchId: reportChurchId.value || undefined
  } as Record<string, unknown>;
};

const onGenerateReport = async () => {
  if (generatingReport.value) return;
  if (reportType.value === "event" && !reportEventId.value) {
    showError("Selecione o evento", new Error("Escolha o evento para gerar o relatório."));
    return;
  }
  if (reportType.value === "church" && !reportChurchId.value) {
    showError("Selecione a igreja", new Error("Escolha a igreja para gerar o relatório."));
    return;
  }
  generatingReport.value = true;
  try {
    const response = await admin.downloadRegistrationReport(buildReportParams(), reportType.value);
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
  const slug = findEventSlug(registration.eventId);
  if (!slug) {
    showError("Nao foi possivel gerar link", new Error("Evento sem slug disponivel."));
    return;
  }
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
    link.href = url;
    link.download = `relatorio-inscricoes-${reportType.value}-${timestamp}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    showError("Falha ao gerar relatório", error);
  } finally {
    generatingReport.value = false;
  }
};

const applyFilters = async () => {
  if (isApplying.value) {
    pendingApply.value = true;
    return;
  }
  if (applyDebounce) {
    window.clearTimeout(applyDebounce);
    applyDebounce = null;
  }
  isApplying.value = true;
  try {
    await admin.loadRegistrations(buildFilterParams());
  } catch (error) {
    showError("Falha ao carregar inscricoes", error);
  } finally {
    isApplying.value = false;
    if (pendingApply.value) {
      pendingApply.value = false;
      scheduleApply(true);
    }
  }
};

const scheduleApply = (immediate = false) => {
  if (immediate) {
    applyFilters();
    return;
  }
  if (!filtersReady.value) return;
  if (applyDebounce) {
    window.clearTimeout(applyDebounce);
  }
  applyDebounce = window.setTimeout(() => {
    applyFilters();
  }, 300);
};

const resetFilters = () => {
  Object.assign(filters, {
    eventId: "",
    districtId: "",
    churchId: "",
    status: ""
  });
};

// Ajustar seleções do relatório quando o tipo mudar
watch(
  () => reportType.value,
  (type) => {
    if (type === "event") {
      // Herdar seleção atual de evento ou primeira opção
      reportEventId.value = filters.eventId || (admin.events[0]?.id ?? "");
    } else {
      reportDistrictId.value = filters.districtId || "";
      // Se já existir igreja válida, mantém; senão pega a primeira do distrito
      const list = churchesByDistrict(reportDistrictId.value);
      const exists = list.some((c) => c.id === reportChurchId.value);
      reportChurchId.value = exists ? reportChurchId.value : (list[0]?.id ?? "");
    }
  },
  { immediate: true }
);

// Manter lista de igrejas do relatório coerente com o distrito selecionado
watch(
  () => reportDistrictId.value,
  () => {
    if (reportType.value !== "church") return;
    const list = churchesByDistrict(reportDistrictId.value);
    if (!list.some((c) => c.id === reportChurchId.value)) {
      reportChurchId.value = list[0]?.id ?? "";
    }
  }
);

watch(
  () => filters.districtId,
  async (value, oldValue) => {
    if (!filtersReady.value) return;
    try {
      await catalog.loadChurches(value || undefined);
    } catch (error) {
      showError("Falha ao carregar igrejas", error);
    }
    if (filters.churchId) {
      const exists = catalog.churches.some((church) => church.id === filters.churchId);
      if (!exists) {
        filters.churchId = "";
      }
    }
    scheduleApply();
  }
);

watch(
  () => filters.eventId,
  () => {
    if (!filtersReady.value) return;
    scheduleApply();
  }
);

watch(
  () => filters.churchId,
  () => {
    if (!filtersReady.value) return;
    scheduleApply();
  }
);

watch(
  () => filters.status,
  () => {
    if (!filtersReady.value) return;
    scheduleApply();
  }
);

onMounted(async () => {
  try {
    await Promise.all([admin.loadEvents(), catalog.loadDistricts(), catalog.loadChurches()]);
  } catch (error) {
    showError("Falha ao carregar dados iniciais", error);
  }
  await applyFilters();
  filtersReady.value = true;
  // Defaults para seleções de relatório após carregar listas
  if (!reportEventId.value) {
    reportEventId.value = filters.eventId || (admin.events[0]?.id ?? "");
  }
  if (reportType.value === 'church') {
    if (!reportDistrictId.value) reportDistrictId.value = filters.districtId || "";
    const list = churchesByDistrict(reportDistrictId.value);
    if (!reportChurchId.value && list.length) {
      reportChurchId.value = filters.churchId || list[0].id;
    }
  }
});

const churchesByDistrict = (districtId: string): Church[] => {
  if (!districtId) return catalog.churches;
  return catalog.churches.filter((church) => church.districtId === districtId);
};

const findEventTitle = (eventId: string) =>
  admin.events.find((event) => event.id === eventId)?.title ?? "Evento";

const findEventSlug = (eventId: string) =>
  admin.events.find((event) => event.id === eventId)?.slug ?? "";

const findEventPriceCents = (eventId: string) => {
  const event = admin.events.find((item) => item.id === eventId);
  return event?.currentPriceCents ?? event?.priceCents ?? 0;
};

const findDistrictName = (districtId: string) =>
  catalog.districts.find((district) => district.id === districtId)?.name ?? "Nao informado";

const findChurchName = (churchId: string) =>
  catalog.churches.find((church) => church.id === churchId)?.name ?? "Nao informado";

const deletableStatuses = new Set<Registration["status"]>([
  "PENDING_PAYMENT",
  "PAID",
  "CHECKED_IN",
  "CANCELED",
  "REFUNDED"
]);
const cancellableStatuses = new Set<Registration["status"]>(["PENDING_PAYMENT", "PAID"]);

const isPaymentLinkVisible = (registration: Registration) =>
  registration.status === "PENDING_PAYMENT" && Boolean(registration.orderId);
const canCancelRegistration = (status: Registration["status"]) => cancellableStatuses.has(status);
const canDeleteRegistration = (status: Registration["status"]) => deletableStatuses.has(status);

const brDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const formatBirthDate = (value: string | Date | null | undefined) => {
  if (!value) return "Nao informado";
  const sourceDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(sourceDate.getTime())) return "Nao informado";

  const target = new Date(
    sourceDate.getUTCFullYear(),
    sourceDate.getUTCMonth(),
    sourceDate.getUTCDate()
  );
  return brDateFormatter.format(target);
};

const translateStatus = (status: string) => statusLabels[status] ?? status;



const copyPaymentLink = async (registration: Registration) => {
  if (!isPaymentLinkVisible(registration)) {
    return;
  }
  if (!registration.orderId) {
    showError("Nao foi possivel gerar link", new Error("Inscricao sem pedido associado."));
    return;
  }
  const slug = findEventSlug(registration.eventId);
  if (!slug) {
    showError("Nao foi possivel gerar link", new Error("Evento sem slug disponivel."));
    return;
  }
  const link = `${window.location.origin}/evento/${slug}/pagamento/${registration.orderId}`;
  try {
    await navigator.clipboard.writeText(link);
    alert("Link de pagamento copiado!");
  } catch (error) {
    showError("Falha ao copiar link", error);
  }
};
const statusBadgeClass = (status: string) => {
  switch (status) {
    case "PENDING_PAYMENT":
      return "bg-amber-100 text-amber-700";
    case "PAID":
      return "bg-emerald-100 text-emerald-700";
    case "CHECKED_IN":
      return "bg-blue-100 text-blue-700";
    case "REFUNDED":
      return "bg-sky-100 text-sky-700";
    case "CANCELED":
      return "bg-red-100 text-red-700";
    case "DRAFT":
      return "bg-neutral-200 text-neutral-600";
    default:
      return "bg-neutral-200 text-neutral-600";
  }
};

const sanitizeCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11);
const onCpfInput = (e: Event) => {
  const el = e.target as HTMLInputElement;
  // aplicar máscara simples
  const digits = el.value.replace(/\D/g, "").slice(0, 11);
  let masked = digits;
  if (digits.length > 9) masked = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (m, a,b,c,d) => `${a}.${b}.${c}${d?'-'+d:''}`);
  else if (digits.length > 6) masked = digits.replace(/(\d{3})(\d{3})(\d{0,3})/, (m, a,b,c) => `${a}.${b}.${c}`);
  else if (digits.length > 3) masked = digits.replace(/(\d{3})(\d{0,3})/, (m, a,b) => `${a}.${b}`);
  editForm.cpf = masked;
};

const onAddCpfInput = (e: Event) => {
  const el = e.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, "").slice(0, 11);
  let masked = digits;
  if (digits.length > 9) masked = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (m, a,b,c,d) => `${a}.${b}.${c}${d?'-'+d:''}`);
  else if (digits.length > 6) masked = digits.replace(/(\d{3})(\d{3})(\d{0,3})/, (m, a,b,c) => `${a}.${b}.${c}`);
  else if (digits.length > 3) masked = digits.replace(/(\d{3})(\d{0,3})/, (m, a,b) => `${a}.${b}`);
  addForm.cpf = masked;
};

const openEdit = (registration: Registration) => {
  editDialog.original = { ...registration };
  editForm.fullName = registration.fullName;
  editForm.birthDate = new Date(registration.birthDate).toISOString().slice(0, 10);
  editForm.cpf = formatCPF(registration.cpf);
  editForm.districtId = registration.districtId;
  editForm.churchId = registration.churchId;
  editDialog.open = true;
};

const closeEdit = () => {
  editDialog.open = false;
  editDialog.original = null;
};

const openAdd = () => {
  // Prefere seleções do bloco de relatório quando disponíveis
  addForm.eventId = reportEventId.value || filters.eventId || (admin.events[0]?.id ?? "");
  addForm.fullName = "";
  addForm.birthDate = "";
  addForm.cpf = "";
  const preferredDistrict = reportType.value === 'church' && reportDistrictId.value ? reportDistrictId.value : (filters.districtId || (catalog.districts[0]?.id ?? ""));
  addForm.districtId = preferredDistrict;
  const preferredChurch = reportType.value === 'church' && reportChurchId.value ? reportChurchId.value : (filters.churchId || (churchesByDistrict(preferredDistrict)[0]?.id ?? ""));
  addForm.churchId = preferredChurch;
  addForm.paymentMethod = 'FREE_PREVIOUS_YEAR';
  addDialog.open = true;
};


const openPaidAdd = () => {
  addForm.eventId = reportEventId.value || filters.eventId || (admin.events[0]?.id ?? "");
  addForm.fullName = "";
  addForm.birthDate = "";
  addForm.cpf = "";
  const preferredDistrict = reportType.value === 'church' && reportDistrictId.value ? reportDistrictId.value : (filters.districtId || (catalog.districts[0]?.id ?? ""));
  addForm.districtId = preferredDistrict;
  const preferredChurch = reportType.value === 'church' && reportChurchId.value ? reportChurchId.value : (filters.churchId || (churchesByDistrict(preferredDistrict)[0]?.id ?? ""));
  addForm.churchId = preferredChurch;
  addForm.paymentMethod = 'PIX_MP';
  addDialog.open = true;
};

const closeAdd = () => {
  addDialog.open = false;
};

const saveNewRegistration = async () => {
  try {
    if (!addForm.eventId) { showError("Evento obrigatório", new Error("Selecione o evento")); return; }
    if (!addForm.fullName || addForm.fullName.trim().length < 3) { showError("Nome inválido", new Error("Informe o nome completo")); return; }
    if (!addForm.birthDate) { showError("Nascimento inválido", new Error("Informe a data")); return; }
    if (!validateCPF(addForm.cpf)) { showError("CPF inválido", new Error("Informe um CPF válido")); return; }
    if (!addForm.districtId || !addForm.churchId) { showError("Local inválido", new Error("Selecione distrito e igreja")); return; }

    const result = await admin.createAdminRegistration({
      eventId: addForm.eventId,
      buyerCpf: normalizeCPF(addForm.cpf),
      paymentMethod: addForm.paymentMethod,
      person: {
        fullName: addForm.fullName.trim(),
        cpf: normalizeCPF(addForm.cpf),
        birthDate: addForm.birthDate,
        gender: 'OTHER',
        districtId: addForm.districtId,
        churchId: addForm.churchId,
        photoUrl: null
      }
    });
    if (addForm.paymentMethod === 'PIX_MP' && result?.orderId) {
      const slug = findEventSlug(addForm.eventId);
      if (slug) {
        const link = `${window.location.origin}/evento/${slug}/pagamento/${result.orderId}`;
        try { await navigator.clipboard.writeText(link); } catch {}
        window.open(link, '_blank');
      }
      // Polling simples para detectar pagamento aprovado e atualizar a lista
      const orderId = result.orderId as string;
      const startedAt = Date.now();
      const tick = async () => {
        try {
          const payment = await admin.getOrderPayment(orderId);
          if (payment?.status === 'PAID') {
            await admin.loadRegistrations(buildFilterParams());
            return;
          }
        } catch {}
        if (Date.now() - startedAt < 120000) {
          setTimeout(tick, 5000);
        }
      };
      setTimeout(tick, 5000);
    }
    closeAdd();
  } catch (error) {
    showError("Falha ao criar inscrição", error);
  }
};

const saveRegistration = async () => {
  if (!editDialog.original) return;
  const original = editDialog.original;
  const payload: Record<string, unknown> = {};
  try {
    if (!validateCPF(editForm.cpf)) {
      showError("CPF inválido", new Error("Informe um CPF válido"));
      return;
    }
    if (editForm.fullName.trim() && editForm.fullName.trim() !== original.fullName) {
      payload.fullName = editForm.fullName.trim();
    }
    const currentBirth = new Date(original.birthDate).toISOString().slice(0,10);
    if (editForm.birthDate && editForm.birthDate !== currentBirth) {
      payload.birthDate = editForm.birthDate;
    }
    const sanitized = normalizeCPF(editForm.cpf);
    if (sanitized && sanitized !== original.cpf) {
      payload.cpf = sanitized;
    }
    if (editForm.districtId && editForm.districtId !== original.districtId) {
      payload.districtId = editForm.districtId;
    }
    if (editForm.churchId && editForm.churchId !== original.churchId) {
      payload.churchId = editForm.churchId;
    }
    await admin.updateRegistration(original.id, payload);
    closeEdit();
  } catch (error) {

const markManualPaid = async (registration: Registration) => {
  if (!registration.orderId) return;
  try {
    const manualReference = prompt("Referência do pagamento (opcional):", "CASH-ADMIN") || "CASH-ADMIN";
    await admin.confirmOrderPayment(registration.orderId, {
      manualReference,
      paidAt: new Date().toISOString()
    });
  } catch (error) {
    showError("Falha ao confirmar pagamento", error);
  }
};

    showError("Falha ao atualizar inscricao", error);
  }
};

const resetConfirmState = () => {
  confirmState.open = false;
  confirmState.action = null;
  confirmState.registration = null;
  confirmState.title = "";
  confirmState.description = "";
  confirmState.confirmLabel = "Confirmar";
  confirmState.cancelLabel = "Cancelar";
  confirmState.type = "default";
};

const handleDialogVisibility = (value: boolean) => {
  if (value) {
    confirmState.open = true;
    return;
  }
  resetConfirmState();
};

const openConfirm = (action: ConfirmAction, registration: Registration) => {
  confirmState.action = action;
  confirmState.registration = registration;
  confirmState.open = true;
  confirmState.cancelLabel = "Voltar";

  if (action === "cancel") {
    confirmState.title = "Cancelar inscricao";
    confirmState.description = `Cancelar a inscricao de ${registration.fullName}? Esta acao nao pode ser desfeita.`;
    confirmState.confirmLabel = "Cancelar";
    confirmState.type = "danger";
  } else if (action === "refund") {
    confirmState.title = "Estornar inscricao";
    confirmState.description = `Confirmar estorno da inscricao de ${registration.fullName}? O Mercado Pago sera acionado.`;
    confirmState.confirmLabel = "Confirmar estorno";
    confirmState.type = "default";
  } else {
    confirmState.title = "Excluir inscricao";
    confirmState.description = `Excluir a inscrição de ${registration.fullName}? O registro será removido permanentemente.`;
    confirmState.confirmLabel = "Excluir";
    confirmState.type = "danger";
  }
};

const executeConfirmAction = async () => {
  if (!confirmState.registration || !confirmState.action) {
    resetConfirmState();
    return;
  }

  const registration = confirmState.registration;
  const action = confirmState.action;
  resetConfirmState();

  try {
    if (action === "cancel") {
      await admin.cancelRegistration(registration.id);
    } else if (action === "refund") {
      await admin.refundRegistration(registration.id, {});
    } else if (action === "delete") {
      await admin.deleteRegistration(registration.id);
    }
  } catch (error) {
    const titles: Record<ConfirmAction, string> = {
      cancel: "Falha ao cancelar inscricao",
      refund: "Falha ao estornar inscricao",
      delete: "Falha ao excluir inscricao"
    };
    showError(titles[action], error);
  }
};
</script>

















