<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
        Pagamentos pendentes
      </h1>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md"
        @click="$router.back()"
      >
        Voltar
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
    </div>

    <!-- Formulário de CPF - sempre mostrar quando não há dados carregados ou quando há CPF pré-preenchido -->
    <div v-if="showCpfForm && !loading" class="p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
      <h2 class="text-lg font-medium text-neutral-800 dark:text-neutral-100 mb-4">
        Informe o CPF para consultar pagamentos pendentes
      </h2>
      <form @submit.prevent="handleCpfSubmit" class="space-y-4">
        <div>
          <label for="cpf-input" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            CPF
          </label>
          <input
            id="cpf-input"
            ref="cpfInputRef"
            :value="cpfInput"
            type="text"
            placeholder="000.000.000-00"
            class="block w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            :class="{ 'border-red-500': cpfError }"
            @input="handleCpfInput"
          />
          <p v-if="cpfError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ cpfError }}</p>
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            :disabled="!isCpfInputValid"
          >
            Consultar
          </button>
          <RouterLink
            to="/"
            class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md"
          >
            Voltar
          </RouterLink>
        </div>
      </form>
    </div>

    <div v-if="error && !loading && !showCpfForm" class="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
      {{ error }}
    </div>

    <div v-if="!showCpfForm && !loading && !error && pendingOrders.length === 0" class="p-4 text-center">
      <p class="text-neutral-600 dark:text-neutral-400">
        Não há pagamentos pendentes no momento.
      </p>
    </div>

    <template v-if="!showCpfForm && !loading && pendingOrders.length > 0">
      <div class="mb-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Selecione um ou mais pagamentos pendentes para quitar
        </p>
      </div>

      <div class="space-y-4">
        <div
          v-for="order in pendingOrders"
          :key="order.orderId"
          class="flex items-start gap-4 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-sm"
        >
          <input
            type="checkbox"
            :checked="selectedOrders.includes(order.orderId)"
            @change="toggleOrder(order.orderId)"
            class="mt-1"
          />

          <div class="flex-1">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-medium text-neutral-800 dark:text-neutral-100">
                  {{ order.event?.title || "Evento" }}
                </h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">
                  Responsável: {{ formatCPF(order.buyerCpf) }}
                </p>
              </div>
              <span class="font-medium">{{ formatCurrency(order.totalCents) }}</span>
            </div>

            <div class="mt-4">
              <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Participantes
              </p>
              <ul class="space-y-2">
                <li
                  v-for="reg in order.registrations"
                  :key="reg.id"
                  class="text-sm text-neutral-600 dark:text-neutral-400"
                >
                  {{ reg.fullName }} ({{ formatCPF(reg.cpf) }})
                  <br />
                  <span class="text-xs">
                    {{ reg.districtName }} - {{ reg.churchName }}
                  </span>
                </li>
              </ul>
            </div>

            <div class="mt-4">
              <button
                v-if="order.event?.slug"
                type="button"
                @click.stop.prevent="handleIndividualPayment(order.orderId, order.event.slug, $event)"
                class="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
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

      <div v-if="selectedOrders.length > 0" class="flex justify-between items-center mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
        <div>
          <p class="text-sm font-medium text-primary-900 dark:text-primary-100">
            {{ selectedOrders.length }} pedido(s) selecionado(s)
          </p>
          <p class="text-xs text-primary-700 dark:text-primary-300">
            Total: {{ formatCurrency(selectedTotal) }}
          </p>
        </div>
        <button
          type="button"
          class="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="selectedOrders.length === 0 || processing"
          @click="handlePayment"
        >
          <span v-if="processing" class="flex items-center gap-2">
            <span class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processando...
          </span>
          <span v-else>
            {{ selectedOrders.length === 1 ? "Pagar pedido" : "Pagar selecionados" }}
          </span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useApi } from "../../composables/useApi";
import { formatCurrency } from "../../utils/format";
import { formatCPF, validateCPF, normalizeCPF } from "../../utils/cpf";

const props = defineProps<{
  cpf?: string;
}>();

const router = useRouter();
const route = useRoute();
const { api } = useApi();

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
// NÃO usa selectedOrders, processa diretamente o orderId passado
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
  // NÃO usar selectedOrders.value de forma alguma
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
    const response = await api.get("/orders/pending", {
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
