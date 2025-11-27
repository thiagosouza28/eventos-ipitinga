<template>
  <div v-if="checkinPermissions.canList" class="space-y-6">
    <TableSkeleton
      v-if="loadingDashboard"
      helperText="📡 Carregando painel de check-in..."
    />
    <BaseCard
      v-else
      class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30"
    >
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Check-in de participantes
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">
            {{ currentEventTitle }}
          </h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Use o leitor de QR Code ou busque manualmente para confirmar presença.
          </p>
          <p v-if="currentEventDetails" class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {{ currentEventDetails }}
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        >
          Voltar ao painel
        </RouterLink>
      </div>
      <div v-if="summaryCards.length" class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="card in summaryCards"
          :key="card.key"
          class="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5"
        >
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">
              {{ card.title }}
            </p>
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white"
              :class="card.accent"
            >
              {{ card.icon }}
            </span>
          </div>
          <p class="mt-2 text-2xl font-bold" :class="card.emphasisClass">
            {{ card.value }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ card.label }}</p>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      v-if="!loadingDashboard"
      class="border border-white/40 bg-gradient-to-br from-neutral-50/60 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <div class="grid gap-6 lg:grid-cols-12">
        <div class="space-y-4 lg:col-span-7">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Leitor de QR Code</h2>
            <span class="text-xs text-neutral-500 dark:text-neutral-400">Aponte para o QR do comprovante</span>
          </div>
          <div class="rounded-2xl border border-dashed border-neutral-300/70 bg-white/70 p-3 shadow-inner dark:border-white/20 dark:bg-white/5">
            <div class="relative w-full overflow-hidden rounded-2xl bg-black/40">
              <QrcodeStream
                class="h-[200px] w-full sm:h-[260px]"
                :key="streamKey"
                @decode="onDecode"
                @init="onInit"
                :constraints="cameraConstraints"
                :paused="cameraPaused"
              >
                <div v-if="cameraStatus" class="flex h-full min-h-[180px] items-center justify-center text-sm text-neutral-500 dark:text-neutral-400 sm:min-h-[220px]">
                  {{ cameraStatus }}
                </div>
              </QrcodeStream>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-200/70 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10 sm:flex-none sm:px-5"
              @click="restartCamera"
              :disabled="isRestarting"
            >
              {{ isRestarting ? "Reiniciando..." : "Recarregar câmera" }}
            </button>
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center rounded-full border border-neutral-200/70 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10 sm:flex-none sm:px-5"
              @click="toggleFacingMode"
              :disabled="isProcessing"
            >
              Usar câmera {{ facingMode === "environment" ? "frontal" : "traseira" }}
            </button>
          </div>
        </div>
        <div class="space-y-4 lg:col-span-5">
          <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Busca manual</h2>
          <form @submit.prevent="manualLookup" class="grid gap-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">CPF</label>
              <input
                v-model="cpf"
                type="text"
                placeholder="000.000.000-00"
                inputmode="numeric"
                maxlength="14"
                autocomplete="off"
                class="mt-2 w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
                required
                @input="handleCpfInputChange"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Data de nascimento</label>
              <DateField v-model="birthDate" required class="mt-2" />
            </div>
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="manualLoading || isProcessing || confirming"
            >
              {{ manualLoading ? "Buscando..." : "Buscar participante" }}
            </button>
          </form>
          <div v-if="feedback" class="rounded-2xl px-4 py-3 text-sm" :class="feedbackClass">
            {{ feedback }}
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard v-if="pendingCheckin" class="space-y-4 border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40">
      <div class="flex flex-col gap-4 md:flex-row md:items-start">
        <div class="flex w-full max-w-[160px] items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
          <img
            v-if="pendingCheckin.registration.photoUrl"
            :src="pendingCheckin.registration.photoUrl"
            alt="Foto do participante"
            class="h-40 w-full object-cover"
          />
          <span v-else class="px-3 text-center text-xs text-neutral-500 dark:text-neutral-300">
            Foto não enviada
          </span>
        </div>
        <div class="flex-1 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {{ pendingCheckin.registration.fullName }}
            </h3>
            <span
              :class="[
                'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                pendingStatusInfo?.className ?? 'bg-neutral-200 text-neutral-600'
              ]"
            >
              {{ pendingStatusInfo?.label ?? "" }}
            </span>
          </div>
          <p>
            CPF:
            <span class="font-medium text-neutral-700 dark:text-neutral-100">
              {{ displayCpf(pendingCheckin.registration.cpf) }}
            </span>
          </p>
          <p>Evento: {{ pendingCheckin.registration.eventTitle }}</p>
          <p>Período: {{ pendingCheckin.registration.eventPeriod }}</p>
          <p>
            Igreja/Distrito: {{ pendingCheckin.registration.churchName }} -
            {{ pendingCheckin.registration.districtName }}
          </p>
          <p v-if="pendingStatusInfo?.description" class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ pendingStatusInfo.description }}
          </p>
        </div>
      </div>
      <div
        class="rounded-xl border border-neutral-200 bg-white/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Historico recente</p>
          <span v-if="historyLoading" class="text-xs text-neutral-400 dark:text-neutral-500">Atualizando...</span>
        </div>
        <ul v-if="latestHistory.length" class="mt-3 space-y-3">
          <li
            v-for="item in latestHistory"
            :key="item.type + item.at"
            class="border-l-2 border-neutral-200 pl-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
          >
            <p class="font-medium text-neutral-800 dark:text-neutral-100">{{ formatHistoryLabel(item) }}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ formatDateTime(item.at) }}
            </p>
          </li>
        </ul>
        <p v-else class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Nenhum evento registrado para esta inscricao.
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          v-if="pendingCheckin.status === 'READY'"
          type="button"
          class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="confirming"
          @click="confirmPending"
        >
          {{ confirming ? "Confirmando..." : "Confirmar presenca" }}
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          :disabled="confirming"
          @click="cancelPending"
        >
          {{ pendingCheckin.status === "READY" ? "Cancelar" : "Fechar" }}
        </button>
      </div>
    </BaseCard>

    <BaseCard v-if="admin.dashboard && !loadingDashboard" class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40">
      <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
        Ultimos check-ins
      </h2>
      <ul class="mt-4 space-y-2 text-sm text-neutral-500">
        <li v-for="item in admin.dashboard.latest" :key="item.id">
          <span class="font-medium text-neutral-700 dark:text-neutral-100">{{ item.fullName }}</span>
          - {{ formatDateTime(item.checkinAt) }}
        </li>
      </ul>
    </BaseCard>
  </div>
  <AccessDeniedNotice v-else module="checkin" action="view" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { QrcodeStream } from "vue-qrcode-reader";
