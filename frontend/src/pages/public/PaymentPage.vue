ï»¿<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="space-y-3">
        <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Pagamento do pedido</h1>
        <p class="text-neutral-500 dark:text-neutral-400">
          {{
            isFreeEvent
              ? "Este evento Ã© gratuito. As inscriÃ§Ãµes foram confirmadas automaticamente e nenhum pagamento Ã© necessÃ¡rio."
              : "Conclua o pagamento para garantir as inscriÃ§Ãµes. Assim que o Mercado Pago aprovar, atualizamos tudo automaticamente."
          }}
        </p>
      </div>
    </BaseCard>

    <BaseCard v-if="payment">
      <div class="flex flex-col gap-6 md:flex-row md:items-start">
        <div class="flex-1 space-y-4">
          <div class="flex items-start gap-3 rounded-xl border px-4 py-3" :class="statusStyles.container">
            <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-white" :class="statusStyles.badge">
              {{ statusIcon }}
            </span>
            <div>
              <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{{ statusTitle }}</h2>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ statusMessage }}
              </p>
              <p v-if="payment.statusDetail" class="mt-1 text-xs text-neutral-400">
                Detalhe do provedor: {{ payment.statusDetail }}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900/60">
            <div class="flex items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span>ID do pedido</span>
              <code class="rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">{{ props.orderId }}</code>
            </div>
          <div class="mt-4 grid gap-3 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2">
            <div>
              <span class="block text-xs uppercase tracking-wide text-neutral-400">Evento</span>
              <span>{{ eventStore.event?.title ?? "Carregando..." }}</span>
            </div>
              <div>
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Valor por inscriÃ§Ã£o</span>
                <span>{{ isFreeEvent ? "Gratuito" : formatCurrency(ticketPriceCents) }}</span>
              </div>
              <div>
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Total</span>
              <span>{{ totalFormatted }}</span>
            </div>
            <div v-if="currentLotName">
              <span class="block text-xs uppercase tracking-wide text-neutral-400">Lote vigente</span>
              <span>{{ currentLotName }}</span>
            </div>
            <div>
              <span class="block text-xs uppercase tracking-wide text-neutral-400">Forma de pagamento</span>
              <span>{{ paymentMethodName }}</span>
            </div>
            <div v-if="payment?.paidAt">
              <span class="block text-xs uppercase tracking-wide text-neutral-400">Pagamento registrado em</span>
              <span>{{ formatDate(payment.paidAt) }}</span>
            </div>
          </div>
            <div
              v-if="pendingParticipants.length"
              class="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            >
              <span class="block text-xs uppercase tracking-wide text-neutral-400">Participantes pendentes</span>
              <ul class="mt-2 space-y-2">
                <li
                  v-for="participant in pendingParticipants"
                  :key="participant.id"
                  class="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm dark:bg-neutral-800"
                >
                  <span class="font-medium text-neutral-700 dark:text-neutral-100">
                    {{ participant.fullName }}
                  </span>
                  <span
                    class="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-500/20 dark:text-primary-100"
                  >
                    {{ formatParticipantStatus(participant.status) }}
                  </span>
                </li>
              </ul>
            </div>
            <div
              v-if="receiptsReady"
              class="mt-4 space-y-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-5 text-sm text-emerald-900 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-50"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="text-base font-semibold">Comprovantes disponiveis</p>
                  <p class="text-sm text-emerald-800 dark:text-emerald-100/80">
                    {{
                      autoReceiptDownloadState === "done"
                        ? "Download automatico concluido. Se precisar novamente, clique abaixo."
                        : "Escolha um comprovante individual ou baixe todos de uma vez."
                    }}
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                  :disabled="downloadingReceipts"
                  @click="handleManualReceiptDownload"
                >
                  <span v-if="downloadingReceipts" class="flex items-center gap-2">
                    <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Baixando...
                  </span>
                  <span v-else>Baixar todos</span>
                </button>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <article
                  v-for="receipt in receiptLinks"
                  :key="receipt.registrationId"
                  class="rounded-2xl border border-white/70 bg-white/90 p-4 text-neutral-700 shadow dark:border-emerald-500/20 dark:bg-emerald-900/40 dark:text-emerald-50"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ receipt.fullName }}</p>
                      <p class="text-xs text-neutral-500 dark:text-emerald-100/70">
                        Inscricao {{ receipt.registrationId.slice(0, 8).toUpperCase() }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                      :class="receiptStatusClass(receipt.registrationId)"
                    >
                      {{ receiptStatusLabel(receipt.registrationId) }}
                    </span>
                  </div>
                  <p class="mt-3 text-xs text-neutral-500 dark:text-emerald-100/70">
                    Gere o PDF deste participante para apresentar no check-in ou compartilhar por mensagem.
                  </p>
                  <button
                    type="button"
                    class="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-600 dark:border-emerald-500/40 dark:text-emerald-50"
                    :disabled="downloadingReceipts"
                    @click="handleSingleReceiptDownload(receipt.registrationId)"
                  >
                    <span class="h-4 w-4" aria-hidden="true">ï¿½?"</span>
                    Baixar comprovante
                  </button>
                </article>
              </div>
              <p v-if="receiptDownloadError" class="text-sm text-red-600 dark:text-red-300">
                {{ receiptDownloadError }}
              </p>
            </div>
            <div
              v-else-if="receiptsGenerating"
              class="mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200"
            >
              Estamos finalizando os comprovantes deste pedido. Assim que ficarem prontos faremos o download
              automaticamente.
            </div>
          </div>
        </div>

        <div v-if="!isFreeEvent && !isPaid" class="flex-1 space-y-6">
          <section
            v-if="isManualPayment"
            class="space-y-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300"
          >
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Pagamento manual</h2>
            <p>
              Forma selecionada: <strong>{{ paymentMethodName }}</strong>.
              Apresente o comprovante desta inscricÃ£o para a tesouraria e realize o pagamento do valor total informado acima.
            </p>
            <p v-if="manualInstructions" class="text-neutral-500 dark:text-neutral-400">
              {{ manualInstructions }}
            </p>
            <p class="text-xs text-neutral-400 dark:text-neutral-500">
              ApÃ³s a confirmaÃ§Ã£o pela tesouraria, este painel serÃ¡ atualizado automaticamente.
            </p>
            <RouterLink
              :to="{ name: 'event', params: { slug: props.slug } }"
              class="inline-flex w-full items-center justify-center rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:hover:bg-primary-500/10"
            >
              Registrar nova inscricao
            </RouterLink>
          </section>

          <template v-else>
            <section class="space-y-3">
              <header class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Pague com Pix</h2>
                <button
                  type="button"
                  class="text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400"
                  :disabled="!payment.pixQrData"
                  @click="copyPixCode"
                >
                  Copiar codigo
                </button>
              </header>
              <p
                v-if="pixWasReactivated"
                class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
              >
                Este PIX foi reativado. Use apenas o novo QR Code.
              </p>
              <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/80">
                <img
                  v-if="payment.pixQrData?.qr_code_base64"
                  :src="`data:image/png;base64,${payment.pixQrData.qr_code_base64}`"
                  alt="QR Code Pix"
                  class="h-48 w-48 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700"
                />
                <div v-else class="flex flex-col items-center justify-center gap-2 py-8 text-neutral-500">
                  <svg class="h-6 w-6 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  <span class="text-sm">Gerando QR Code do Pix...</span>
                </div>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                  Escaneie com o aplicativo do seu banco ou cole o codigo Pix abaixo.
                </p>
                <textarea
                  v-if="payment.pixQrData?.qr_code"
                  class="w-full rounded-lg border border-neutral-300 bg-white p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  rows="3"
                  readonly
                  :value="payment.pixQrData.qr_code"
                />
                <p v-else class="text-sm text-neutral-400">
                  O QR Code serÃ¡ exibido assim que a preferÃªncia de pagamento for criada.
                </p>
              </div>
            </section>

            <section v-if="!isPixPayment && !isManualPayment" class="space-y-3">`n              <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Checkout Mercado Pago</h2>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                Prefere cartÃ£o? Abra o checkout seguro do Mercado Pago em uma nova aba.
              </p>
              <button
                v-if="payment.initPoint"
                type="button"
                @click="handleOpenCheckout"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              >
                Abrir checkout
              </button>
              <p v-if="!isPaid" class="text-xs text-neutral-400">
                Assim que o pagamento for aprovado, o status muda automaticamente. Se jÃ¡ pagou, clique abaixo para verificar manualmente.
              </p>
              <button
                v-if="!isPaid"
                type="button"
                class="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400"
                :disabled="loadingStatus"
                @click="loadPayment(true)"
              >
                <span v-if="loadingStatus" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent" />
                <span>{{ loadingStatus ? "Atualizando..." : "Ja paguei, verificar status" }}</span>
              </button>
            </section>
          </template>
        </div>
        <div v-else-if="isFreeEvent" class="flex-1 space-y-6">
          <section class="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Nenhuma aÃ§Ã£o necessÃ¡ria</h2>
            <p class="mt-2">
              Suas inscriÃ§Ãµes estÃ£o confirmadas. Os recibos serÃ£o gerados automaticamente e vocÃª poderÃ¡ consultÃ¡-los na Ã¡rea de comprovantes.
            </p>
          </section>
        </div>
      </div>
    </BaseCard>

    <BaseCard v-if="isPaid">
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          {{ isFreeEvent ? "InscriÃ§Ãµes confirmadas" : "Pagamento confirmado" }}
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          {{
            isFreeEvent
              ? "Os recibos estÃ£o disponÃ­veis para consulta com o CPF e a data de nascimento dos participantes."
              : "Os recibos sÃ£o gerados automaticamente e podem ser consultados com o CPF e a data de nascimento dos participantes."
          }}
        </p>
        <RouterLink
          to="/comprovante"
          class="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Consultar comprovantes
        </RouterLink>
      </div>
    </BaseCard>

    <BaseCard v-if="payment">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Nova inscriÃ§Ã£o</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Limpamos os dados anteriores deste dispositivo. Clique abaixo para iniciar um novo preenchimento.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
          @click="handleStartNewRegistration"
        >
          Nova inscriÃ§Ã£o
        </button>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import JSZip from "jszip";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useEventStore } from "../../stores/event";
import { paymentMethodLabel } from "../../config/paymentMethods";
import { API_BASE_URL } from "../../config/api";
import { formatCurrency, formatDate } from "../../utils/format";
import { sanitizeFileName } from "../../utils/files";
import { REGISTRATION_STORAGE_KEY } from "../../config/storageKeys";

type PaymentReceiptLink = {
  registrationId: string;
  fullName: string;
  receiptUrl: string;
  resolvedUrl?: string;
};

type PaymentResponse = {
  preferenceId?: string;
  initPoint?: string;
  pixQrData?: {
    qr_code: string;
    qr_code_base64: string;
  };
  status?: string;
  statusDetail?: string;
  participantCount?: number;
  totalCents?: number;
  participants?: Array<{
    id: string;
    fullName: string;
    status: string;
  }>;
  isFree?: boolean;
  paymentMethod?: string;
  paidAt?: string | null;
  isManual?: boolean;
  receipts?: PaymentReceiptLink[];
  pixReactivated?: boolean;
};

const props = defineProps<{ slug: string; orderId: string }>();
const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();

type DownloadState = "idle" | "pending" | "done" | "failed";

const payment = ref<PaymentResponse | null>(null);
const loadingStatus = ref(false);
const pollHandle = ref<number | null>(null);

const PAID_STATUSES = new Set(["PAID", "APPROVED"]);
const isPaidStatus = (status?: string | null) => {
  if (!status) return false;
  return PAID_STATUSES.has(status.toUpperCase());
};

const receiptDownloadStorageKey = `order:${props.orderId}:receipts-downloaded`;
const readStoredReceiptState = (): DownloadState => {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return "idle";
  }
  try {
    return window.sessionStorage.getItem(receiptDownloadStorageKey) === "done" ? "done" : "idle";
  } catch {
    return "idle";
  }
};
const autoReceiptDownloadState = ref<DownloadState>(readStoredReceiptState());
const downloadingReceipts = ref(false);
const receiptDownloadError = ref("");
const apiBase = (() => {
  try {
    return new URL(API_BASE_URL, typeof window !== "undefined" ? window.location.origin : undefined);
  } catch {
    if (typeof window !== "undefined") {
      return new URL(window.location.origin);
    }
    const fallbackOrigin = import.meta.env.VITE_APP_URL ?? import.meta.env.VITE_API_URL;
    if (fallbackOrigin) {
      return new URL(fallbackOrigin);
    }
    throw new Error("Failed to resolve API base URL. Configure VITE_API_URL or VITE_APP_URL in the frontend .env.");
  }
})();

const resolveReceiptUrl = (target: string) => {
  try {
    return new URL(target, apiBase).toString();
  } catch {
    return target;
  }
};

const rawReceiptLinks = computed(() => payment.value?.receipts ?? []);
const receiptLinks = computed(() =>
  rawReceiptLinks.value.map((receipt) => ({
    ...receipt,
    resolvedUrl: resolveReceiptUrl(receipt.receiptUrl)
  }))
);
const hasReceiptLinks = computed(() => receiptLinks.value.length > 0);

const participantStatusMap = computed(() => {
  const map = new Map<string, string>();
  payment.value?.participants?.forEach((participant) => {
    map.set(participant.id, participant.status);
  });
  return map;
});

const receiptStatusLabel = (registrationId: string) =>
  formatParticipantStatus(participantStatusMap.value.get(registrationId) ?? "PAID");

const receiptStatusClass = (registrationId: string) =>
  participantStatusMap.value.get(registrationId) === "PAID"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-50"
    : "bg-amber-100 text-amber-700 dark:bg-amber-400/30 dark:text-amber-50";

const clearRegistrationDraftState = () => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  window.localStorage.removeItem(REGISTRATION_STORAGE_KEY);
};

const handleStartNewRegistration = () => {
  clearRegistrationDraftState();
  router.push({ name: "event", params: { slug: props.slug } });
};

const currentLotName = computed(() => eventStore.event?.currentLot?.name ?? null);
const participantCount = computed(
  () => payment.value?.participantCount ?? eventStore.lastOrder?.registrationIds.length ?? 1
);
const ticketPriceCents = computed(() => {
  if (payment.value?.totalCents != null) {
    const count = Math.max(participantCount.value, 1);
    return Math.round(payment.value.totalCents / count);
  }
  return eventStore.event?.currentPriceCents ?? eventStore.event?.priceCents ?? 0;
});
const isPaid = computed(() => isPaidStatus(payment.value?.status));
const isFreeEvent = computed(() => Boolean(payment.value?.isFree || eventStore.event?.isFree));

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_PAYMENT: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelada",
  REFUNDED: "Estornada",
  CHECKED_IN: "Check-in realizado"
};

const formatParticipantStatus = (status: string) => statusLabels[status] ?? status;

const pendingParticipants = computed(() =>
  payment.value?.participants?.filter((participant) => participant.status !== "PAID") ?? []
);

const isManualPayment = computed(() => Boolean(payment.value?.isManual));
const receiptsReady = computed(() => isPaid.value && hasReceiptLinks.value);
const receiptsGenerating = computed(() => isPaid.value && !hasReceiptLinks.value);

const paymentMethodName = computed(() => paymentMethodLabel(payment.value?.paymentMethod ?? null));

const manualInstructions = computed(() => {
  const method = payment.value?.paymentMethod;
  switch (method) {
    case "CASH":
      return "Dirija-se ao caixa indicado e informe o CPF utilizado na inscricao para concluir o pagamento.";
    case "CARD_FULL":
      return "O pagamento serÃ¡ efetuado presencialmente via mÃ¡quina de cartÃ£o. Lembre-se de levar um documento com foto.";
    case "CARD_INSTALLMENTS":
      return "O parcelamento Ã© realizado presencialmente e as taxas sÃ£o repassadas ao participante.";
    default:
      return "";
  }
});

const persistReceiptDownloadState = () => {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return;
  try {
    window.sessionStorage.setItem(receiptDownloadStorageKey, "done");
  } catch {
    // Silently ignore storage errors (private mode, etc).
  }
};

const buildReceiptFileName = (receipt: PaymentReceiptLink, index: number) => {
  const base = sanitizeFileName(receipt.fullName || `participante-${index + 1}`, "participante");
  return `${base}-${receipt.registrationId}.pdf`;
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  if (typeof window === "undefined") return;
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
};

const fetchReceiptBlob = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Falha ao baixar comprovante (${response.status})`);
  }
  return await response.blob();
};

