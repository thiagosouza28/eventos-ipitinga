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
                v-maska="cpfMask"
                type="text"
                placeholder="000.000.000-00"
                inputmode="numeric"
                autocomplete="off"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-neutral-500">
                Data de nascimento
              </label>
              <input
                v-model="birthDate"
                type="date"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                required
              />
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

const cpf = ref("");
const birthDate = ref("");
const feedback = ref("");
const feedbackClass = ref("");
const cpfMask = { mask: "###.###.###-##" };
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
      className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
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
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
  };
});

const displayCpf = (value: string) => formatCPF(value);

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
};

const clearPending = () => {
  pendingCheckin.value = null;
  confirming.value = false;
  isProcessing.value = false;
};

const cancelPending = () => {
  clearPending();
  lastScanned.value = null;
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
    variant === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
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
