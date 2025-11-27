/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
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
const admin = useAdminStore();
const checkinPermissions = useModulePermissions("checkin");
const loadingDashboard = ref(true);
const initialRouteEvent = typeof route.params.eventId === "string" && route.params.eventId.length
    ? String(route.params.eventId)
    : null;
const activeEventId = ref(initialRouteEvent);
const cpf = ref("");
const birthDate = ref("");
const feedback = ref("");
const feedbackClass = ref("");
const facingMode = ref("environment");
const streamKey = ref(0);
const cameraReady = ref(false);
const cameraError = ref("");
const isProcessing = ref(false);
const isRestarting = ref(false);
const lastScanned = ref(null);
const manualLoading = ref(false);
const confirming = ref(false);
const pendingCheckin = ref(null);
const pendingHistory = ref([]);
const historyLoading = ref(false);
let feedbackTimer = null;
const cameraConstraints = computed(() => ({
    facingMode: facingMode.value === "environment" ? { ideal: "environment" } : { ideal: "user" },
    width: { ideal: 1280 },
    height: { ideal: 720 }
}));
const awaitingScanConfirmation = computed(() => pendingCheckin.value?.source === "scan" && pendingCheckin.value.status === "READY");
const cameraPaused = computed(() => isProcessing.value ||
    confirming.value ||
    awaitingScanConfirmation.value);