const downloadSingleReceipt = async (receipt: PaymentReceiptLink, index: number) => {
  const blob = await fetchReceiptBlob(receipt.resolvedUrl ?? receipt.receiptUrl);
  triggerBlobDownload(blob, buildReceiptFileName(receipt, index));
};

const downloadReceiptArchive = async (receipts: PaymentReceiptLink[]) => {
  const zip = new JSZip();
  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index];
    const blob = await fetchReceiptBlob(receipt.resolvedUrl ?? receipt.receiptUrl);
    zip.file(buildReceiptFileName(receipt, index), blob);
  }
  const archiveName = `comprovantes-${sanitizeFileName(props.orderId, "pedido")}.zip`;
  const archive = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(archive, archiveName);
};

const downloadReceipts = async (mode: "auto" | "manual" = "manual") => {
  if (typeof window === "undefined" || !hasReceiptLinks.value) return false;
  downloadingReceipts.value = true;
  if (mode === "manual") {
    receiptDownloadError.value = "";
  }
  try {
    if (receiptLinks.value.length === 1) {
      await downloadSingleReceipt(receiptLinks.value[0], 0);
    } else {
      await downloadReceiptArchive(receiptLinks.value);
    }
    persistReceiptDownloadState();
    autoReceiptDownloadState.value = "done";
    return true;
  } catch (error) {
    console.error("Erro ao baixar comprovantes", error);
    receiptDownloadError.value =
      mode === "auto"
        ? "Tentamos baixar os comprovantes automaticamente, mas algo deu errado. Use o botÃ£o abaixo para tentar novamente."
        : "NÃ£o foi possÃ­vel baixar os comprovantes. Tente novamente.";
    return false;
  } finally {
    downloadingReceipts.value = false;
  }
};