import { formatCPF } from "../../utils/cpf";

import BaseCard from "../../components/ui/BaseCard.vue";
import DateField from "../../components/forms/DateField.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import { useAdminStore } from "../../stores/admin";
import { useModulePermissions } from "../../composables/usePermissions";

const route = useRoute();
const admin = useAdminStore() as any;
const checkinPermissions = useModulePermissions("checkin");
const loadingDashboard = ref(true);
const initialRouteEvent =
  typeof route.params.eventId === "string" && route.params.eventId.length
    ? String(route.params.eventId)
    : null;
const activeEventId = ref<string | null>(initialRouteEvent);

type CheckinRegistration = {
  id: string;
  eventId: string;
  fullName: string;
  cpf: string;
  eventTitle: string;
  eventLocation: string;
  eventPeriod: string;
  districtName: string;
  churchName: string;
  photoUrl: string | null;
  checkinAt: string | null;
};

type PendingCheckin = {
  registration: CheckinRegistration;
  status: "READY" | "ALREADY_CONFIRMED";
  source: "scan" | "manual";
  confirmation?: {
    registrationId: string;
    signature?: string;
  };
};

type AdminCheckinResponse = {
  status: "READY" | "ALREADY_CONFIRMED";
  registration: CheckinRegistration;
  confirmation?: {
    registrationId: string;
    signature?: string;
  };
};

type CheckinConfirmResponse = {
  status: "CONFIRMED" | "ALREADY_CONFIRMED";
  registration: CheckinRegistration;
};

type CheckinHistoryEvent = {
  type: string;
  at: string;
  label?: string;
  actor?: { id: string; name?: string | null } | null;
  details?: Record<string, unknown>;
};

const cpf = ref("");
const birthDate = ref("");
const feedback = ref("");
const feedbackClass = ref("");
const facingMode = ref<"environment" | "user">("environment");
const streamKey = ref(0);
const cameraReady = ref(false);
const cameraError = ref("");
const isProcessing = ref(false);
const isRestarting = ref(false);
const lastScanned = ref<{ value: string; timestamp: number } | null>(null);
const manualLoading = ref(false);
const confirming = ref(false);
const pendingCheckin = ref<PendingCheckin | null>(null);
const pendingHistory = ref<CheckinHistoryEvent[]>([]);
const historyLoading = ref(false);
let feedbackTimer: number | null = null;