const cameraStatus = computed(() => {
    if (cameraError.value)
        return cameraError.value;
    if (!cameraReady.value)
        return "Iniciando camera...";
    if (awaitingScanConfirmation.value)
        return "Confirme os dados do participante.";
    if (isProcessing.value)
        return "Processando QR Code...";
    return "";
});
const fallbackEventInfo = computed(() => {
    const registration = pendingCheckin.value?.registration;
    if (!registration)
        return null;
    const details = [registration.eventLocation, registration.eventPeriod]
        .filter((value) => value && value !== "Não informado")
        .join(" - ");
    return {
        title: registration.eventTitle || "Evento",
        details
    };
});
const currentEvent = computed(() => admin.dashboard?.event ?? null);
const currentEventTitle = computed(() => currentEvent.value?.title ?? fallbackEventInfo.value?.title ?? "Check-in de participantes");
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
    const totals = admin.dashboard?.totals;
    if (!totals)
        return [];
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
const formatDateTime = (value) => new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
});
const pendingStatusInfo = computed(() => {
    if (!pendingCheckin.value)
        return null;
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
const historyLabelMap = {
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
const formatHistoryLabel = (entry) => entry.label ?? historyLabelMap[entry.type] ?? entry.type.replace(/_/g, " ");
const displayCpf = (value) => formatCPF(value);
const handleCpfInputChange = (event) => {
    const input = event.target;
    if (!input)
        return;
    cpf.value = formatCPF(input.value);
};
const applyPendingResult = (result, source, fallbackSignature) => {
    const confirmation = result.confirmation ??
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
const normalizeHistoryEvent = (input) => ({
    type: String(input?.type ?? "EVENT"),
    at: typeof input?.at === "string"
        ? input.at
        : new Date(input?.at ?? input?.createdAt ?? Date.now()).toISOString(),
    label: typeof input?.label === "string" ? input.label : undefined,
    actor: input?.actor ?? null,
    details: input?.details ?? undefined
});
const loadPendingHistory = async (registrationId) => {
    historyLoading.value = true;
    try {
        const history = await admin.getRegistrationHistory(registrationId);
        const events = Array.isArray(history?.events) ? history.events : [];
        const normalized = events
            .map((event) => normalizeHistoryEvent(event))
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        pendingHistory.value = normalized;
    }
    catch (error) {
        console.error("Erro ao carregar historico de check-in", error);
        pendingHistory.value = [];
    }
    finally {
        historyLoading.value = false;
    }
};
const loadDashboard = async (eventIdParam) => {
    if (eventIdParam === null) {
        activeEventId.value = null;
        admin.dashboard = null;
        return;
    }
    const routeEvent = typeof route.params.eventId === "string" && route.params.eventId.length
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
    }
    catch (error) {
        console.error("Erro ao carregar painel de check-in", error);
    }
    finally {
        loadingDashboard.value = false;
    }
};
const restartCamera = () => {
    if (isRestarting.value)
        return;
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
const showFeedback = (message, variant) => {
    feedback.value = message;
    feedbackClass.value =
        variant === "success"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100"
            : "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-100";
    if (feedbackTimer)
        window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
        feedback.value = "";
        feedbackClass.value =
            variant === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100"
                : "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-100";
    }, 3500);
};
const onDecode = async (decoded) => {
    if (!decoded || isProcessing.value || confirming.value)
        return;
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
        }));
        applyPendingResult(result, "scan", signature);
        if (result.status === "READY") {
            showFeedback("Confirme os dados antes de registrar a presenca.", "success");
        }
        else {
            showFeedback("Este participante ja realizou check-in anteriormente.", "success");
        }
        await loadDashboard(result.registration.eventId ?? undefined);
        lastScanned.value = { value: decoded, timestamp: now };
    }
    catch (error) {
        showFeedback(error.response?.data?.message ?? "Erro ao processar QR Code.", "error");
        cancelPending();
    }
    finally {
        isProcessing.value = false;
    }
};
const onInit = async (promise) => {
    try {
        await promise;
        cameraReady.value = true;
        cameraError.value = "";
    }
    catch (error) {
        cameraReady.value = false;
        cameraError.value =
            "Não foi possível acessar a câmera. Verifique as permissões do navegador e tente novamente.";
    }
};
const manualLookup = async () => {
    if (manualLoading.value || confirming.value)
        return;
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
        }));
        applyPendingResult(result, "manual");
        if (result.status === "READY") {
            showFeedback("Confirme os dados do participante antes de concluir o check-in.", "success");
        }
        else {
            showFeedback("Este participante ja realizou check-in anteriormente.", "success");
        }
        await loadDashboard(result.registration.eventId ?? undefined);
    }
    catch (error) {
        showFeedback(error.response?.data?.message ?? "Não foi possível localizar a inscrição.", "error");
        cancelPending();
    }
    manualLoading.value = false;
    isProcessing.value = false;
};
watch(() => route.params.eventId, (value) => {
    const normalized = typeof value === "string" && value.length ? String(value) : null;
    clearPending();
    void loadDashboard(normalized);
}, { immediate: true });
const confirmPending = async () => {
    if (!pendingCheckin.value ||
        pendingCheckin.value.status !== "READY" ||
        !pendingCheckin.value.confirmation) {
        cancelPending();
        return;
    }
    confirming.value = true;
    isProcessing.value = true;
    const { confirmation, source, registration } = pendingCheckin.value;
    const payload = {
        registrationId: confirmation.registrationId
    };
    if (confirmation.signature) {
        payload.signature = confirmation.signature;
    }
    const dashboardEventId = registration.eventId ?? activeEventId.value;
    try {
        const result = (await admin.confirmCheckin(payload));
        const successMessage = result.status === "ALREADY_CONFIRMED"
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
    }
    catch (error) {
        showFeedback(error.response?.data?.message ?? "Não foi possível confirmar o check-in.", "error");
    }
    finally {
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.checkinPermissions.canList) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-6" },
    });
    if (__VLS_ctx.loadingDashboard) {
        /** @type {[typeof TableSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
            helperText: "📡 Carregando painel de check-in...",
        }));
        const __VLS_1 = __VLS_0({
            helperText: "📡 Carregando painel de check-in...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    }
    else {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_3 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
        }));
        const __VLS_4 = __VLS_3({
            ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_3));
        __VLS_5.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "max-w-2xl" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
            ...{ class: "text-3xl font-semibold text-neutral-900 dark:text-white" },
        });
        (__VLS_ctx.currentEventTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-1 text-sm text-neutral-600 dark:text-neutral-400" },
        });
        if (__VLS_ctx.currentEventDetails) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-2 text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (__VLS_ctx.currentEventDetails);
        }
        const __VLS_6 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
            to: "/admin/dashboard",
            ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        }));
        const __VLS_8 = __VLS_7({
            to: "/admin/dashboard",
            ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        __VLS_9.slots.default;
        var __VLS_9;
        if (__VLS_ctx.summaryCards.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" },
            });
            for (const [card] of __VLS_getVForSourceType((__VLS_ctx.summaryCards))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (card.key),
                    ...{ class: "rounded-2xl border border-white/60 bg-white/80 p-4 shadow-inner shadow-primary-100/30 dark:border-white/10 dark:bg-white/5" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center justify-between" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
                });
                (card.title);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white" },
                    ...{ class: (card.accent) },
                });
                (card.icon);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "mt-2 text-2xl font-bold" },
                    ...{ class: (card.emphasisClass) },
                });
                (card.value);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                (card.label);
            }
        }
        var __VLS_5;
    }
    if (!__VLS_ctx.loadingDashboard) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_10 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/60 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }));
        const __VLS_11 = __VLS_10({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/60 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_10));
        __VLS_12.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-6 lg:grid-cols-12" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-4 lg:col-span-7" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-2xl border border-dashed border-neutral-300/70 bg-white/70 p-3 shadow-inner dark:border-white/20 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "relative w-full overflow-hidden rounded-2xl bg-black/40" },
        });
        const __VLS_13 = {}.QrcodeStream;
        /** @type {[typeof __VLS_components.QrcodeStream, typeof __VLS_components.QrcodeStream, ]} */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
            ...{ 'onDecode': {} },
            ...{ 'onInit': {} },
            ...{ class: "h-[200px] w-full sm:h-[260px]" },
            key: (__VLS_ctx.streamKey),
            constraints: (__VLS_ctx.cameraConstraints),
            paused: (__VLS_ctx.cameraPaused),
        }));
        const __VLS_15 = __VLS_14({
            ...{ 'onDecode': {} },
            ...{ 'onInit': {} },
            ...{ class: "h-[200px] w-full sm:h-[260px]" },
            key: (__VLS_ctx.streamKey),
            constraints: (__VLS_ctx.cameraConstraints),
            paused: (__VLS_ctx.cameraPaused),
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        let __VLS_17;
        let __VLS_18;
        let __VLS_19;
        const __VLS_20 = {
            onDecode: (__VLS_ctx.onDecode)
        };
        const __VLS_21 = {
            onInit: (__VLS_ctx.onInit)
        };
        __VLS_16.slots.default;
        if (__VLS_ctx.cameraStatus) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex h-full min-h-[180px] items-center justify-center text-sm text-neutral-500 dark:text-neutral-400 sm:min-h-[220px]" },
            });
            (__VLS_ctx.cameraStatus);
        }
        var __VLS_16;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.restartCamera) },
            type: "button",
            ...{ class: "inline-flex flex-1 items-center justify-center rounded-full border border-neutral-200/70 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10 sm:flex-none sm:px-5" },
            disabled: (__VLS_ctx.isRestarting),
        });
        (__VLS_ctx.isRestarting ? "Reiniciando..." : "Recarregar câmera");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.toggleFacingMode) },
            type: "button",
            ...{ class: "inline-flex flex-1 items-center justify-center rounded-full border border-neutral-200/70 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10 sm:flex-none sm:px-5" },
            disabled: (__VLS_ctx.isProcessing),
        });
        (__VLS_ctx.facingMode === "environment" ? "frontal" : "traseira");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-4 lg:col-span-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.manualLookup) },
            ...{ class: "grid gap-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.handleCpfInputChange) },
            value: (__VLS_ctx.cpf),
            type: "text",
            placeholder: "000.000.000-00",
            inputmode: "numeric",
            maxlength: "14",
            autocomplete: "off",
            ...{ class: "mt-2 w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
            required: true,
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
        });
        /** @type {[typeof DateField, ]} */ ;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent(DateField, new DateField({
            modelValue: (__VLS_ctx.birthDate),
            required: true,
            ...{ class: "mt-2" },
        }));
        const __VLS_23 = __VLS_22({
            modelValue: (__VLS_ctx.birthDate),
            required: true,
            ...{ class: "mt-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: "submit",
            ...{ class: "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" },
            disabled: (__VLS_ctx.manualLoading || __VLS_ctx.isProcessing || __VLS_ctx.confirming),
        });
        (__VLS_ctx.manualLoading ? "Buscando..." : "Buscar participante");
        if (__VLS_ctx.feedback) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "rounded-2xl px-4 py-3 text-sm" },
                ...{ class: (__VLS_ctx.feedbackClass) },
            });
            (__VLS_ctx.feedback);
        }
        var __VLS_12;
    }
    if (__VLS_ctx.pendingCheckin) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "space-y-4 border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }));
        const __VLS_26 = __VLS_25({
            ...{ class: "space-y-4 border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-col gap-4 md:flex-row md:items-start" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex w-full max-w-[160px] items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" },
        });
        if (__VLS_ctx.pendingCheckin.registration.photoUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.pendingCheckin.registration.photoUrl),
                alt: "Foto do participante",
                ...{ class: "h-40 w-full object-cover" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "px-3 text-center text-xs text-neutral-500 dark:text-neutral-300" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1 space-y-2 text-sm text-neutral-600 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        (__VLS_ctx.pendingCheckin.registration.fullName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ([
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    __VLS_ctx.pendingStatusInfo?.className ?? 'bg-neutral-200 text-neutral-600'
                ]) },
        });
        (__VLS_ctx.pendingStatusInfo?.label ?? "");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-medium text-neutral-700 dark:text-neutral-100" },
        });
        (__VLS_ctx.displayCpf(__VLS_ctx.pendingCheckin.registration.cpf));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.pendingCheckin.registration.eventTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.pendingCheckin.registration.eventPeriod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.pendingCheckin.registration.churchName);
        (__VLS_ctx.pendingCheckin.registration.districtName);
        if (__VLS_ctx.pendingStatusInfo?.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (__VLS_ctx.pendingStatusInfo.description);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-xl border border-neutral-200 bg-white/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        if (__VLS_ctx.historyLoading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-xs text-neutral-400 dark:text-neutral-500" },
            });
        }
        if (__VLS_ctx.latestHistory.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "mt-3 space-y-3" },
            });
            for (const [item] of __VLS_getVForSourceType((__VLS_ctx.latestHistory))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (item.type + item.at),
                    ...{ class: "border-l-2 border-neutral-200 pl-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "font-medium text-neutral-800 dark:text-neutral-100" },
                });
                (__VLS_ctx.formatHistoryLabel(item));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
                });
                (__VLS_ctx.formatDateTime(item.at));
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-3 text-xs text-neutral-500 dark:text-neutral-400" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap gap-3" },
        });
        if (__VLS_ctx.pendingCheckin.status === 'READY') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.confirmPending) },
                type: "button",
                ...{ class: "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" },
                disabled: (__VLS_ctx.confirming),
            });
            (__VLS_ctx.confirming ? "Confirmando..." : "Confirmar presenca");
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelPending) },
            type: "button",
            ...{ class: "inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
            disabled: (__VLS_ctx.confirming),
        });
        (__VLS_ctx.pendingCheckin.status === "READY" ? "Cancelar" : "Fechar");
        var __VLS_27;
    }
    if (__VLS_ctx.admin.dashboard && !__VLS_ctx.loadingDashboard) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }));
        const __VLS_29 = __VLS_28({
            ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        __VLS_30.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "mt-4 space-y-2 text-sm text-neutral-500" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.admin.dashboard.latest))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (item.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-medium text-neutral-700 dark:text-neutral-100" },
            });
            (item.fullName);
            (__VLS_ctx.formatDateTime(item.checkinAt));
        }
        var __VLS_30;
    }
}
else {
    /** @type {[typeof AccessDeniedNotice, ]} */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(AccessDeniedNotice, new AccessDeniedNotice({
        module: "checkin",
        action: "view",
    }));
    const __VLS_32 = __VLS_31({
        module: "checkin",
        action: "view",
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    var __VLS_34 = {};
    var __VLS_33;
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-primary-50/40']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-100/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-950/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['xl:grid-cols-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-100/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-9']} */ ;
/** @type {__VLS_StyleScopedClasses['w-9']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50/60']} */ ;
/** @type {__VLS_StyleScopedClasses['to-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-span-7']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['h-[200px]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:h-[260px]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-[180px]']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:min-h-[220px]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-none']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-none']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-span-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
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
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:placeholder-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['to-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-[160px]']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['h-40']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-l-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['pl-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['to-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            QrcodeStream: QrcodeStream,
            BaseCard: BaseCard,
            DateField: DateField,
            TableSkeleton: TableSkeleton,
            AccessDeniedNotice: AccessDeniedNotice,
            admin: admin,
            checkinPermissions: checkinPermissions,
            loadingDashboard: loadingDashboard,
            cpf: cpf,
            birthDate: birthDate,
            feedback: feedback,
            feedbackClass: feedbackClass,
            facingMode: facingMode,
            streamKey: streamKey,
            isProcessing: isProcessing,
            isRestarting: isRestarting,
            manualLoading: manualLoading,
            confirming: confirming,
            pendingCheckin: pendingCheckin,
            historyLoading: historyLoading,
            cameraConstraints: cameraConstraints,
            cameraPaused: cameraPaused,
            cameraStatus: cameraStatus,
            currentEventTitle: currentEventTitle,
            currentEventDetails: currentEventDetails,
            summaryCards: summaryCards,
            formatDateTime: formatDateTime,
            pendingStatusInfo: pendingStatusInfo,
            latestHistory: latestHistory,
            formatHistoryLabel: formatHistoryLabel,
            displayCpf: displayCpf,
            handleCpfInputChange: handleCpfInputChange,
            cancelPending: cancelPending,
            restartCamera: restartCamera,
            toggleFacingMode: toggleFacingMode,
            onDecode: onDecode,
            onInit: onInit,
            manualLookup: manualLookup,
            confirmPending: confirmPending,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminCheckin.vue.js.map