const triggerAutoReceiptDownload = () => {
  if (autoReceiptDownloadState.value !== "idle" || !hasReceiptLinks.value) return;
  if (typeof window === "undefined") return;
  autoReceiptDownloadState.value = "pending";
  void downloadReceipts("auto").then((success) => {
    autoReceiptDownloadState.value = success ? "done" : "failed";
  });
};

const handleManualReceiptDownload = () => downloadReceipts("manual");

const handleSingleReceiptDownload = async (registrationId: string) => {
  if (!hasReceiptLinks.value || downloadingReceipts.value) return;
  const index = receiptLinks.value.findIndex((receipt) => receipt.registrationId === registrationId);
  if (index < 0) {
    receiptDownloadError.value = "NÃ£o encontramos este comprovante. Atualize a pÃ¡gina e tente novamente.";
    return;
  }
  downloadingReceipts.value = true;
  receiptDownloadError.value = "";
  try {
    await downloadSingleReceipt(receiptLinks.value[index], index);
  } catch (error) {
    console.error("Erro ao baixar comprovante individual", error);
    receiptDownloadError.value = "NÃ£o foi possÃ­vel baixar este comprovante. Tente novamente.";
  } finally {
    downloadingReceipts.value = false;
  }
};

const statusTitle = computed(() => {
  if (isFreeEvent.value) return "InscriÃ§Ãµes confirmadas";
  if (isManualPayment.value) {
    if (isPaid.value) return "Pagamento registrado";
    return "Pagamento pendente de confirmaÃ§Ã£o";
  }
  if (isPaid.value) return "Pagamento aprovado";
  if (payment.value?.status === "CANCELED") return "Pagamento cancelado";
  return "Aguardando confirmaÃ§Ã£o";
});