const cameraConstraints = computed(() => ({
  facingMode: facingMode.value === "environment" ? { ideal: "environment" } : { ideal: "user" },
  width: { ideal: 1280 },
  height: { ideal: 720 }
}));
const awaitingScanConfirmation = computed(
  () => pendingCheckin.value?.source === "scan" && pendingCheckin.value.status === "READY"
);
const cameraPaused = computed(
  () =>
    isProcessing.value ||
    confirming.value ||
    awaitingScanConfirmation.value
);
const cameraStatus = computed(() => {
  if (cameraError.value) return cameraError.value;
  if (!cameraReady.value) return "Iniciando camera...";
  if (awaitingScanConfirmation.value) return "Confirme os dados do participante.";
  if (isProcessing.value) return "Processando QR Code...";
  return "";
});

const fallbackEventInfo = computed(() => {
  const registration = pendingCheckin.value?.registration;
  if (!registration) return null;
  const details = [registration.eventLocation, registration.eventPeriod]
    .filter((value) => value && value !== "Não informado")
    .join(" - ");
  return {
    title: registration.eventTitle || "Evento",
    details
  };
});
const currentEvent = computed(() => admin.dashboard?.event ?? null);
const currentEventTitle = computed(
  () =>
    currentEvent.value?.title ?? fallbackEventInfo.value?.title ?? "Check-in de participantes"
);
const currentEventDetails = computed(() => {
  if (currentEvent.value) {
    const start = currentEvent.value.startDate
      ? new Date(currentEvent.value.startDate).toLocaleDateString("pt-BR")
      : null;
    const end = currentEvent.value.endDate
      ? new Date(currentEvent.value.endDate).toLocaleDateString("pt-BR")
      : null;
    const period = start && end ? `${start} - ${end}` : start ?? end;
    const location = currentEvent.value.location ?? null;
    return [location, period].filter(Boolean).join(" - ");
  }
  return fallbackEventInfo.value?.details ?? "";
});
const summaryCards = computed(() => {
  const totals = admin.dashboard?.totals as Record<string, number> | undefined;
  if (!totals) return [];
  const total = (totals.CHECKED_IN ?? 0) + (totals.PAID ?? 0) + (totals.PENDING_PAYMENT ?? 0);
  return [
    {
      key: "CHECKED_IN",
      title: "Check-ins confirmados",
      label: "Presencas registradas",
      value: totals.CHECKED_IN ?? 0,
      accent: "from-emerald-500 to-teal-500",
      icon: "?",
      emphasisClass: "text-emerald-600 dark:text-emerald-300"
    },
    {
      key: "PAID",
      title: "Pagos",
      label: "Prontos para check-in",
      value: totals.PAID ?? 0,
      accent: "from-sky-500 to-blue-600",
      icon: "?",
      emphasisClass: "text-primary-600 dark:text-primary-300"
    },
    {
      key: "PENDING_PAYMENT",
      title: "Pendentes",
      label: "Aguardando pagamento",
      value: totals.PENDING_PAYMENT ?? 0,
      accent: "from-amber-400 to-orange-500",
      icon: ".",
      emphasisClass: "text-amber-600 dark:text-amber-300"
    },
    {
      key: "TOTAL",
      title: "Inscrições",
      label: "Total encontradas",
      value: total,
      accent: "from-neutral-600 to-neutral-800",
      icon: "#",
      emphasisClass: "text-neutral-900 dark:text-white"
    }
  ];
});


const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

const pendingStatusInfo = computed(() => {
  if (!pendingCheckin.value) return null;
  if (pendingCheckin.value.status === "READY") {
    return {
      label: "Pronto para confirmar",
      description: "Revise os dados abaixo e confirme a presenca do participante.",
      className: "bg-primary-50 text-primary-800 dark:bg-primary-500/20 dark:text-primary-100"
    };
  }
  const checkinAt = pendingCheckin.value.registration.checkinAt
    ? formatDateTime(pendingCheckin.value.registration.checkinAt)
    : null;
  return {
    label: "Check-in ja realizado",
    description: checkinAt
      ? `Check-in registrado em ${checkinAt}.`
      : "Este participante ja possui check-in registrado.",
    className: "bg-neutral-900 text-white dark:bg-black/80 dark:text-white"
  };
});

