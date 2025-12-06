<template>
  <div class="px-4 py-10 lg:py-16">
    <div class="mx-auto w-full max-w-5xl space-y-6">
      <BaseCard
        class="border border-white/20 bg-gradient-to-br from-white/90 via-primary-50/40 to-primary-100/30 shadow-xl dark:border-white/10 dark:from-neutral-900/80 dark:via-neutral-900/40 dark:to-primary-950/30"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.4em] text-primary-600 dark:text-primary-300">
              Central do participante
            </p>
            <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">
              Pagamentos pendentes
            </h1>
            <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              Consulte boletos e links em aberto e quite quantos precisar em uma única etapa.
            </p>
          </div>
          <button
            type="button"
            :class="[primaryButtonClass, 'px-5 py-2 text-sm']"
            @click="$router.back()"
          >
            Voltar
          </button>
        </div>
      </BaseCard>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>

      <!-- Formulário de CPF -->
      <BaseCard
        v-if="showCpfForm && !loading"
        class="border border-white/30 bg-white/90 shadow-2xl dark:border-white/10 dark:bg-white/5"
      >
        <h2 class="text-lg font-semibold text-neutral-800 dark:text-white">
          Informe o CPF para consultar pagamentos pendentes
        </h2>
        <form @submit.prevent="handleCpfSubmit" class="mt-5 space-y-6">
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300">
              CPF
            </label>
            <input
              id="cpf-input"
              ref="cpfInputRef"
              :value="cpfInput"
              type="text"
              placeholder="000.000.000-00"
              class="w-full rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
              :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-200': cpfError }"
              @input="handleCpfInput"
            />
            <p v-if="cpfError" class="text-sm text-red-600 dark:text-red-300">
              {{ cpfError }}
            </p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              :class="[primaryButtonClass, 'w-full sm:w-auto px-6 py-2 text-sm']"
              :disabled="!isCpfInputValid"
            >
              Consultar
            </button>
            <RouterLink
              to="/"
              :class="[primaryButtonClass, 'w-full sm:w-auto px-6 py-2 text-sm text-center']"
            >
              Voltar
            </RouterLink>
          </div>
        </form>
      </BaseCard>

      <BaseCard
        v-if="error && !loading && !showCpfForm"
        class="border border-red-200/60 bg-red-50/90 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
      >
        {{ error }}
      </BaseCard>

      <BaseCard
        v-if="!showCpfForm && !loading && !error && pendingOrders.length === 0"
        class="border border-white/10 bg-white/80 text-center text-neutral-600 dark:border-white/5 dark:bg-neutral-900/60 dark:text-neutral-300"
      >
        Não há pagamentos pendentes no momento.
      </BaseCard>

      <BaseCard
        v-if="!showCpfForm && !loading && pendingOrders.length > 0"
        class="border border-white/10 bg-white/85 shadow-xl dark:border-white/5 dark:bg-neutral-900/60"
      >
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Selecione um ou mais pagamentos pendentes para quitar
        </p>
        <div class="mt-6 space-y-5">
          <div
            v-for="order in pendingOrders"
            :key="order.orderId"
            class="flex flex-col gap-4 rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 dark:border-white/5 dark:bg-neutral-900/80 md:flex-row md:items-start md:gap-5"
          >
            <input
              type="checkbox"
              :checked="selectedOrders.includes(order.orderId)"
              @change="toggleOrder(order.orderId)"
              class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 md:mt-1"
            />

            <div class="flex-1 space-y-4">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    {{ order.event?.title || "Evento" }}
                  </h3>
                  <p class="text-sm text-neutral-500 dark:text-neutral-400">
                    Responsável: {{ formatCPF(order.buyerCpf) }}
                  </p>
                </div>
                <span class="text-base font-semibold text-primary-700 dark:text-primary-300">
                  {{ formatCurrency(order.totalCents) }}
                </span>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300 mb-2">
                  Participantes
                </p>
                <ul class="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <li
                    v-for="reg in order.registrations"
                    :key="reg.id"
                    class="rounded-xl border border-neutral-200/40 bg-white/80 px-3 py-2 dark:border-white/5 dark:bg-white/5"
                  >
                    <p class="font-medium text-neutral-800 dark:text-white">
                      {{ reg.fullName }} ({{ formatCPF(reg.cpf) }})
                    </p>
                    <p class="text-xs text-neutral-500 dark:text-neutral-400">
                      {{ reg.districtName }} - {{ reg.churchName }}
                    </p>
                  </li>
                </ul>
              </div>

              <div class="flex flex-wrap gap-3">
                <button
                  v-if="order.event?.slug"
                  type="button"
                  :class="[primaryButtonClass, 'px-5 py-2 text-sm']"
                  @click.stop.prevent="handleIndividualPayment(order.orderId, order.event.slug, $event)"
                >
                  Pagar individualmente
                </button>
                <span v-else class="text-sm text-neutral-500 dark:text-neutral-400">
                  Carregando informações do evento...
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="selectedOrders.length > 0"
          class="mt-8 flex flex-col gap-4 rounded-2xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-500/30 dark:bg-primary-900/20 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">
              {{ selectedOrders.length }} pedido(s) selecionado(s)
            </p>
            <p class="text-xs text-primary-700 dark:text-primary-200">
              Total: {{ formatCurrency(selectedTotal) }}
            </p>
          </div>
          <button
            type="button"
            :class="[primaryButtonClass, 'px-6 py-2 text-sm']"
            :disabled="selectedOrders.length === 0 || processing"
            @click="handlePayment"
          >
            <span v-if="processing" class="flex items-center gap-2">
              <span class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Processando...
            </span>
            <span v-else>
              {{ selectedOrders.length === 1 ? "Pagar pedido" : "Pagar selecionados" }}
            </span>
          </button>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useApi } from "../../composables/useApi";