const statusMessage = computed(() => {
  if (isFreeEvent.value) {
    return "Este evento Ã© gratuito. Suas inscriÃ§Ãµes foram confirmadas automaticamente, sem necessidade de pagamento.";
  }
  if (isManualPayment.value) {
    if (isPaid.value) {
      return "Pagamento registrado pela tesouraria. As inscriÃ§Ãµes estÃ£o confirmadas.";
    }
    return "Apresente este comprovante na tesouraria para concluir o pagamento. Assim que o recebimento for registrado, atualizaremos automaticamente.";
  }
  if (isPaid.value) {
    return "Tudo certo! As inscriÃ§Ãµes foram confirmadas e os recibos serÃ£o disponibilizados em instantes.";
  }
  if (payment.value?.status === "CANCELED") {
    return "O pagamento foi cancelado pelo Mercado Pago. Gere um novo checkout para tentar novamente.";
  }
  return "Estamos monitorando o Mercado Pago. Assim que o pagamento for aprovado, atualizaremos automaticamente.";
});

const isPixPayment = computed(() => payment.value?.paymentMethod === "PIX_MP");
const pixWasReactivated = computed(() => Boolean(payment.value?.pixReactivated));

const statusIcon = computed(() => {
  if (isFreeEvent.value || isPaid.value) return "OK";
  if (isManualPayment.value) return "..";
  if (payment.value?.status === "CANCELED") return "X";
  return "..";
});

