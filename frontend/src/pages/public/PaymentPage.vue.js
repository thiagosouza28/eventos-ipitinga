/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
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
const props = defineProps();
const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const payment = ref(null);
const loadingStatus = ref(false);
const pollHandle = ref(null);
const PAID_STATUSES = new Set(["PAID", "APPROVED"]);
const isPaidStatus = (status) => {
    if (!status)
        return false;
    return PAID_STATUSES.has(status.toUpperCase());
};
const receiptDownloadStorageKey = `order:${props.orderId}:receipts-downloaded`;
const readStoredReceiptState = () => {
    if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
        return "idle";
    }
    try {
        return window.sessionStorage.getItem(receiptDownloadStorageKey) === "done" ? "done" : "idle";
    }
    catch {
        return "idle";
    }
};
const autoReceiptDownloadState = ref(readStoredReceiptState());
const downloadingReceipts = ref(false);
const receiptDownloadError = ref("");
const apiBase = (() => {
    try {
        return new URL(API_BASE_URL, typeof window !== "undefined" ? window.location.origin : undefined);
    }
    catch {
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
const resolveReceiptUrl = (target) => {
    try {
        return new URL(target, apiBase).toString();
    }
    catch {
        return target;
    }
};
const rawReceiptLinks = computed(() => payment.value?.receipts ?? []);
const receiptLinks = computed(() => rawReceiptLinks.value.map((receipt) => ({
    ...receipt,
    resolvedUrl: resolveReceiptUrl(receipt.receiptUrl)
})));
const hasReceiptLinks = computed(() => receiptLinks.value.length > 0);
const participantStatusMap = computed(() => {
    const map = new Map();
    payment.value?.participants?.forEach((participant) => {
        map.set(participant.id, participant.status);
    });
    return map;
});
const receiptStatusLabel = (registrationId) => formatParticipantStatus(participantStatusMap.value.get(registrationId) ?? "PAID");
const receiptStatusClass = (registrationId) => participantStatusMap.value.get(registrationId) === "PAID"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-50"
    : "bg-amber-100 text-amber-700 dark:bg-amber-400/30 dark:text-amber-50";
const clearRegistrationDraftState = () => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined")
        return;
    window.localStorage.removeItem(REGISTRATION_STORAGE_KEY);
};
const handleStartNewRegistration = () => {
    clearRegistrationDraftState();
    router.push({ name: "event", params: { slug: props.slug } });
};
const currentLotName = computed(() => eventStore.event?.currentLot?.name ?? null);
const participantCount = computed(() => payment.value?.participantCount ?? eventStore.lastOrder?.registrationIds.length ?? 1);
const ticketPriceCents = computed(() => {
    if (payment.value?.totalCents != null) {
        const count = Math.max(participantCount.value, 1);
        return Math.round(payment.value.totalCents / count);
    }
    return eventStore.event?.currentPriceCents ?? eventStore.event?.priceCents ?? 0;
});
const isPaid = computed(() => isPaidStatus(payment.value?.status));
const isFreeEvent = computed(() => Boolean(payment.value?.isFree || eventStore.event?.isFree));
const statusLabels = {
    DRAFT: "Rascunho",
    PENDING_PAYMENT: "Pendente",
    PAID: "Pago",
    CANCELED: "Cancelada",
    REFUNDED: "Estornada",
    CHECKED_IN: "Check-in realizado"
};
const formatParticipantStatus = (status) => statusLabels[status] ?? status;
const pendingParticipants = computed(() => payment.value?.participants?.filter((participant) => participant.status !== "PAID") ?? []);
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
    if (typeof window === "undefined" || typeof window.sessionStorage === "undefined")
        return;
    try {
        window.sessionStorage.setItem(receiptDownloadStorageKey, "done");
    }
    catch {
        // Silently ignore storage errors (private mode, etc).
    }
};
const buildReceiptFileName = (receipt, index) => {
    const base = sanitizeFileName(receipt.fullName || `participante-${index + 1}`, "participante");
    return `${base}-${receipt.registrationId}.pdf`;
};
const triggerBlobDownload = (blob, fileName) => {
    if (typeof window === "undefined")
        return;
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
};
const fetchReceiptBlob = async (url) => {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
        throw new Error(`Falha ao baixar comprovante (${response.status})`);
    }
    return await response.blob();
};
const downloadSingleReceipt = async (receipt, index) => {
    const blob = await fetchReceiptBlob(receipt.resolvedUrl ?? receipt.receiptUrl);
    triggerBlobDownload(blob, buildReceiptFileName(receipt, index));
};
const downloadReceiptArchive = async (receipts) => {
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
const downloadReceipts = async (mode = "manual") => {
    if (typeof window === "undefined" || !hasReceiptLinks.value)
        return false;
    downloadingReceipts.value = true;
    if (mode === "manual") {
        receiptDownloadError.value = "";
    }
    try {
        if (receiptLinks.value.length === 1) {
            await downloadSingleReceipt(receiptLinks.value[0], 0);
        }
        else {
            await downloadReceiptArchive(receiptLinks.value);
        }
        persistReceiptDownloadState();
        autoReceiptDownloadState.value = "done";
        return true;
    }
    catch (error) {
        console.error("Erro ao baixar comprovantes", error);
        receiptDownloadError.value =
            mode === "auto"
                ? "Tentamos baixar os comprovantes automaticamente, mas algo deu errado. Use o botÃ£o abaixo para tentar novamente."
                : "NÃ£o foi possÃ­vel baixar os comprovantes. Tente novamente.";
        return false;
    }
    finally {
        downloadingReceipts.value = false;
    }
};
const triggerAutoReceiptDownload = () => {
    if (autoReceiptDownloadState.value !== "idle" || !hasReceiptLinks.value)
        return;
    if (typeof window === "undefined")
        return;
    autoReceiptDownloadState.value = "pending";
    void downloadReceipts("auto").then((success) => {
        autoReceiptDownloadState.value = success ? "done" : "failed";
    });
};
const handleManualReceiptDownload = () => downloadReceipts("manual");
const handleSingleReceiptDownload = async (registrationId) => {
    if (!hasReceiptLinks.value || downloadingReceipts.value)
        return;
    const index = receiptLinks.value.findIndex((receipt) => receipt.registrationId === registrationId);
    if (index < 0) {
        receiptDownloadError.value = "NÃ£o encontramos este comprovante. Atualize a pÃ¡gina e tente novamente.";
        return;
    }
    downloadingReceipts.value = true;
    receiptDownloadError.value = "";
    try {
        await downloadSingleReceipt(receiptLinks.value[index], index);
    }
    catch (error) {
        console.error("Erro ao baixar comprovante individual", error);
        receiptDownloadError.value = "NÃ£o foi possÃ­vel baixar este comprovante. Tente novamente.";
    }
    finally {
        downloadingReceipts.value = false;
    }
};
const statusTitle = computed(() => {
    if (isFreeEvent.value)
        return "InscriÃ§Ãµes confirmadas";
    if (isManualPayment.value) {
        if (isPaid.value)
            return "Pagamento registrado";
        return "Pagamento pendente de confirmaÃ§Ã£o";
    }
    if (isPaid.value)
        return "Pagamento aprovado";
    if (payment.value?.status === "CANCELED")
        return "Pagamento cancelado";
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
    if (isFreeEvent.value || isPaid.value)
        return "OK";
    if (isManualPayment.value)
        return "..";
    if (payment.value?.status === "CANCELED")
        return "X";
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
    }
    catch (error) {
        console.error("Erro ao carregar pagamento", error);
    }
    finally {
        loadingStatus.value = false;
        if (force && !isPaid.value) {
            startPolling();
        }
    }
};
const copyPixCode = async () => {
    if (!payment.value?.pixQrData?.qr_code)
        return;
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
watch(() => ({
    status: payment.value?.status,
    receiptCount: receiptLinks.value.length
}), ({ status, receiptCount }) => {
    if (isPaidStatus(status) && receiptCount > 0) {
        triggerAutoReceiptDownload();
    }
}, { immediate: true });
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-6" },
});
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-2xl font-semibold text-neutral-800 dark:text-neutral-50" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-neutral-500 dark:text-neutral-400" },
});
(__VLS_ctx.isFreeEvent
    ? "Este evento Ã© gratuito. As inscriÃ§Ãµes foram confirmadas automaticamente e nenhum pagamento Ã© necessÃ¡rio."
    : "Conclua o pagamento para garantir as inscriÃ§Ãµes. Assim que o Mercado Pago aprovar, atualizamos tudo automaticamente.");