import { formatCurrency } from "../../utils/format";
import { formatCPF, validateCPF, normalizeCPF } from "../../utils/cpf";
import BaseCard from "../../components/ui/BaseCard.vue";

const props = defineProps<{
  cpf?: string;
}>();

const router = useRouter();
const route = useRoute();
const { api } = useApi();
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60";

interface Registration {
  id: string;
  fullName: string;
  cpf: string;
  churchName: string;
  districtName: string;
}

interface PendingOrder {
  orderId: string;
  event?: {
    id: string;
    title: string;
    slug?: string;
  };
  buyerCpf: string;
  totalCents: number;
  expiresAt: string;
  registrations: Registration[];
  payment: {
    status?: string;
    paymentMethod?: string;
    initPoint?: string;
    paidAt?: string | null;
  } | null;
}

const loading = ref(true);
const error = ref("");
const processing = ref(false);
const pendingOrders = ref<PendingOrder[]>([]);
const selectedOrders = ref<string[]>([]);
const pollHandle = ref<number | null>(null);

// Estado do formulário de CPF
const cpfInput = ref("");
const cpfInputRef = ref<HTMLInputElement | null>(null);
const cpfError = ref("");
const showCpfForm = ref(false);

const isCpfInputValid = computed(() => {
  const digits = normalizeCPF(cpfInput.value);
  // Habilita o botão quando tem 11 dígitos (validação completa será feita no submit)
  return digits.length === 11;
});

const selectedTotal = computed(() => {
  return pendingOrders.value
    .filter((order) => selectedOrders.value.includes(order.orderId))
    .reduce((sum, order) => sum + order.totalCents, 0);
});

const toggleOrder = (orderId: string) => {
  const index = selectedOrders.value.indexOf(orderId);
  if (index === -1) {
    selectedOrders.value.push(orderId);
  } else {
    selectedOrders.value.splice(index, 1);
  }
};

// Função para pagamento individual - processa APENAS o pedido específico
// N�fO usa selectedOrders, processa diretamente o orderId passado
const handleIndividualPayment = async (orderId: string, eventSlug?: string, domEvent?: Event) => {
  // Prevenir qualquer propagação de evento que possa interferir
  if (domEvent) {
    domEvent.stopPropagation();
    domEvent.preventDefault();
  }
  
  // IMPORTANTE: Limpar TODA seleção ANTES de fazer qualquer coisa
  // Isso garante que nenhum outro pedido seja processado
  selectedOrders.value = [];
  
  // Usar apenas o orderId passado como parâmetro
  // N�fO usar selectedOrders.value de forma alguma
  const singleOrderId = String(orderId); // Garantir que usamos apenas este ID como string
  
  // Aguardar nextTick para garantir que a limpeza de selectedOrders seja processada
  // antes de redirecionar
  await nextTick();
  
  // Redirecionar usando APENAS o orderId passado, ignorando completamente selectedOrders
    if (!eventSlug) {
      error.value = "O evento não está disponível no momento.";
      return;
    }

    router.push({
      name: "payment",
      params: {
        slug: eventSlug,
      orderId: singleOrderId  // Apenas este pedido específico, NUNCA selectedOrders
    }
  });
};

