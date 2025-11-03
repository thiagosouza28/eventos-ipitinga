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
        </div>
      </form>
      <div
        class="mt-4 flex flex-col gap-3 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-700 md:flex-row md:items-center md:justify-between"
      >
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
            Tipo de relatorio
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
          {{ generatingReport ? "Gerando..." : "Gerar relatorio" }}
        </button>
      </div>
    </BaseCard>

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

    <BaseCard v-if="selected">
      <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Editar inscricao
      </h2>
      <form @submit.prevent="saveRegistration" class="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Distrito
          </label>
          <select v-model="selected.districtId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
              {{ district.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">
            Igreja
          </label>
          <select v-model="selected.churchId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option
              v-for="church in churchesByDistrict(selected.districtId)"
              :key="church.id"
              :value="church.id"
            >
              {{ church.name }}
            </option>
          </select>
        </div>
        <div class="md:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="selected = null"
          >
            Fechar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          >
            Salvar alteracoes
          </button>
        </div>
      </form>
    </BaseCard>

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
import { reactive, ref, onMounted, watch } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import { useAdminStore } from "../../stores/admin";
import { useCatalogStore } from "../../stores/catalog";
import type { Church, Registration } from "../../types/api";
import { maskCpf, formatCurrency } from "../../utils/format";

const admin = useAdminStore();
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

const selected = ref<Registration | null>(null);
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
const generatingReport = ref(false);

const generateReport = async () => {
  if (generatingReport.value) return;
  generatingReport.value = true;
  try {
    const response = await admin.downloadRegistrationReport(buildFilterParams(), reportType.value);
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
    link.href = url;
    link.download = `relatorio-inscricoes-${reportType.value}-${timestamp}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    showError("Falha ao gerar relatorio", error);
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

const openEdit = (registration: Registration) => {
  selected.value = { ...registration };
};

const saveRegistration = async () => {
  if (!selected.value) return;
  try {
    await admin.updateRegistration(selected.value.id, {
      districtId: selected.value.districtId,
      churchId: selected.value.churchId
    });
    selected.value = null;
  } catch (error) {
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
    confirmState.description = `Excluir a inscricao de ${registration.fullName}? O registro sera removido permanentemente.`;
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
