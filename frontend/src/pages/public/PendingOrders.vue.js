/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useApi } from "../../composables/useApi";
import { formatCurrency } from "../../utils/format";
import { formatCPF, validateCPF, normalizeCPF } from "../../utils/cpf";
import BaseCard from "../../components/ui/BaseCard.vue";
const props = defineProps();
const router = useRouter();
const route = useRoute();
const { api } = useApi();
const primaryButtonClass = "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60";
const loading = ref(true);
const error = ref("");
const processing = ref(false);
const pendingOrders = ref([]);
const selectedOrders = ref([]);
const pollHandle = ref(null);
// Estado do formulÃ¡rio de CPF
const cpfInput = ref("");
const cpfInputRef = ref(null);
const cpfError = ref("");
const showCpfForm = ref(false);
const isCpfInputValid = computed(() => {
    const digits = normalizeCPF(cpfInput.value);
    // Habilita o botÃ£o quando tem 11 dÃ­gitos (validaÃ§Ã£o completa serÃ¡ feita no submit)
    return digits.length === 11;
});
const selectedTotal = computed(() => {
    return pendingOrders.value
        .filter((order) => selectedOrders.value.includes(order.orderId))
        .reduce((sum, order) => sum + order.totalCents, 0);
});
const toggleOrder = (orderId) => {
    const index = selectedOrders.value.indexOf(orderId);
    if (index === -1) {
        selectedOrders.value.push(orderId);
    }
    else {
        selectedOrders.value.splice(index, 1);
    }
};
// FunÃ§Ã£o para pagamento individual - processa APENAS o pedido especÃ­fico
// Nï¿½fO usa selectedOrders, processa diretamente o orderId passado
const handleIndividualPayment = async (orderId, eventSlug, domEvent) => {
    // Prevenir qualquer propagaÃ§Ã£o de evento que possa interferir
    if (domEvent) {
        domEvent.stopPropagation();
        domEvent.preventDefault();
    }
    // IMPORTANTE: Limpar TODA seleÃ§Ã£o ANTES de fazer qualquer coisa
    // Isso garante que nenhum outro pedido seja processado
    selectedOrders.value = [];
    // Usar apenas o orderId passado como parÃ¢metro
    // Nï¿½fO usar selectedOrders.value de forma alguma
    const singleOrderId = String(orderId); // Garantir que usamos apenas este ID como string
    // Aguardar nextTick para garantir que a limpeza de selectedOrders seja processada
    // antes de redirecionar
    await nextTick();
    // Redirecionar usando APENAS o orderId passado, ignorando completamente selectedOrders
    if (!eventSlug) {
        error.value = "O evento nÃ£o estÃ¡ disponÃ­vel no momento.";
        return;
    }
    router.push({
        name: "payment",
        params: {
            slug: eventSlug,
            orderId: singleOrderId // Apenas este pedido especÃ­fico, NUNCA selectedOrders
        }
    });
};
// FunÃ§Ã£o para pagamento em lote - processa apenas os pedidos selecionados
// Esta funÃ§Ã£o Ã© chamada APENAS pelo botÃ£o "Pagar selecionados" na parte inferior
const handlePayment = async () => {
    if (selectedOrders.value.length === 0)
        return;
    processing.value = true;
    error.value = "";
    try {
        // Se houver apenas um pedido selecionado, redirecionar para pagamento individual
        // Mas limpar a seleÃ§Ã£o ANTES para garantir que nÃ£o haja conflito
        if (selectedOrders.value.length === 1) {
            const orderIdToProcess = selectedOrders.value[0]; // Pegar o ID antes de limpar
            const order = pendingOrders.value.find(o => o.orderId === orderIdToProcess);
            // LIMPAR seleÃ§Ã£o ANTES de processar
            selectedOrders.value = [];
            if (order && order.event?.slug) {
                router.push({
                    name: "payment",
                    params: {
                        slug: order.event.slug,
                        orderId: orderIdToProcess // Usar o ID jÃ¡ capturado, nÃ£o selectedOrders
                    }
                });
                return;
            }
            else if (order && !order.event?.slug) {
                error.value = "NÃ£o foi possÃ­vel carregar as informaÃ§Ãµes do evento. Tente novamente.";
                return;
            }
        }
        // Para mÃºltiplos pedidos, criar pagamento em lote
        // Capturar os IDs ANTES de limpar a seleÃ§Ã£o
        const orderIdsToProcess = [...selectedOrders.value]; // Criar cÃ³pia para garantir
        // LIMPAR seleÃ§Ã£o ANTES de processar para evitar conflitos
        selectedOrders.value = [];
        const response = await api.post("/orders/bulk-payment", {
            orderIds: orderIdsToProcess, // Usar apenas os IDs capturados antes de limpar
            paymentMethod: "MERCADO_PAGO"
        });
        // SeleÃ§Ã£o jÃ¡ foi limpa acima, nÃ£o precisa limpar novamente
        // Redirecionar diretamente para o Mercado Pago se houver initPoint
        if (response.data.initPoint) {
            window.location.href = response.data.initPoint;
        }
        else if (response.data.pixQrData?.qr_code) {
            // Se houver QR code PIX, mostrar na mesma pÃ¡gina
            // Por enquanto, redirecionar para initPoint mesmo que seja sandbox
            if (response.data.sandboxInitPoint) {
                window.location.href = response.data.sandboxInitPoint;
            }
            else {
                error.value = "Erro ao redirecionar para pagamento. Tente novamente.";
            }
        }
        else {
            error.value = "Erro ao processar pagamento. Tente novamente.";
        }
    }
    catch (err) {
        const errorMessage = err.response?.data?.message;
        error.value = errorMessage ?? "NÃ£o foi possÃ­vel processar o pagamento. Tente novamente.";
        showCpfForm.value = false; // Manter a lista visÃ­vel para o usuÃ¡rio tentar novamente
    }
    finally {
        processing.value = false;
    }
};
const loadPendingOrders = async (cpf) => {
    loading.value = true;
    error.value = "";
    cpfError.value = "";
    try {
        const response = await api.get("/orders/pending", {
            params: { cpf: cpf.trim() }
        });
        // Mapear os dados retornados para o formato esperado
        const orders = response.data.orders ?? [];
        // Buscar todos os eventos pÃºblicos para mapear IDs para slugs
        let eventsMap = {};
        try {
            const eventsResponse = await api.get("/events");
            eventsResponse.data.forEach((event) => {
                eventsMap[event.id] = event.slug;
            });
        }
        catch (err) {
            console.error("Erro ao buscar eventos:", err);
        }
        pendingOrders.value = orders.map((order) => ({
            orderId: order.id,
            event: order.event ? {
                id: order.event.id,
                title: order.event.title,
                slug: eventsMap[order.event.id] || ""
            } : undefined,
            buyerCpf: order.buyerCpf,
            totalCents: order.totalCents,
            expiresAt: order.expiresAt,
            registrations: (order.registrations || []).map((reg) => ({
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
        // Esconder o formulÃ¡rio quando os dados sÃ£o carregados com sucesso
        // para mostrar a lista de pendÃªncias
        showCpfForm.value = false;
        // Iniciar polling para detectar pagamentos automaticamente
        // Usando o mesmo mÃ©todo da PaymentPage (inicia polling se nÃ£o estÃ¡ pago)
        if (pendingOrders.value.length > 0) {
            // Verificar se algum pedido jÃ¡ estÃ¡ pago antes de iniciar polling
            const hasUnpaidOrders = pendingOrders.value.some(order => order.payment?.status !== "PAID");
            if (hasUnpaidOrders) {
                startPolling();
            }
        }
    }
    catch (err) {
        const errorMessage = err.response?.data?.message;
        if (errorMessage && errorMessage.includes("Dados invÃ¡lidos")) {
            error.value = "CPF invÃ¡lido. Por favor, verifique o CPF informado.";
            showCpfForm.value = true; // Mostrar formulÃ¡rio em caso de erro
        }
        else {
            error.value = errorMessage ?? "NÃ£o foi possÃ­vel carregar as pendÃªncias. Tente novamente.";
            showCpfForm.value = true; // Mostrar formulÃ¡rio em caso de erro
        }
    }
    finally {
        loading.value = false;
    }
};
const handleCpfInput = (event) => {
    const input = event.target;
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
        cpfError.value = "CPF invÃ¡lido. Por favor, informe um CPF vÃ¡lido.";
        return;
    }
    // Carregar as pendÃªncias diretamente
    await loadPendingOrders(digits);
};
// Carregar pendÃªncias ao montar o componente se CPF foi fornecido
onMounted(async () => {
    const providedCpf = props.cpf?.trim();
    if (providedCpf && providedCpf.length > 0) {
        // Sempre prÃ©-preencher o campo de CPF formatado quando vier da primeira tela
        const normalizedCpf = normalizeCPF(providedCpf);
        if (normalizedCpf.length === 11) {
            // CPF completo - formatar, mostrar no campo e carregar dados
            cpfInput.value = formatCPF(normalizedCpf);
            showCpfForm.value = true; // Mostrar o formulÃ¡rio para o usuÃ¡rio ver o CPF prÃ©-preenchido
            await loadPendingOrders(providedCpf);
            // Se voltou do Mercado Pago (hÃ¡ query params como status, payment_id, etc), 
            // verificar pagamentos imediatamente usando o mesmo mÃ©todo da PaymentPage
            if (route.query.status || route.query.payment_id || route.query.preference_id) {
                // Aguardar 2 segundos para o webhook processar (igual Ã  PaymentPage)
                setTimeout(async () => {
                    // Verificar todos os pedidos usando o mesmo mÃ©todo da PaymentPage
                    const ordersToRemove = [];
                    for (const order of pendingOrders.value) {
                        const paymentData = await checkOrderPayment(order.orderId);
                        if (paymentData && (paymentData.status === "PAID" || paymentData.status === "CANCELED")) {
                            ordersToRemove.push(order.orderId);
                        }
                    }
                    // Remover pedidos pagos (dar baixa simultaneamente para pagamentos em lote)
                    if (ordersToRemove.length > 0) {
                        pendingOrders.value = pendingOrders.value.filter(order => !ordersToRemove.includes(order.orderId));
                        selectedOrders.value = selectedOrders.value.filter(orderId => !ordersToRemove.includes(orderId));
                        // Se ainda hÃ¡ pedidos pendentes, recarregar a lista completa
                        if (pendingOrders.value.length > 0) {
                            await loadPendingOrders(providedCpf);
                        }
                    }
                    else {
                        // Se nÃ£o encontrou pagamentos, recarregar a lista para garantir
                        await loadPendingOrders(providedCpf);
                    }
                }, 2000); // Aguardar 2 segundos (igual Ã  PaymentPage)
                // Verificar novamente apÃ³s mais tempo (igual Ã  PaymentPage com query.fresh)
                setTimeout(async () => {
                    const ordersToRemove = [];
                    for (const order of pendingOrders.value) {
                        const paymentData = await checkOrderPayment(order.orderId);
                        if (paymentData && (paymentData.status === "PAID" || paymentData.status === "CANCELED")) {
                            ordersToRemove.push(order.orderId);
                        }
                    }
                    if (ordersToRemove.length > 0) {
                        pendingOrders.value = pendingOrders.value.filter(order => !ordersToRemove.includes(order.orderId));
                        selectedOrders.value = selectedOrders.value.filter(orderId => !ordersToRemove.includes(orderId));
                        if (pendingOrders.value.length > 0) {
                            await loadPendingOrders(providedCpf);
                        }
                    }
                }, 5000); // Aguardar 5 segundos para garantir
            }
        }
        else if (normalizedCpf.length > 0) {
            // CPF parcial - apenas formatar e mostrar formulÃ¡rio
            cpfInput.value = formatCPF(providedCpf);
            showCpfForm.value = true;
            loading.value = false;
        }
        else {
            // CPF vazio ou invÃ¡lido
            loading.value = false;
            showCpfForm.value = true;
        }
    }
    else {
        loading.value = false;
        showCpfForm.value = true;
    }
});
// Observar mudanÃ§as na prop cpf (quando navega com CPF)
watch(() => props.cpf, async (newCpf, oldCpf) => {
    // SÃ³ atualizar se o CPF realmente mudou
    if (newCpf && typeof newCpf === "string" && newCpf.trim().length > 0 && newCpf !== oldCpf) {
        // Atualizar o campo de input quando o CPF mudar
        const normalizedCpf = normalizeCPF(newCpf);
        if (normalizedCpf.length === 11) {
            cpfInput.value = formatCPF(normalizedCpf);
            showCpfForm.value = false;
            await loadPendingOrders(newCpf);
        }
        else if (normalizedCpf.length > 0) {
            // CPF parcial - apenas formatar
            cpfInput.value = formatCPF(newCpf);
            showCpfForm.value = true;
        }
    }
}, { immediate: false });
// FunÃ§Ã£o para verificar pagamento de um pedido - usando EXATAMENTE o mesmo mÃ©todo da PaymentPage
const checkOrderPayment = async (orderId) => {
    try {
        // Usar exatamente o mesmo endpoint e mÃ©todo da PaymentPage
        const response = await api.get(`/payments/order/${orderId}`);
        return response.data;
    }
    catch (error) {
        console.error(`Erro ao verificar pagamento do pedido ${orderId}:`, error);
        return null;
    }
};
// Polling para detectar pagamentos automaticamente - usando EXATAMENTE o mesmo mÃ©todo da PaymentPage
const startPolling = () => {
    stopPolling();
    // SÃ³ fazer polling se houver pedidos pendentes
    if (pendingOrders.value.length === 0) {
        return;
    }
    pollHandle.value = window.setInterval(async () => {
        // Verificar cada pedido individualmente usando o mesmo mÃ©todo da PaymentPage
        const ordersToRemove = [];
        // Verificar todos os pedidos pendentes
        for (const order of pendingOrders.value) {
            // Usar exatamente o mesmo mÃ©todo da PaymentPage (loadPayment)
            const paymentData = await checkOrderPayment(order.orderId);
            if (paymentData) {
                // Se o pagamento foi aprovado, marcar para remover da lista
                if (paymentData.status === "PAID" || paymentData.status === "CANCELED") {
                    ordersToRemove.push(order.orderId);
                }
                else if (paymentData.status !== order.payment?.status) {
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
            pendingOrders.value = pendingOrders.value.filter(order => !ordersToRemove.includes(order.orderId));
            // Limpar seleÃ§Ã£o de pedidos removidos
            selectedOrders.value = selectedOrders.value.filter(orderId => !ordersToRemove.includes(orderId));
            // Se nÃ£o hÃ¡ mais pedidos pendentes, parar o polling
            if (pendingOrders.value.length === 0) {
                stopPolling();
            }
        }
    }, 5000); // Verificar a cada 5 segundos (igual Ã  PaymentPage)
};
const stopPolling = () => {
    if (pollHandle.value) {
        clearInterval(pollHandle.value);
        pollHandle.value = null;
    }
};
// Observar mudanÃ§as na lista de pedidos para iniciar/parar polling
watch(() => pendingOrders.value.length, (newLength, oldLength) => {
    if (newLength > 0 && oldLength === 0) {
        // Pedidos foram carregados, iniciar polling
        startPolling();
    }
    else if (newLength === 0 && oldLength > 0) {
        // NÃ£o hÃ¡ mais pedidos, parar polling
        stopPolling();
    }
});
// Limpar polling ao desmontar componente
onUnmounted(() => {
    stopPolling();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "px-4 py-10 lg:py-16" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mx-auto w-full max-w-5xl space-y-6" },
});
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "border border-white/20 bg-gradient-to-br from-white/90 via-primary-50/40 to-primary-100/30 shadow-xl dark:border-white/10 dark:from-neutral-900/80 dark:via-neutral-900/40 dark:to-primary-950/30" },
}));
const __VLS_1 = __VLS_0({
    ...{ class: "border border-white/20 bg-gradient-to-br from-white/90 via-primary-50/40 to-primary-100/30 shadow-xl dark:border-white/10 dark:from-neutral-900/80 dark:via-neutral-900/40 dark:to-primary-950/30" },
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs uppercase tracking-[0.4em] text-primary-600 dark:text-primary-300" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-3xl font-semibold text-neutral-900 dark:text-white" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "mt-1 text-sm text-neutral-600 dark:text-neutral-300" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$router.back();
        } },
    type: "button",
    ...{ class: ([__VLS_ctx.primaryButtonClass, 'px-5 py-2 text-sm']) },
});
var __VLS_2;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-center py-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" },
    });
}
if (__VLS_ctx.showCpfForm && !__VLS_ctx.loading) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/30 bg-white/90 shadow-2xl dark:border-white/10 dark:bg-white/5" },
    }));
    const __VLS_4 = __VLS_3({
        ...{ class: "border border-white/30 bg-white/90 shadow-2xl dark:border-white/10 dark:bg-white/5" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
    __VLS_5.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-lg font-semibold text-neutral-800 dark:text-white" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleCpfSubmit) },
        ...{ class: "mt-5 space-y-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onInput: (__VLS_ctx.handleCpfInput) },
        id: "cpf-input",
        ref: "cpfInputRef",
        value: (__VLS_ctx.cpfInput),
        type: "text",
        placeholder: "000.000.000-00",
        ...{ class: "w-full rounded-2xl border border-neutral-200/70 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
        ...{ class: ({ 'border-red-500 focus:border-red-500 focus:ring-red-200': __VLS_ctx.cpfError }) },
    });
    /** @type {typeof __VLS_ctx.cpfInputRef} */ ;
    if (__VLS_ctx.cpfError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm text-red-600 dark:text-red-300" },
        });
        (__VLS_ctx.cpfError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 sm:flex-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        ...{ class: ([__VLS_ctx.primaryButtonClass, 'w-full sm:w-auto px-6 py-2 text-sm']) },
        disabled: (!__VLS_ctx.isCpfInputValid),
    });
    const __VLS_6 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        to: "/",
        ...{ class: ([__VLS_ctx.primaryButtonClass, 'w-full sm:w-auto px-6 py-2 text-sm text-center']) },
    }));
    const __VLS_8 = __VLS_7({
        to: "/",
        ...{ class: ([__VLS_ctx.primaryButtonClass, 'w-full sm:w-auto px-6 py-2 text-sm text-center']) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_9.slots.default;
    var __VLS_9;
    var __VLS_5;
}
if (__VLS_ctx.error && !__VLS_ctx.loading && !__VLS_ctx.showCpfForm) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-red-200/60 bg-red-50/90 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" },
    }));
    const __VLS_11 = __VLS_10({
        ...{ class: "border border-red-200/60 bg-red-50/90 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
    __VLS_12.slots.default;
    (__VLS_ctx.error);
    var __VLS_12;
}
if (!__VLS_ctx.showCpfForm && !__VLS_ctx.loading && !__VLS_ctx.error && __VLS_ctx.pendingOrders.length === 0) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/10 bg-white/80 text-center text-neutral-600 dark:border-white/5 dark:bg-neutral-900/60 dark:text-neutral-300" },
    }));
    const __VLS_14 = __VLS_13({
        ...{ class: "border border-white/10 bg-white/80 text-center text-neutral-600 dark:border-white/5 dark:bg-neutral-900/60 dark:text-neutral-300" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    var __VLS_15;
}
if (!__VLS_ctx.showCpfForm && !__VLS_ctx.loading && __VLS_ctx.pendingOrders.length > 0) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "border border-white/10 bg-white/85 shadow-xl dark:border-white/5 dark:bg-neutral-900/60" },
    }));
    const __VLS_17 = __VLS_16({
        ...{ class: "border border-white/10 bg-white/85 shadow-xl dark:border-white/5 dark:bg-neutral-900/60" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_18.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-6 space-y-5" },
    });
    for (const [order] of __VLS_getVForSourceType((__VLS_ctx.pendingOrders))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (order.orderId),
            ...{ class: "flex flex-col gap-4 rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 dark:border-white/5 dark:bg-neutral-900/80 md:flex-row md:items-start md:gap-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    if (!(!__VLS_ctx.showCpfForm && !__VLS_ctx.loading && __VLS_ctx.pendingOrders.length > 0))
                        return;
                    __VLS_ctx.toggleOrder(order.orderId);
                } },
            type: "checkbox",
            checked: (__VLS_ctx.selectedOrders.includes(order.orderId)),
            ...{ class: "h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 md:mt-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1 space-y-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-col gap-2 md:flex-row md:items-start md:justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-900 dark:text-neutral-50" },
        });
        (order.event?.title || "Evento");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
        });
        (__VLS_ctx.formatCPF(order.buyerCpf));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-base font-semibold text-primary-700 dark:text-primary-300" },
        });
        (__VLS_ctx.formatCurrency(order.totalCents));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300 mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "space-y-2 text-sm text-neutral-600 dark:text-neutral-300" },
        });
        for (const [reg] of __VLS_getVForSourceType((order.registrations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (reg.id),
                ...{ class: "rounded-xl border border-neutral-200/40 bg-white/80 px-3 py-2 dark:border-white/5 dark:bg-white/5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-medium text-neutral-800 dark:text-white" },
            });
            (reg.fullName);
            (__VLS_ctx.formatCPF(reg.cpf));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (reg.districtName);
            (reg.churchName);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap gap-3" },
        });
        if (order.event?.slug) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.showCpfForm && !__VLS_ctx.loading && __VLS_ctx.pendingOrders.length > 0))
                            return;
                        if (!(order.event?.slug))
                            return;
                        __VLS_ctx.handleIndividualPayment(order.orderId, order.event.slug, $event);
                    } },
                type: "button",
                ...{ class: ([__VLS_ctx.primaryButtonClass, 'px-5 py-2 text-sm']) },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
            });
        }
    }
    if (__VLS_ctx.selectedOrders.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-8 flex flex-col gap-4 rounded-2xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-500/30 dark:bg-primary-900/20 md:flex-row md:items-center md:justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm font-semibold text-primary-900 dark:text-primary-100" },
        });
        (__VLS_ctx.selectedOrders.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-primary-700 dark:text-primary-200" },
        });
        (__VLS_ctx.formatCurrency(__VLS_ctx.selectedTotal));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handlePayment) },
            type: "button",
            ...{ class: ([__VLS_ctx.primaryButtonClass, 'px-6 py-2 text-sm']) },
            disabled: (__VLS_ctx.selectedOrders.length === 0 || __VLS_ctx.processing),
        });
        if (__VLS_ctx.processing) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "flex items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedOrders.length === 1 ? "Pagar pedido" : "Pagar selecionados");
        }
    }
    var __VLS_18;
}
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-10']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:py-16']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-5xl']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['via-primary-50/40']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-100/30']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-950/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.4em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-12']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/30']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-50/90']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-red-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-100']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/85']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['md:gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['md:mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-900/20']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            formatCurrency: formatCurrency,
            formatCPF: formatCPF,
            BaseCard: BaseCard,
            primaryButtonClass: primaryButtonClass,
            loading: loading,
            error: error,
            processing: processing,
            pendingOrders: pendingOrders,
            selectedOrders: selectedOrders,
            cpfInput: cpfInput,
            cpfInputRef: cpfInputRef,
            cpfError: cpfError,
            showCpfForm: showCpfForm,
            isCpfInputValid: isCpfInputValid,
            selectedTotal: selectedTotal,
            toggleOrder: toggleOrder,
            handleIndividualPayment: handleIndividualPayment,
            handlePayment: handlePayment,
            handleCpfInput: handleCpfInput,
            handleCpfSubmit: handleCpfSubmit,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=PendingOrders.vue.js.map
