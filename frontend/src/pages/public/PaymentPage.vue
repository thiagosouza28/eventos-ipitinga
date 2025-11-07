<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="space-y-3">
        <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Pagamento do pedido</h1>
        <p class="text-neutral-500 dark:text-neutral-400">
          {{
            isFreeEvent
              ? "Este evento é gratuito. As inscrições foram confirmadas automaticamente e nenhum pagamento é necessário."
              : "Conclua o pagamento para garantir as inscrições. Assim que o Mercado Pago aprovar, atualizamos tudo automaticamente."
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
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Valor por inscrição</span>
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
                    class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                  >
                    {{ formatParticipantStatus(participant.status) }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="!isFreeEvent" class="flex-1 space-y-6">
          <section
            v-if="isManualPayment"
            class="space-y-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300"
          >
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Pagamento manual</h2>
            <p>
              Forma selecionada: <strong>{{ paymentMethodName }}</strong>.
              Apresente o comprovante desta inscricao para a tesouraria e realize o pagamento do valor total informado acima.
            </p>
            <p v-if="manualInstructions" class="text-neutral-500 dark:text-neutral-400">
              {{ manualInstructions }}
            </p>
            <p class="text-xs text-neutral-400 dark:text-neutral-500">
              Após a confirmação pela tesouraria, este painel será atualizado automaticamente.
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
                  O QR Code será exibido assim que a preferência de pagamento for criada.
                </p>
              </div>
            </section>

            <section v-if="!isPixPayment && !isManualPayment" class="space-y-3">`n              <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Checkout Mercado Pago</h2>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                Prefere cartão? Abra o checkout seguro do Mercado Pago em uma nova aba.
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
                Assim que o pagamento for aprovado, o status muda automaticamente. Se já pagou, clique abaixo para verificar manualmente.
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
        <div v-else class="flex-1 space-y-6">
          <section class="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Nenhuma acao necessaria</h2>
            <p class="mt-2">
              Suas inscrições estão confirmadas. Os recibos serão gerados automaticamente e você poderá consultá-los na área de comprovantes.
            </p>
          </section>
        </div>
      </div>
    </BaseCard>

    <BaseCard v-if="isPaid">
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          {{ isFreeEvent ? "Inscricoes confirmadas" : "Pagamento confirmado" }}
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          {{
            isFreeEvent
              ? "Os recibos estao disponiveis para consulta com o CPF e a data de nascimento dos participantes."
              : "Os recibos são gerados automaticamente e podem ser consultados com o CPF e a data de nascimento dos participantes."
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useEventStore } from "../../stores/event";
import { paymentMethodLabel } from "../../config/paymentMethods";
import { formatCurrency, formatDate } from "../../utils/format";

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
};

const props = defineProps<{ slug: string; orderId: string }>();
const route = useRoute();
const eventStore = useEventStore();

const payment = ref<PaymentResponse | null>(null);
const loadingStatus = ref(false);
const pollHandle = ref<number | null>(null);

const ticketPriceCents = computed(
  () => eventStore.event?.currentPriceCents ?? eventStore.event?.priceCents ?? 0
);
const currentLotName = computed(() => eventStore.event?.currentLot?.name ?? null);
const participantCount = computed(
  () => payment.value?.participantCount ?? eventStore.lastOrder?.registrationIds.length ?? 1
);
const isPaid = computed(() => payment.value?.status === "PAID");
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

const paymentMethodName = computed(() => paymentMethodLabel(payment.value?.paymentMethod ?? null));

const manualInstructions = computed(() => {
  const method = payment.value?.paymentMethod;
  switch (method) {
    case "CASH":
      return "Dirija-se ao caixa indicado e informe o CPF utilizado na inscricao para concluir o pagamento.";
    case "CARD_FULL":
      return "O pagamento será efetuado presencialmente via máquina de cartão. Lembre-se de levar um documento com foto.";
    case "CARD_INSTALLMENTS":
      return "O parcelamento e realizado presencialmente e as taxas sao repassadas ao participante.";
    default:
      return "";
  }
});

const statusTitle = computed(() => {
  if (isFreeEvent.value) return "Inscricoes confirmadas";
  if (isManualPayment.value) {
    if (payment.value?.status === "PAID") return "Pagamento registrado";
    return "Pagamento pendente de confirmação";
  }
  if (payment.value?.status === "PAID") return "Pagamento aprovado";
  if (payment.value?.status === "CANCELED") return "Pagamento cancelado";
  return "Aguardando confirmação";
});

const statusMessage = computed(() => {
  if (isFreeEvent.value) {
    return "Este evento e gratuito. Suas inscricoes foram confirmadas automaticamente, sem necessidade de pagamento.";
  }
  if (isManualPayment.value) {
    if (payment.value?.status === "PAID") {
      return "Pagamento registrado pela tesouraria. As inscricoes estao confirmadas.";
    }
    return "Apresente este comprovante na tesouraria para concluir o pagamento. Assim que o recebimento for registrado, atualizaremos automaticamente.";
  }
  if (payment.value?.status === "PAID") {
    return "Tudo certo! As inscricoes foram confirmadas e os recibos serao disponibilizados em instantes.";
  }
  if (payment.value?.status === "CANCELED") {
    return "O pagamento foi cancelado pelo Mercado Pago. Gere um novo checkout para tentar novamente.";
  }
  return "Estamos monitorando o Mercado Pago. Assim que o pagamento for aprovado, atualizaremos automaticamente.";
});

const isPixPayment = computed(() => payment.value?.paymentMethod === "PIX_MP");

const statusIcon = computed(() => {
  if (isFreeEvent.value || payment.value?.status === "PAID") return "OK";
  if (isManualPayment.value) return "..";
  if (payment.value?.status === "CANCELED") return "X";
  return "..";
});

const statusStyles = computed(() => {
  if (isFreeEvent.value || payment.value?.status === "PAID") {
    return {
      container: "border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10",
      badge: "bg-green-500"
    };
  }
  if (isManualPayment.value) {
    return {
      container: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
      badge: "bg-amber-500"
    };
  }
  if (payment.value?.status === "CANCELED") {
    return {
      container: "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10",
      badge: "bg-red-500"
    };
  }
  return {
    container: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
    badge: "bg-amber-500"
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
    if (force && payment.value?.status !== "PAID") {
      startPolling();
    }
  }
};

const copyPixCode = async () => {
  if (!payment.value?.pixQrData?.qr_code) return;
  await navigator.clipboard.writeText(payment.value.pixQrData.qr_code);
  alert("Codigo Pix copiado!");
};

// Função para abrir checkout - garante que apenas este pedido seja processado
const handleOpenCheckout = () => {
  // Garantir que temos o initPoint para APENAS este pedido específico
  if (!payment.value?.initPoint) {
    console.error("initPoint não disponível para o pedido", props.orderId);
    return;
  }
  
  // Usar APENAS o initPoint do pagamento atual, que foi gerado para props.orderId
  // Não usar nenhum estado compartilhado ou seleção de outros pedidos
  const singleOrderInitPoint = payment.value.initPoint;
  
  // Abrir em nova aba o checkout para APENAS este pedido
  window.open(singleOrderInitPoint, "_blank", "noopener,noreferrer");
};

const startPolling = () => {
  stopPolling();
  pollHandle.value = window.setInterval(async () => {
    await loadPayment();
    if (payment.value?.status === "PAID" || payment.value?.status === "CANCELED") {
      stopPolling();
      // Se foi pago, recarregar a página após 2 segundos para mostrar confirmação
      if (payment.value?.status === "PAID") {
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

onMounted(async () => {
  if (!eventStore.event || eventStore.event.slug !== props.slug) {
    await eventStore.fetchEvent(props.slug);
  }
  await loadPayment();
  if (!payment.value || payment.value.status !== "PAID") {
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