const historyLabelMap: Record<string, string> = {
  REGISTRATION_CREATED: "Inscricao criada",
  PAYMENT_METHOD_SELECTED: "Forma de pagamento escolhida",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  ORDER_PAID: "Pedido pago",
  CHECKIN_COMPLETED: "Check-in confirmado",
  REGISTRATION_UPDATED: "Dados atualizados",
  REGISTRATION_CANCELED: "Inscricao cancelada",
  REGISTRATION_DELETED: "Inscricao excluida",
  PAYMENT_REFUNDED: "Estorno registrado"
};

const latestHistory = computed(() => pendingHistory.value.slice(0, 5));

const formatHistoryLabel = (entry: CheckinHistoryEvent) =>
  entry.label ?? historyLabelMap[entry.type] ?? entry.type.replace(/_/g, " ");

const displayCpf = (value: string) => formatCPF(value);

const handleCpfInputChange = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;
  cpf.value = formatCPF(input.value);
};

const applyPendingResult = (
  result: AdminCheckinResponse,
  source: "scan" | "manual",
  fallbackSignature?: string
) => {
  const confirmation =
    result.confirmation ??
    (result.status === "READY"
      ? {
          registrationId: result.registration.id,
          signature: fallbackSignature
        }
      : undefined);
  pendingCheckin.value = {
    registration: result.registration,
    status: result.status,
    source,
    confirmation
  };
  if (result.registration.eventId) {
    activeEventId.value = result.registration.eventId;
  }
  pendingHistory.value = [];
  void loadPendingHistory(result.registration.id);
};

const clearPending = () => {
  pendingCheckin.value = null;
  confirming.value = false;
  isProcessing.value = false;
  pendingHistory.value = [];
  historyLoading.value = false;
};

const cancelPending = () => {
  clearPending();
  lastScanned.value = null;
};

const normalizeHistoryEvent = (input: any): CheckinHistoryEvent => ({
  type: String(input?.type ?? "EVENT"),
  at:
    typeof input?.at === "string"
      ? input.at
      : new Date(input?.at ?? input?.createdAt ?? Date.now()).toISOString(),
  label: typeof input?.label === "string" ? input.label : undefined,
  actor: input?.actor ?? null,
  details: input?.details ?? undefined
});

const loadPendingHistory = async (registrationId: string) => {
  historyLoading.value = true;
  try {
    const history = await admin.getRegistrationHistory(registrationId);
    const events = Array.isArray((history as any)?.events) ? (history as any).events : [];
    const normalized = events
      .map((event: any) => normalizeHistoryEvent(event))
      .sort(
        (a: CheckinHistoryEvent, b: CheckinHistoryEvent) =>
          new Date(b.at).getTime() - new Date(a.at).getTime()
      );
    pendingHistory.value = normalized;
  } catch (error) {
    console.error("Erro ao carregar historico de check-in", error);
    pendingHistory.value = [];
  } finally {
    historyLoading.value = false;
  }
};

const loadDashboard = async (eventIdParam?: string | null) => {
  if (eventIdParam === null) {
    activeEventId.value = null;
    admin.dashboard = null;
    return;
  }
  const routeEvent =
    typeof route.params.eventId === "string" && route.params.eventId.length
      ? String(route.params.eventId)
      : null;
  const resolved = eventIdParam ?? activeEventId.value ?? routeEvent;
  if (!resolved) {
    activeEventId.value = null;
    admin.dashboard = null;
    return;
  }
  activeEventId.value = resolved;
  try {
    loadingDashboard.value = true;
    await admin.loadDashboard(resolved);
  } catch (error) {
    console.error("Erro ao carregar painel de check-in", error);
  } finally {
    loadingDashboard.value = false;
  }
};

const restartCamera = () => {
  if (isRestarting.value) return;
  isRestarting.value = true;
  cameraReady.value = false;
  cameraError.value = "";
  window.setTimeout(() => {
    streamKey.value += 1;
    isRestarting.value = false;
  }, 100);
};

const toggleFacingMode = () => {
  facingMode.value = facingMode.value === "environment" ? "user" : "environment";
  restartCamera();
};

const showFeedback = (message: string, variant: "success" | "error") => {
  feedback.value = message;
  feedbackClass.value =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100"
      : "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-100";
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedback.value = "";
    feedbackClass.value =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100"
      : "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-100";
  }, 3500);
};

