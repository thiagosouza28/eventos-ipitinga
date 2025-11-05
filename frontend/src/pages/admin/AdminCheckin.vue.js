/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { QrcodeStream } from "vue-qrcode-reader";
import { formatCPF } from "../../utils/cpf";
import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
const route = useRoute();
const admin = useAdminStore();
const cpf = ref("");
const birthDate = ref("");
const feedback = ref("");
const feedbackClass = ref("");
const cpfMask = { mask: "###.###.###-##" };
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
let feedbackTimer = null;
const cameraConstraints = computed(() => ({
    facingMode: { ideal: facingMode.value },
    aspectRatio: { ideal: 1.777 }
}));
const awaitingScanConfirmation = computed(() => pendingCheckin.value?.source === "scan" && pendingCheckin.value.status === "READY");
const cameraPaused = computed(() => !cameraReady.value ||
    isProcessing.value ||
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
const displayCpf = (value) => formatCPF(value);
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
    const eventId = route.params.eventId;
    if (!eventId)
        return;
    await admin.loadDashboard(eventId);
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
        variant === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
    if (feedbackTimer)
        window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
        feedback.value = "";
        feedbackClass.value = "";
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
        await loadDashboard();
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
    }
    catch (error) {
        showFeedback(error.response?.data?.message ?? "Não foi possível localizar a inscrição.", "error");
        cancelPending();
    }
    manualLoading.value = false;
    isProcessing.value = false;
};
const confirmPending = async () => {
    if (!pendingCheckin.value ||
        pendingCheckin.value.status !== "READY" ||
        !pendingCheckin.value.confirmation) {
        cancelPending();
        return;
    }
    confirming.value = true;
    isProcessing.value = true;
    const { confirmation, source } = pendingCheckin.value;
    const payload = {
        registrationId: confirmation.registrationId
    };
    if (confirmation.signature) {
        payload.signature = confirmation.signature;
    }
    try {
        const result = (await admin.confirmCheckin(payload));
        const successMessage = result.status === "ALREADY_CONFIRMED"
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
    await loadDashboard();
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
    ...{ class: "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-2xl font-semibold text-neutral-800 dark:text-neutral-50" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-neutral-500" },
});
const __VLS_3 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    to: "/admin/dashboard",
    ...{ class: "inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto" },
}));
const __VLS_5 = __VLS_4({
    to: "/admin/dashboard",
    ...{ class: "inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto" },
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
var __VLS_6;
var __VLS_2;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_9.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-6 md:grid-cols-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700" },
});
const __VLS_10 = {}.QrcodeStream;
/** @type {[typeof __VLS_components.QrcodeStream, typeof __VLS_components.QrcodeStream, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
    ...{ 'onDecode': {} },
    ...{ 'onInit': {} },
    key: (__VLS_ctx.streamKey),
    constraints: (__VLS_ctx.cameraConstraints),
    paused: (__VLS_ctx.cameraPaused),
}));
const __VLS_12 = __VLS_11({
    ...{ 'onDecode': {} },
    ...{ 'onInit': {} },
    key: (__VLS_ctx.streamKey),
    constraints: (__VLS_ctx.cameraConstraints),
    paused: (__VLS_ctx.cameraPaused),
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
let __VLS_14;
let __VLS_15;
let __VLS_16;
const __VLS_17 = {
    onDecode: (__VLS_ctx.onDecode)
};
const __VLS_18 = {
    onInit: (__VLS_ctx.onInit)
};
__VLS_13.slots.default;
if (__VLS_ctx.cameraStatus) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex h-full min-h-[220px] items-center justify-center text-sm text-neutral-500" },
    });
    (__VLS_ctx.cameraStatus);
}
var __VLS_13;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-wrap items-center gap-3 text-sm text-neutral-500" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.restartCamera) },
    type: "button",
    ...{ class: "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto" },
    disabled: (__VLS_ctx.isRestarting),
});
(__VLS_ctx.isRestarting ? "Reiniciando..." : "Recarregar camera");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleFacingMode) },
    type: "button",
    ...{ class: "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800 sm:w-auto" },
    disabled: (__VLS_ctx.isProcessing),
});
(__VLS_ctx.facingMode === "environment" ? "frontal" : "traseira");
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-xs text-neutral-400" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.manualLookup) },
    ...{ class: "grid gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.cpf),
    type: "text",
    placeholder: "000.000.000-00",
    inputmode: "numeric",
    autocomplete: "off",
    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
    required: true,
});
__VLS_asFunctionalDirective(__VLS_directives.vMaska)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.cpfMask) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-xs font-semibold uppercase text-neutral-500" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
    ...{ class: "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" },
    required: true,
});
(__VLS_ctx.birthDate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    type: "submit",
    ...{ class: "w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto" },
    disabled: (__VLS_ctx.manualLoading || __VLS_ctx.isProcessing || __VLS_ctx.confirming),
});
(__VLS_ctx.manualLoading ? "Buscando..." : "Buscar participante");
if (__VLS_ctx.feedback) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: (__VLS_ctx.feedbackClass) },
        ...{ class: "rounded-lg px-4 py-3 text-sm" },
    });
    (__VLS_ctx.feedback);
}
var __VLS_9;
if (__VLS_ctx.pendingCheckin) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "space-y-4" },
    }));
    const __VLS_20 = __VLS_19({
        ...{ class: "space-y-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_21.slots.default;
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
        ...{ class: "flex flex-wrap gap-3" },
    });
    if (__VLS_ctx.pendingCheckin.status === 'READY') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.confirmPending) },
            type: "button",
            ...{ class: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70" },
            disabled: (__VLS_ctx.confirming),
        });
        (__VLS_ctx.confirming ? "Confirmando..." : "Confirmar presenca");
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.cancelPending) },
        type: "button",
        ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" },
        disabled: (__VLS_ctx.confirming),
    });
    (__VLS_ctx.pendingCheckin.status === "READY" ? "Cancelar" : "Fechar");
    var __VLS_21;
}
if (__VLS_ctx.admin.dashboard) {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
    const __VLS_23 = __VLS_22({}, ...__VLS_functionalComponentArgsRest(__VLS_22));
    __VLS_24.slots.default;
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
    var __VLS_24;
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
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
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-[220px]']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
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
            admin: admin,
            cpf: cpf,
            birthDate: birthDate,
            feedback: feedback,
            feedbackClass: feedbackClass,
            cpfMask: cpfMask,
            facingMode: facingMode,
            streamKey: streamKey,
            isProcessing: isProcessing,
            isRestarting: isRestarting,
            manualLoading: manualLoading,
            confirming: confirming,
            pendingCheckin: pendingCheckin,
            cameraConstraints: cameraConstraints,
            cameraPaused: cameraPaused,
            cameraStatus: cameraStatus,
            formatDateTime: formatDateTime,
            pendingStatusInfo: pendingStatusInfo,
            displayCpf: displayCpf,
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