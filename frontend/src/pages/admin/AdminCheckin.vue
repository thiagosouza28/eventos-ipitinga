<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Check-in de participantes
          </h1>
          <p class="text-sm text-neutral-500">
            Use o leitor de QR Code ou busque por CPF/data de nascimento.
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
        >
          <- Dashboard
        </RouterLink>
      </div>
      <div v-if="summaryCards.length" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="card in summaryCards"
          :key="card.key"
          class="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{{ card.title }}</p>
              <p class="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{{ card.value }}</p>
            </div>
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white"
              :class="card.accent"
            >
              {{ card.icon }}
            </span>
          </div>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{{ card.label }}</p>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="grid gap-6 md:grid-cols-2">
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Leitor de QR Code
          </h2>
          <div class="rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
            <QrcodeStream
              :key="streamKey"
              @decode="onDecode"
              @init="onInit"
              :constraints="cameraConstraints"
              :paused="cameraPaused"
            >
              <div
                v-if="cameraStatus"
                class="flex h-full min-h-[220px] items-center justify-center text-sm text-neutral-500"
              >
                {{ cameraStatus }}
              </div>
            </QrcodeStream>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
            <button
              type="button"
              class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
              @click="restartCamera"
              :disabled="isRestarting"
            >
              {{ isRestarting ? "Reiniciando..." : "Recarregar camera" }}
            </button>
            <button
              type="button"
              class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto"
              @click="toggleFacingMode"
              :disabled="isProcessing"
            >
              Usar camera {{ facingMode === "environment" ? "frontal" : "traseira" }}
            </button>
            <span class="text-xs text-neutral-400">
              Aponte a camera traseira para o QR Code do comprovante.
            </span>
          </div>
        </div>
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Busca manual
          </h2>
          <form @submit.prevent="manualLookup" class="grid gap-3">
            <div>
              <label class="block text-xs font-semibold uppercase text-neutral-500">
                CPF
              </label>
              <input
                v-model="cpf"
                type="text"
                placeholder="000.000.000-00"
                inputmode="numeric"
                maxlength="14"
                autocomplete="off"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                required
                @input="handleCpfInputChange"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-neutral-500">
                Data de nascimento
              </label>
              <DateField v-model="birthDate" required class="mt-1" />
            </div>
            <button
              type="submit"
              class="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              :disabled="manualLoading || isProcessing || confirming"
            >
              {{ manualLoading ? "Buscando..." : "Buscar participante" }}
            </button>
          </form>
          <div v-if="feedback" :class="feedbackClass" class="rounded-lg px-4 py-3 text-sm">
            {{ feedback }}
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard v-if="pendingCheckin" class="space-y-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-start">
        <div class="flex w-full max-w-[160px] items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
          <img
            v-if="pendingCheckin.registration.photoUrl"
            :src="pendingCheckin.registration.photoUrl"
            alt="Foto do participante"
            class="h-40 w-full object-cover"
          />
          <span v-else class="px-3 text-center text-xs text-neutral-500 dark:text-neutral-300">
            Foto nao enviada
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
          <p>Periodo: {{ pendingCheckin.registration.eventPeriod }}</p>
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
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="confirming"
          @click="confirmPending"
        >
          {{ confirming ? "Confirmando..." : "Confirmar presenca" }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
          :disabled="confirming"
          @click="cancelPending"
        >
          {{ pendingCheckin.status === "READY" ? "Cancelar" : "Fechar" }}
        </button>
      </div>
    </BaseCard>

    <BaseCard v-if="admin.dashboard">
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
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { QrcodeStream } from "vue-qrcode-reader";
import { formatCPF } from "../../utils/cpf";

import BaseCard from "../../components/ui/BaseCard.vue";
import DateField from "../../components/forms/DateField.vue";
import { useAdminStore } from "../../stores/admin";

const route = useRoute();
const admin = useAdminStore() as any;

type CheckinRegistration = {
  id: string;
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

const cameraConstraints = computed<MediaTrackConstraints>(() => ({
  facingMode: { ideal: facingMode.value },
  aspectRatio: { ideal: 1.777 }
}));
const awaitingScanConfirmation = computed(
  () => pendingCheckin.value?.source === "scan" && pendingCheckin.value.status === "READY"
);
const cameraPaused = computed(
  () =>
    !cameraReady.value ||
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

const summaryCards = computed(() => {
  const totals = (admin.dashboard?.totals as Record<string, number>) ?? {};
  return [
    {
      key: "CHECKED_IN",
      title: "Check-ins",
      label: "Presencas confirmadas",
      value: totals.CHECKED_IN ?? 0,
      accent: "from-emerald-500 to-teal-500",
      icon: "✓"
    },
    {
      key: "PAID",
      title: "Pagos",
      label: "Prontos para check-in",
      value: totals.PAID ?? 0,
      accent: "from-sky-500 to-blue-600",
      icon: "★"
    },
    {
      key: "PENDING_PAYMENT",
      title: "Pendentes",
      label: "Aguardando pagamento",
      value: totals.PENDING_PAYMENT ?? 0,
      accent: "from-amber-400 to-orange-500",
      icon: "…"
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

const loadDashboard = async () => {
  const eventId = route.params.eventId as string;
  if (!eventId) return;
  await admin.loadDashboard(eventId);
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
      ? "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100"
      : "bg-neutral-900 text-white dark:bg-black/80 dark:text-white";
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedback.value = "";
    feedbackClass.value = "";
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
    await loadDashboard();
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
  const { confirmation, source } = pendingCheckin.value;
  const payload: { registrationId: string; signature?: string } = {
    registrationId: confirmation.registrationId
  };
  if (confirmation.signature) {
    payload.signature = confirmation.signature;
  }
  try {
    const result = (await admin.confirmCheckin(payload)) as CheckinConfirmResponse;
    const successMessage =
      result.status === "ALREADY_CONFIRMED"
        ? "Este participante ja possuia check-in registrado."
        : "Check-in confirmado com sucesso!";
    showFeedback(successMessage, "success");
    await loadDashboard();
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
  await loadDashboard();
});
</script>