// Função para pagamento em lote - processa apenas os pedidos selecionados
// Esta função é chamada APENAS pelo botão "Pagar selecionados" na parte inferior
const handlePayment = async () => {
  if (selectedOrders.value.length === 0) return;

  processing.value = true;
  error.value = "";
  
  try {
    // Se houver apenas um pedido selecionado, redirecionar para pagamento individual
    // Mas limpar a seleção ANTES para garantir que não haja conflito
    if (selectedOrders.value.length === 1) {
      const orderIdToProcess = selectedOrders.value[0]; // Pegar o ID antes de limpar
      const order = pendingOrders.value.find(o => o.orderId === orderIdToProcess);
      
      // LIMPAR seleção ANTES de processar
      selectedOrders.value = [];
      
      if (order && order.event?.slug) {
        router.push({
          name: "payment",
          params: {
            slug: order.event.slug,
            orderId: orderIdToProcess  // Usar o ID já capturado, não selectedOrders
          }
        });
        return;
      } else if (order && !order.event?.slug) {
        error.value = "Não foi possível carregar as informações do evento. Tente novamente.";
        return;
      }
    }

    // Para múltiplos pedidos, criar pagamento em lote
    // Capturar os IDs ANTES de limpar a seleção
    const orderIdsToProcess = [...selectedOrders.value]; // Criar cópia para garantir
    
    // LIMPAR seleção ANTES de processar para evitar conflitos
    selectedOrders.value = [];
    
    const response = await api.post("/orders/bulk-payment", {
      orderIds: orderIdsToProcess,  // Usar apenas os IDs capturados antes de limpar
      paymentMethod: "MERCADO_PAGO"
    });

    // Seleção já foi limpa acima, não precisa limpar novamente

    // Redirecionar diretamente para o Mercado Pago se houver initPoint
    if (response.data.initPoint) {
      window.location.href = response.data.initPoint;
    } else if (response.data.pixQrData?.qr_code) {
      // Se houver QR code PIX, mostrar na mesma página
      // Por enquanto, redirecionar para initPoint mesmo que seja sandbox
      if (response.data.sandboxInitPoint) {
        window.location.href = response.data.sandboxInitPoint;
      } else {
        error.value = "Erro ao redirecionar para pagamento. Tente novamente.";
      }
    } else {
      error.value = "Erro ao processar pagamento. Tente novamente.";
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.message;
    error.value = errorMessage ?? "Não foi possível processar o pagamento. Tente novamente.";
    showCpfForm.value = false; // Manter a lista visível para o usuário tentar novamente
  } finally {
    processing.value = false;
  }
};

const loadPendingOrders = async (cpf: string) => {
  loading.value = true;
  error.value = "";
  cpfError.value = "";
  
  try {
    const response = await api.get("/admin/orders/pending", {
      params: { cpf: cpf.trim() }
    });
    
    // Mapear os dados retornados para o formato esperado
    const orders = response.data.orders ?? [];
    
    // Buscar todos os eventos públicos para mapear IDs para slugs
    let eventsMap: Record<string, string> = {};
    try {
      const eventsResponse = await api.get("/events");
      eventsResponse.data.forEach((event: any) => {
        eventsMap[event.id] = event.slug;
      });
    } catch (err) {
      console.error("Erro ao buscar eventos:", err);
    }
    
    pendingOrders.value = orders.map((order: any) => ({
      orderId: order.id,
      event: order.event ? {
        id: order.event.id,
        title: order.event.title,
        slug: eventsMap[order.event.id] || ""
      } : undefined,
      buyerCpf: order.buyerCpf,
      totalCents: order.totalCents,
      expiresAt: order.expiresAt,
      registrations: (order.registrations || []).map((reg: any) => ({
        id: reg.id,
        fullName: reg.fullName,
        cpf: reg.cpf,
        churchName: reg.church?.name || reg.churchName || "",
        districtName: reg.district?.name || reg.districtName || ""
      })),
      payment: order.payment ? {
        status: order.payment.status,
        paymentMethod: order.payment.paymentMethod,
        initPoint: order.payment.initPoint,
        paidAt: order.payment.paidAt || null
      } : null
    }));
    
    // Esconder o formulário quando os dados são carregados com sucesso
    // para mostrar a lista de pendências
    showCpfForm.value = false;
    
    // Iniciar polling para detectar pagamentos automaticamente
    // Usando o mesmo método da PaymentPage (inicia polling se não está pago)
    if (pendingOrders.value.length > 0) {
      // Verificar se algum pedido já está pago antes de iniciar polling
      const hasUnpaidOrders = pendingOrders.value.some(
        order => order.payment?.status !== "PAID"
      );
      if (hasUnpaidOrders) {
        startPolling();
      }
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.message;
    if (errorMessage && errorMessage.includes("Dados inválidos")) {
      error.value = "CPF inválido. Por favor, verifique o CPF informado.";
      showCpfForm.value = true; // Mostrar formulário em caso de erro
    } else {
      error.value = errorMessage ?? "Não foi possível carregar as pendências. Tente novamente.";
      showCpfForm.value = true; // Mostrar formulário em caso de erro
    }
  } finally {
    loading.value = false;
  }
};

const handleCpfInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value.replace(/\D/g, "");
  const formattedValue = formatCPF(rawValue);
  
  // Atualizar o valor reativo
  cpfInput.value = formattedValue;
  cpfError.value = "";
};

const handleCpfSubmit = async () => {
  cpfError.value = "";
  error.value = "";
  
  const digits = normalizeCPF(cpfInput.value);
  
  if (digits.length !== 11 || !validateCPF(digits)) {
    cpfError.value = "CPF inválido. Por favor, informe um CPF válido.";
    return;
  }
  
  // Carregar as pendências diretamente
  await loadPendingOrders(digits);
};

// Carregar pendências ao montar o componente se CPF foi fornecido
onMounted(async () => {
  const providedCpf = props.cpf?.trim();
  if (providedCpf && providedCpf.length > 0) {
    // Sempre pré-preencher o campo de CPF formatado quando vier da primeira tela
    const normalizedCpf = normalizeCPF(providedCpf);
    if (normalizedCpf.length === 11) {
      // CPF completo - formatar, mostrar no campo e carregar dados
      cpfInput.value = formatCPF(normalizedCpf);
      showCpfForm.value = true; // Mostrar o formulário para o usuário ver o CPF pré-preenchido
      await loadPendingOrders(providedCpf);
      
      // Se voltou do Mercado Pago (há query params como status, payment_id, etc), 
      // verificar pagamentos imediatamente usando o mesmo método da PaymentPage
      if (route.query.status || route.query.payment_id || route.query.preference_id) {
        // Aguardar 2 segundos para o webhook processar (igual à PaymentPage)
        setTimeout(async () => {
          // Verificar todos os pedidos usando o mesmo método da PaymentPage
          const ordersToRemove: string[] = [];
          
          for (const order of pendingOrders.value) {
            const paymentData = await checkOrderPayment(order.orderId);
            if (paymentData && (paymentData.status === "PAID" || paymentData.status === "CANCELED")) {
              ordersToRemove.push(order.orderId);
            }
          }
          
          // Remover pedidos pagos (dar baixa simultaneamente para pagamentos em lote)
          if (ordersToRemove.length > 0) {
            pendingOrders.value = pendingOrders.value.filter(
              order => !ordersToRemove.includes(order.orderId)
            );
            selectedOrders.value = selectedOrders.value.filter(
              orderId => !ordersToRemove.includes(orderId)
            );
            
            // Se ainda há pedidos pendentes, recarregar a lista completa
            if (pendingOrders.value.length > 0) {
              await loadPendingOrders(providedCpf);
            }
          } else {
            // Se não encontrou pagamentos, recarregar a lista para garantir
            await loadPendingOrders(providedCpf);
          }
        }, 2000); // Aguardar 2 segundos (igual à PaymentPage)
        
        // Verificar novamente após mais tempo (igual à PaymentPage com query.fresh)
        setTimeout(async () => {
          const ordersToRemove: string[] = [];
          
          for (const order of pendingOrders.value) {
            const paymentData = await checkOrderPayment(order.orderId);
            if (paymentData && (paymentData.status === "PAID" || paymentData.status === "CANCELED")) {
              ordersToRemove.push(order.orderId);
            }
          }
          
          if (ordersToRemove.length > 0) {
            pendingOrders.value = pendingOrders.value.filter(
              order => !ordersToRemove.includes(order.orderId)
            );
            selectedOrders.value = selectedOrders.value.filter(
              orderId => !ordersToRemove.includes(orderId)
            );
            
            if (pendingOrders.value.length > 0) {
              await loadPendingOrders(providedCpf);
            }
          }
        }, 5000); // Aguardar 5 segundos para garantir
      }
    } else if (normalizedCpf.length > 0) {
      // CPF parcial - apenas formatar e mostrar formulário
      cpfInput.value = formatCPF(providedCpf);
      showCpfForm.value = true;
      loading.value = false;
    } else {
      // CPF vazio ou inválido
      loading.value = false;
      showCpfForm.value = true;
    }
  } else {
    loading.value = false;
    showCpfForm.value = true;
  }
});

// Observar mudanças na prop cpf (quando navega com CPF)
watch(() => props.cpf, async (newCpf, oldCpf) => {
  // Só atualizar se o CPF realmente mudou
  if (newCpf && typeof newCpf === "string" && newCpf.trim().length > 0 && newCpf !== oldCpf) {
    // Atualizar o campo de input quando o CPF mudar
    const normalizedCpf = normalizeCPF(newCpf);
    if (normalizedCpf.length === 11) {
      cpfInput.value = formatCPF(normalizedCpf);
      showCpfForm.value = false;
      await loadPendingOrders(newCpf);
    } else if (normalizedCpf.length > 0) {
      // CPF parcial - apenas formatar
      cpfInput.value = formatCPF(newCpf);
      showCpfForm.value = true;
    }
  }
}, { immediate: false });

// Função para verificar pagamento de um pedido - usando EXATAMENTE o mesmo método da PaymentPage
const checkOrderPayment = async (orderId: string) => {
  try {
    // Usar exatamente o mesmo endpoint e método da PaymentPage
    const response = await api.get(`/payments/order/${orderId}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao verificar pagamento do pedido ${orderId}:`, error);
    return null;
  }
};

// Polling para detectar pagamentos automaticamente - usando EXATAMENTE o mesmo método da PaymentPage
const startPolling = () => {
  stopPolling();
  
  // Só fazer polling se houver pedidos pendentes
  if (pendingOrders.value.length === 0) {
    return;
  }
  
  pollHandle.value = window.setInterval(async () => {
    // Verificar cada pedido individualmente usando o mesmo método da PaymentPage
    const ordersToRemove: string[] = [];
    
    // Verificar todos os pedidos pendentes
    for (const order of pendingOrders.value) {
      // Usar exatamente o mesmo método da PaymentPage (loadPayment)
      const paymentData = await checkOrderPayment(order.orderId);
      
      if (paymentData) {
        // Se o pagamento foi aprovado, marcar para remover da lista
        if (paymentData.status === "PAID" || paymentData.status === "CANCELED") {
          ordersToRemove.push(order.orderId);
        } else if (paymentData.status !== order.payment?.status) {
          // Atualizar o status do pedido se mudou
          const orderIndex = pendingOrders.value.findIndex(o => o.orderId === order.orderId);
          if (orderIndex !== -1) {
            pendingOrders.value[orderIndex].payment = {
              ...pendingOrders.value[orderIndex].payment,
              status: paymentData.status,
              paymentMethod: paymentData.paymentMethod,
              paidAt: paymentData.paidAt || null
            };
          }
        }
      }
    }
    
    // Remover pedidos pagos da lista (dar baixa simultaneamente para pagamentos em lote)
    if (ordersToRemove.length > 0) {
      pendingOrders.value = pendingOrders.value.filter(
        order => !ordersToRemove.includes(order.orderId)
      );
      
      // Limpar seleção de pedidos removidos
      selectedOrders.value = selectedOrders.value.filter(
        orderId => !ordersToRemove.includes(orderId)
      );
      
      // Se não há mais pedidos pendentes, parar o polling
      if (pendingOrders.value.length === 0) {
        stopPolling();
      }
    }
  }, 5000); // Verificar a cada 5 segundos (igual à PaymentPage)
};

const stopPolling = () => {
  if (pollHandle.value) {
    clearInterval(pollHandle.value);
    pollHandle.value = null;
  }
};

// Observar mudanças na lista de pedidos para iniciar/parar polling
watch(() => pendingOrders.value.length, (newLength, oldLength) => {
  if (newLength > 0 && oldLength === 0) {
    // Pedidos foram carregados, iniciar polling
    startPolling();
  } else if (newLength === 0 && oldLength > 0) {
    // Não há mais pedidos, parar polling
    stopPolling();
  }
});

// Limpar polling ao desmontar componente
onUnmounted(() => {
  stopPolling();
});
</script>