const statusStyles = computed(() => {
  if (isFreeEvent.value || isPaid.value) {
    return {
      container: "border-primary-200 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-500/10",
      badge: "bg-primary-600"
    };
  }
  if (isManualPayment.value) {
    return {
      container: "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/60",
      badge: "bg-neutral-900"
    };
  }
  if (payment.value?.status === "CANCELED") {
    return {
      container: "border-black/60 bg-black text-white dark:border-white/20 dark:bg-black",
      badge: "bg-black"
    };
  }
  return {
    container: "border-primary-100 bg-white dark:border-primary-900/40 dark:bg-neutral-950/60",
    badge: "bg-primary-500"
  };
});

const totalFormatted = computed(() => {
  if (isFreeEvent.value) {
    return "Gratuito";
  }
  if (payment.value?.totalCents != null) {
    return formatCurrency(payment.value.totalCents);
  }
  return formatCurrency(ticketPriceCents.value * participantCount.value);
});

const loadPayment = async (force = false) => {
  try {
    loadingStatus.value = true;
    const response = await eventStore.getPaymentData(props.orderId);
    payment.value = response;
    if (payment.value && typeof payment.value.participantCount !== "number") {
      payment.value.participantCount = eventStore.lastOrder?.registrationIds.length ?? 1;
    }
  } catch (error) {
    console.error("Erro ao carregar pagamento", error);
  } finally {
    loadingStatus.value = false;
    if (force && !isPaid.value) {
      startPolling();
    }
  }
};