var __VLS_2;
if (__VLS_ctx.payment) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
    const __VLS_4 = __VLS_3({}, ...__VLS_functionalComponentArgsRest(__VLS_3));
    __VLS_5.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-6 md:flex-row md:items-start" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex-1 space-y-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-start gap-3 rounded-xl border px-4 py-3" },
        ...{ class: (__VLS_ctx.statusStyles.container) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-white" },
        ...{ class: (__VLS_ctx.statusStyles.badge) },
    });
    (__VLS_ctx.statusIcon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
    });
    (__VLS_ctx.statusTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
    });
    (__VLS_ctx.statusMessage);
    if (__VLS_ctx.payment.statusDetail) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-xs text-neutral-400" },
        });
        (__VLS_ctx.payment.statusDetail);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900/60" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({
        ...{ class: "rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800" },
    });
    (props.orderId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-4 grid gap-3 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.eventStore.event?.title ?? "Carregando...");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.isFreeEvent ? "Gratuito" : __VLS_ctx.formatCurrency(__VLS_ctx.ticketPriceCents));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.totalFormatted);
    if (__VLS_ctx.currentLotName) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.currentLotName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.paymentMethodName);
    if (__VLS_ctx.payment?.paidAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.payment.paidAt));
    }
    if (__VLS_ctx.pendingParticipants.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "block text-xs uppercase tracking-wide text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "mt-2 space-y-2" },
        });
        for (const [participant] of __VLS_getVForSourceType((__VLS_ctx.pendingParticipants))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (participant.id),
                ...{ class: "flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm dark:bg-neutral-800" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-medium text-neutral-700 dark:text-neutral-100" },
            });
            (participant.fullName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-500/20 dark:text-primary-100" },
            });
            (__VLS_ctx.formatParticipantStatus(participant.status));
        }
    }
    if (__VLS_ctx.receiptsReady) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 space-y-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-5 text-sm text-emerald-900 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-50" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-base font-semibold" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm text-emerald-800 dark:text-emerald-100/80" },
        });
        (__VLS_ctx.autoReceiptDownloadState === "done"
            ? "Download automatico concluido. Se precisar novamente, clique abaixo."
            : "Escolha um comprovante individual ou baixe todos de uma vez.");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleManualReceiptDownload) },
            type: "button",
            ...{ class: "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400" },
            disabled: (__VLS_ctx.downloadingReceipts),
        });
        if (__VLS_ctx.downloadingReceipts) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "flex items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-4 sm:grid-cols-2" },
        });
        for (const [receipt] of __VLS_getVForSourceType((__VLS_ctx.receiptLinks))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (receipt.registrationId),
                ...{ class: "rounded-2xl border border-white/70 bg-white/90 p-4 text-neutral-700 shadow dark:border-emerald-500/20 dark:bg-emerald-900/40 dark:text-emerald-50" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex items-start justify-between gap-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm font-semibold text-neutral-900 dark:text-white" },
            });
            (receipt.fullName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-500 dark:text-emerald-100/70" },
            });
            (receipt.registrationId.slice(0, 8).toUpperCase());
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" },
                ...{ class: (__VLS_ctx.receiptStatusClass(receipt.registrationId)) },
            });
            (__VLS_ctx.receiptStatusLabel(receipt.registrationId));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-3 text-xs text-neutral-500 dark:text-emerald-100/70" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.payment))
                            return;
                        if (!(__VLS_ctx.receiptsReady))
                            return;
                        __VLS_ctx.handleSingleReceiptDownload(receipt.registrationId);
                    } },
                type: "button",
                ...{ class: "mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-primary-200 hover:text-primary-600 dark:border-emerald-500/40 dark:text-emerald-50" },
                disabled: (__VLS_ctx.downloadingReceipts),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "h-4 w-4" },
                'aria-hidden': "true",
            });
        }
        if (__VLS_ctx.receiptDownloadError) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm text-red-600 dark:text-red-300" },
            });
            (__VLS_ctx.receiptDownloadError);
        }
    }
    else if (__VLS_ctx.receiptsGenerating) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200" },
        });
    }
    if (!__VLS_ctx.isFreeEvent && !__VLS_ctx.isPaid) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1 space-y-6" },
        });
        if (__VLS_ctx.isManualPayment) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                ...{ class: "space-y-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.paymentMethodName);
            if (__VLS_ctx.manualInstructions) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-neutral-500 dark:text-neutral-400" },
                });
                (__VLS_ctx.manualInstructions);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-400 dark:text-neutral-500" },
            });
            const __VLS_6 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
            // @ts-ignore
            const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
                to: ({ name: 'event', params: { slug: props.slug } }),
                ...{ class: "inline-flex w-full items-center justify-center rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:hover:bg-primary-500/10" },
            }));
            const __VLS_8 = __VLS_7({
                to: ({ name: 'event', params: { slug: props.slug } }),
                ...{ class: "inline-flex w-full items-center justify-center rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:hover:bg-primary-500/10" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_7));
            __VLS_9.slots.default;
            var __VLS_9;
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                ...{ class: "space-y-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
                ...{ class: "flex items-center justify-between" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.copyPixCode) },
                type: "button",
                ...{ class: "text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400" },
                disabled: (!__VLS_ctx.payment.pixQrData),
            });
            if (__VLS_ctx.pixWasReactivated) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/80" },
            });
            if (__VLS_ctx.payment.pixQrData?.qr_code_base64) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (`data:image/png;base64,${__VLS_ctx.payment.pixQrData.qr_code_base64}`),
                    alt: "QR Code Pix",
                    ...{ class: "h-48 w-48 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex flex-col items-center justify-center gap-2 py-8 text-neutral-500" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                    ...{ class: "h-6 w-6 animate-spin text-primary-600" },
                    xmlns: "http://www.w3.org/2000/svg",
                    fill: "none",
                    viewBox: "0 0 24 24",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
                    ...{ class: "opacity-25" },
                    cx: "12",
                    cy: "12",
                    r: "10",
                    stroke: "currentColor",
                    'stroke-width': "4",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
                    ...{ class: "opacity-75" },
                    fill: "currentColor",
                    d: "M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-sm" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
            });
            if (__VLS_ctx.payment.pixQrData?.qr_code) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
                    ...{ class: "w-full rounded-lg border border-neutral-300 bg-white p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" },
                    rows: "3",
                    readonly: true,
                    value: (__VLS_ctx.payment.pixQrData.qr_code),
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-neutral-400" },
                });
            }
            if (!__VLS_ctx.isPixPayment && !__VLS_ctx.isManualPayment) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                    ...{ class: "space-y-3" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                    ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
                });
                if (__VLS_ctx.payment.initPoint) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (__VLS_ctx.handleOpenCheckout) },
                        type: "button",
                        ...{ class: "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500" },
                    });
                }
                if (!__VLS_ctx.isPaid) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: "text-xs text-neutral-400" },
                    });
                }
                if (!__VLS_ctx.isPaid) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.payment))
                                    return;
                                if (!(!__VLS_ctx.isFreeEvent && !__VLS_ctx.isPaid))
                                    return;
                                if (!!(__VLS_ctx.isManualPayment))
                                    return;
                                if (!(!__VLS_ctx.isPixPayment && !__VLS_ctx.isManualPayment))
                                    return;
                                if (!(!__VLS_ctx.isPaid))
                                    return;
                                __VLS_ctx.loadPayment(true);
                            } },
                        type: "button",
                        ...{ class: "inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400" },
                        disabled: (__VLS_ctx.loadingStatus),
                    });
                    if (__VLS_ctx.loadingStatus) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                            ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent" },
                        });
                    }
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (__VLS_ctx.loadingStatus ? "Atualizando..." : "Ja paguei, verificar status");
                }
            }
        }
    }
    else if (__VLS_ctx.isFreeEvent) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1 space-y-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2" },
        });
    }
    var __VLS_5;
}
if (__VLS_ctx.isPaid) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
    const __VLS_11 = __VLS_10({}, ...__VLS_functionalComponentArgsRest(__VLS_10));
    __VLS_12.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-lg font-semibold text-neutral-700 dark:text-neutral-100" },
    });
    (__VLS_ctx.isFreeEvent ? "InscriÃ§Ãµes confirmadas" : "Pagamento confirmado");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
    });
    (__VLS_ctx.isFreeEvent
        ? "Os recibos estÃ£o disponÃ­veis para consulta com o CPF e a data de nascimento dos participantes."
        : "Os recibos sÃ£o gerados automaticamente e podem ser consultados com o CPF e a data de nascimento dos participantes.");
    const __VLS_13 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
        to: "/comprovante",
        ...{ class: "inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
    }));
    const __VLS_15 = __VLS_14({
        to: "/comprovante",
        ...{ class: "inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    __VLS_16.slots.default;
    var __VLS_16;
    var __VLS_12;
}
if (__VLS_ctx.payment) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
    const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleStartNewRegistration) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500" },
    });
    var __VLS_19;
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-emerald-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-emerald-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-100/80']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-emerald-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-emerald-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-emerald-500/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-100/70']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-100/70']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-emerald-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-50']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-amber-400/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-amber-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['h-48']} */ ;
/** @type {__VLS_StyleScopedClasses['w-48']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-8']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-25']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-75']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-current']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            BaseCard: BaseCard,
            formatCurrency: formatCurrency,
            formatDate: formatDate,
            eventStore: eventStore,
            payment: payment,
            loadingStatus: loadingStatus,
            autoReceiptDownloadState: autoReceiptDownloadState,
            downloadingReceipts: downloadingReceipts,
            receiptDownloadError: receiptDownloadError,
            receiptLinks: receiptLinks,
            receiptStatusLabel: receiptStatusLabel,
            receiptStatusClass: receiptStatusClass,
            handleStartNewRegistration: handleStartNewRegistration,
            currentLotName: currentLotName,
            ticketPriceCents: ticketPriceCents,
            isPaid: isPaid,
            isFreeEvent: isFreeEvent,
            formatParticipantStatus: formatParticipantStatus,
            pendingParticipants: pendingParticipants,
            isManualPayment: isManualPayment,
            receiptsReady: receiptsReady,
            receiptsGenerating: receiptsGenerating,
            paymentMethodName: paymentMethodName,
            manualInstructions: manualInstructions,
            handleManualReceiptDownload: handleManualReceiptDownload,
            handleSingleReceiptDownload: handleSingleReceiptDownload,
            statusTitle: statusTitle,
            statusMessage: statusMessage,
            isPixPayment: isPixPayment,
            pixWasReactivated: pixWasReactivated,
            statusIcon: statusIcon,
            statusStyles: statusStyles,
            totalFormatted: totalFormatted,
            loadPayment: loadPayment,
            copyPixCode: copyPixCode,
            handleOpenCheckout: handleOpenCheckout,
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
//# sourceMappingURL=PaymentPage.vue.js.map