const onDecode = async (decoded: string) => {
  if (!decoded || isProcessing.value || confirming.value) return;

  const now = Date.now();
  if (lastScanned.value && lastScanned.value.value === decoded && now - lastScanned.value.timestamp < 1500) {
    return;
  }

  isProcessing.value = true;
  try {
    const url = new URL(decoded);
    const registrationId = url.searchParams.get("rid");
    const signature = url.searchParams.get("sig");
    if (!registrationId || !signature) {
      showFeedback("QR Code invalido", "error");
      return;
    }
    const result = (await admin.checkinScan({
      registrationId,
      signature
    })) as AdminCheckinResponse;
    applyPendingResult(result, "scan", signature);
    if (result.status === "READY") {
      showFeedback("Confirme os dados antes de registrar a presenca.", "success");
    } else {
      showFeedback("Este participante ja realizou check-in anteriormente.", "success");
    }
    await loadDashboard(result.registration.eventId ?? undefined);
    lastScanned.value = { value: decoded, timestamp: now };
  } catch (error: any) {
    showFeedback(error.response?.data?.message ?? "Erro ao processar QR Code.", "error");
    cancelPending();
  } finally {
    isProcessing.value = false;
  }
};

const onInit = async (promise: Promise<MediaStream>) => {
  try {
    await promise;
    cameraReady.value = true;
    cameraError.value = "";
  } catch (error) {
    cameraReady.value = false;
    cameraError.value =
      "Não foi possível acessar a câmera. Verifique as permissões do navegador e tente novamente.";
  }
};

const manualLookup = async () => {
  if (manualLoading.value || confirming.value) return;
  if (!cpf.value.trim() || !birthDate.value) {
    showFeedback("Informe CPF e data de nascimento.", "error");
    return;
  }
  const digits = cpf.value.replace(/\D/g, "");
  if (digits.length !== 11) {
    showFeedback("CPF invalido. Utilize o formato 000.000.000-00.", "error");
    return;
  }
  manualLoading.value = true;
  isProcessing.value = true;
  try {
    const result = (await admin.checkinManualLookup({
      cpf: digits,
      birthDate: birthDate.value
    })) as AdminCheckinResponse;
    applyPendingResult(result, "manual");
    if (result.status === "READY") {
      showFeedback(
        "Confirme os dados do participante antes de concluir o check-in.",
        "success"
      );
    } else {
      showFeedback("Este participante ja realizou check-in anteriormente.", "success");
    }
    await loadDashboard(result.registration.eventId ?? undefined);
  } catch (error: any) {
    showFeedback(
      error.response?.data?.message ?? "Não foi possível localizar a inscrição.",
      "error"
    );
    cancelPending();
  }
  manualLoading.value = false;
  isProcessing.value = false;
};

watch(
  () => route.params.eventId,
  (value) => {
    const normalized = typeof value === "string" && value.length ? String(value) : null;
    clearPending();
    void loadDashboard(normalized);
  },
  { immediate: true }
);

const confirmPending = async () => {
  if (
    !pendingCheckin.value ||
    pendingCheckin.value.status !== "READY" ||
    !pendingCheckin.value.confirmation
  ) {
    cancelPending();
    return;
  }
  confirming.value = true;
  isProcessing.value = true;
  const { confirmation, source, registration } = pendingCheckin.value;
  const payload: { registrationId: string; signature?: string } = {
    registrationId: confirmation.registrationId
  };
  if (confirmation.signature) {
    payload.signature = confirmation.signature;
  }
  const dashboardEventId = registration.eventId ?? activeEventId.value;
  try {
    const result = (await admin.confirmCheckin(payload)) as CheckinConfirmResponse;
    const successMessage =
      result.status === "ALREADY_CONFIRMED"
        ? "Este participante ja possuia check-in registrado."
        : "Check-in confirmado com sucesso!";
    showFeedback(successMessage, "success");
    await loadDashboard(dashboardEventId ?? undefined);
    if (source === "manual") {
      cpf.value = "";
      birthDate.value = "";
    }
    clearPending();
    lastScanned.value = null;
  } catch (error: any) {
    showFeedback(
      error.response?.data?.message ?? "Não foi possível confirmar o check-in.",
      "error"
    );
  } finally {
    confirming.value = false;
    isProcessing.value = false;
  }
};

onMounted(async () => {
  if (!checkinPermissions.canList.value) {
    loadingDashboard.value = false;
    return;
  }
  await loadDashboard();
});
</script>