const copyPixCode = async () => {
  if (!payment.value?.pixQrData?.qr_code) return;
  await navigator.clipboard.writeText(payment.value.pixQrData.qr_code);
  alert("Codigo Pix copiado!");
};

// FunÃ§Ã£o para abrir checkout - garante que apenas este pedido seja processado
const handleOpenCheckout = () => {
  // Garantir que temos o initPoint para APENAS este pedido especÃ­fico
  if (!payment.value?.initPoint) {
    console.error("initPoint nÃ£o disponÃ­vel para o pedido", props.orderId);
    return;
  }
  
  // Usar APENAS o initPoint do pagamento atual, que foi gerado para props.orderId
  // NÃ£o usar nenhum estado compartilhado ou seleÃ§Ã£o de outros pedidos
  const singleOrderInitPoint = payment.value.initPoint;
  
  // Abrir em nova aba o checkout para APENAS este pedido
  window.open(singleOrderInitPoint, "_blank", "noopener,noreferrer");
};

const startPolling = () => {
  stopPolling();
  pollHandle.value = window.setInterval(async () => {
    await loadPayment();
    if (isPaid.value || payment.value?.status === "CANCELED") {
      stopPolling();
      // Se foi pago, recarregar a pÃ¡gina apÃ³s 2 segundos para mostrar confirmaÃ§Ã£o
      if (isPaid.value) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  }, 5000); // Verificar a cada 5 segundos (mais frequente)
};

const stopPolling = () => {
  if (pollHandle.value) {
    clearInterval(pollHandle.value);
    pollHandle.value = null;
  }
};

watch(
  () => ({
    status: payment.value?.status,
    receiptCount: receiptLinks.value.length
  }),
  ({ status, receiptCount }) => {
    if (isPaidStatus(status) && receiptCount > 0) {
      triggerAutoReceiptDownload();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  clearRegistrationDraftState();
  if (!eventStore.event || eventStore.event.slug !== props.slug) {
    await eventStore.fetchEvent(props.slug);
  }
  await loadPayment();
  if (!payment.value || !isPaidStatus(payment.value.status)) {
    startPolling();
  }
  if (route.query.fresh) {
    setTimeout(() => loadPayment(true), 15000);
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>



