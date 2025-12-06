/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, reactive, ref } from "vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import Modal from "../../components/ui/Modal.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import { formatCurrency, formatDate } from "../../utils/format";
import { useAdminStore } from "../../stores/admin";
import { useAuthStore } from "../../stores/auth";
const admin = useAdminStore();
const auth = useAuthStore();
const loading = ref(true);
const loadingTransfer = ref(false);
const summaries = ref([]);
const transferOrders = ref([]);
const transfers = ref([]);
const selectedDistrictId = ref(null);
const transferModal = reactive({
    open: false,
    districtId: "",
    districtName: "",
    adminName: "",
    pixKey: "",
    amountCents: 0
});
const errorDialog = reactive({
    open: false,
    title: "",
    message: "",
    details: ""
});
const isAdminGeral = computed(() => auth.role === "AdminGeral");
const selectedSummary = computed(() => {
    if (!summaries.value.length)
        return null;
    const target = summaries.value.find((entry) => entry.district.id === selectedDistrictId.value);
    return target ?? summaries.value[0] ?? null;
});
const showError = (title, error) => {
    errorDialog.title = title;
    errorDialog.message = error?.response?.data?.message || error?.message || "Erro desconhecido";
    errorDialog.details = error?.response?.data?.details || "";
    errorDialog.open = true;
};
const loadDistrictDetails = async (districtId) => {
    selectedDistrictId.value = districtId;
    try {
        transferOrders.value = await admin.loadDistrictPendingOrders(districtId);
        transfers.value = await admin.loadDistrictTransfers(districtId);
    }
    catch (error) {
        showError("Erro ao carregar dados do distrito", error);
    }
};
const selectDistrict = async (districtId) => {
    await loadDistrictDetails(districtId);
};
const openTransfer = async (summary) => {
    transferModal.open = true;
    transferModal.districtId = summary.district.id;
    transferModal.districtName = summary.district.name;
    transferModal.adminName = summary.admin?.name || "Administrador distrital";
    transferModal.pixKey = summary.admin?.pixKey || "";
    transferModal.amountCents = summary.availableToTransferCents || summary.totals.pendingCents || 0;
    try {
        transferOrders.value = await admin.loadDistrictPendingOrders(summary.district.id);
        transferModal.amountCents = transferOrders.value.reduce((sum, order) => sum + (order.amountToTransfer || 0), 0);
    }
    catch (error) {
        showError("Erro ao carregar pedidos pendentes", error);
    }
};
const confirmTransfer = async () => {
    if (!transferModal.districtId)
        return;
    try {
        loadingTransfer.value = true;
        await admin.createDistrictTransfer(transferModal.districtId);
        transferModal.open = false;
        await loadData();
        if (selectedSummary.value) {
            await loadDistrictDetails(selectedSummary.value.district.id);
        }
    }
    catch (error) {
        showError("Falha ao realizar repasse", error);
    }
    finally {
        loadingTransfer.value = false;
    }
};
const loadData = async () => {
    try {
        loading.value = true;
        const data = await admin.loadDistrictFinance();
        summaries.value = data;
        const defaultDistrict = auth.role === "AdminDistrital" && data.length ? data[0].district.id : data[0]?.district.id;
        if (defaultDistrict) {
            await loadDistrictDetails(defaultDistrict);
        }
    }
    catch (error) {
        showError("Erro ao carregar dados financeiros", error);
    }
    finally {
        loading.value = false;
    }
};
onMounted(async () => {
    await loadData();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-6" },
});
/** @type {[typeof ErrorDialog, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ErrorDialog, new ErrorDialog({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.errorDialog.open),
    title: (__VLS_ctx.errorDialog.title),
    message: (__VLS_ctx.errorDialog.message),
    details: (__VLS_ctx.errorDialog.details),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.errorDialog.open),
    title: (__VLS_ctx.errorDialog.title),
    message: (__VLS_ctx.errorDialog.message),
    details: (__VLS_ctx.errorDialog.details),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    'onUpdate:modelValue': (...[$event]) => {
        __VLS_ctx.errorDialog.open = $event;
    }
};
var __VLS_2;
/** @type {[typeof Modal, typeof Modal, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(Modal, new Modal({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.transferModal.open),
    title: "Confirmar repasse",
}));
const __VLS_8 = __VLS_7({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.transferModal.open),
    title: "Confirmar repasse",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_10;
let __VLS_11;
let __VLS_12;
const __VLS_13 = {
    'onUpdate:modelValue': (...[$event]) => {
        __VLS_ctx.transferModal.open = $event;
    }
};
__VLS_9.slots.default;
if (__VLS_ctx.transferModal.districtId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "text-lg font-semibold text-neutral-900 dark:text-white" },
    });
    (__VLS_ctx.transferModal.districtName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-600 dark:text-neutral-400" },
    });
    (__VLS_ctx.transferModal.adminName);
    (__VLS_ctx.transferModal.pixKey || "PIX não informado");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-500/40 dark:bg-primary-900/10" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.28em] text-primary-700 dark:text-primary-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2 text-3xl font-bold text-primary-700 dark:text-primary-200" },
    });
    (__VLS_ctx.formatCurrency(__VLS_ctx.transferModal.amountCents));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-primary-700/80 dark:text-primary-200/80" },
    });
    (__VLS_ctx.transferOrders.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2 max-h-64 overflow-y-auto rounded-lg border border-neutral-200/70 bg-white/90 p-3 dark:border-white/10 dark:bg-neutral-900/60" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400" },
    });
    if (__VLS_ctx.transferOrders.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "py-4 text-sm text-neutral-500 dark:text-neutral-400" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-3" },
        });
        for (const [order] of __VLS_getVForSourceType((__VLS_ctx.transferOrders))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (order.id),
                ...{ class: "flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-semibold text-neutral-800 dark:text-white" },
            });
            (order.id.slice(0, 6));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (order.registrations?.length || 0);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-sm font-semibold text-primary-700 dark:text-primary-300" },
            });
            (__VLS_ctx.formatCurrency(order.amountToTransfer));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-end gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.transferModal.districtId))
                    return;
                __VLS_ctx.transferModal.open = false;
            } },
        type: "button",
        ...{ class: "rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmTransfer) },
        type: "button",
        ...{ class: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60" },
        disabled: (__VLS_ctx.loadingTransfer || __VLS_ctx.transferModal.amountCents <= 0),
    });
    (__VLS_ctx.loadingTransfer ? "Enviando..." : "Confirmar repasse");
}
var __VLS_9;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white shadow-xl shadow-primary-600/30" },
}));
const __VLS_15 = __VLS_14({
    ...{ class: "bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white shadow-xl shadow-primary-600/30" },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
__VLS_16.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs uppercase tracking-[0.35em] text-white/70" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-3xl font-semibold leading-tight" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "max-w-3xl text-sm text-white/80" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur" },
});
var __VLS_16;
if (__VLS_ctx.loading) {
    /** @type {[typeof TableSkeleton, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
        rows: (3),
        helperText: "Carregando dados financeiros...",
    }));
    const __VLS_18 = __VLS_17({
        rows: (3),
        helperText: "Carregando dados financeiros...",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
else {
    if (__VLS_ctx.isAdminGeral) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }));
        const __VLS_21 = __VLS_20({
            ...{ class: "border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        __VLS_22.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-4 flex items-center justify-between gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-xl font-semibold text-neutral-900 dark:text-white" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overflow-x-auto" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "min-w-full divide-y divide-neutral-200 text-sm dark:divide-white/10" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: "bg-neutral-50/80 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ class: "text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({
            ...{ class: "divide-y divide-neutral-100 dark:divide-white/5" },
        });
        for (const [summary] of __VLS_getVForSourceType((__VLS_ctx.summaries))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (summary.district.id),
                ...{ class: "hover:bg-neutral-50/80 dark:hover:bg-white/5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "font-semibold text-neutral-900 dark:text-white" },
            });
            (summary.district.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-neutral-500" },
            });
            (summary.district.id.slice(0, 6));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "font-medium text-neutral-800 dark:text-neutral-100" },
            });
            (summary.admin?.name || "Não informado");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-neutral-500" },
            });
            (summary.admin?.email || "Sem e-mail");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-white/10 dark:text-white" },
            });
            (summary.admin?.pixKey || "Sem chave");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 text-right font-semibold text-neutral-900 dark:text-white" },
            });
            (__VLS_ctx.formatCurrency(summary.totals.collectedCents));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 text-right text-primary-700 dark:text-primary-300" },
            });
            (__VLS_ctx.formatCurrency(summary.totals.transferredCents));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 text-right text-amber-700 dark:text-amber-300" },
            });
            (__VLS_ctx.formatCurrency(summary.totals.pendingCents));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 text-right" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" },
            });
            (summary.pendingOrdersCount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 text-right" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex items-center justify-end gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.isAdminGeral))
                            return;
                        __VLS_ctx.selectDistrict(summary.district.id);
                    } },
                type: "button",
                ...{ class: "rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.isAdminGeral))
                            return;
                        __VLS_ctx.openTransfer(summary);
                    } },
                type: "button",
                ...{ class: "rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60" },
                disabled: (!summary.admin?.pixKey || summary.availableToTransferCents <= 0 || __VLS_ctx.loadingTransfer),
            });
        }
        var __VLS_22;
    }
    if (__VLS_ctx.selectedSummary) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-4 md:grid-cols-3" },
        });
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_23 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "md:col-span-2 border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }));
        const __VLS_24 = __VLS_23({
            ...{ class: "md:col-span-2 border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_23));
        __VLS_25.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-4 flex items-center justify-between gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-xl font-semibold text-neutral-900 dark:text-white" },
        });
        (__VLS_ctx.selectedSummary.district.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-neutral-500" },
        });
        (__VLS_ctx.selectedSummary.admin?.pixKey ? "PIX pronto para repasse" : "Cadastre uma chave PIX para o administrador distrital");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap justify-end gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 dark:bg-white/10 dark:text-white" },
        });
        (__VLS_ctx.formatCurrency(__VLS_ctx.selectedSummary.totals.collectedCents));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-200" },
        });
        (__VLS_ctx.formatCurrency(__VLS_ctx.selectedSummary.totals.pendingCents));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-primary-100 bg-primary-50/80 p-4 dark:border-primary-500/30 dark:bg-primary-900/20" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-primary-700 dark:text-primary-200" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-2xl font-bold text-primary-700 dark:text-primary-200" },
        });
        (__VLS_ctx.formatCurrency(__VLS_ctx.selectedSummary.totals.pendingCents));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-500/30 dark:bg-emerald-900/20" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-200" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-200" },
        });
        (__VLS_ctx.formatCurrency(__VLS_ctx.selectedSummary.totals.transferredCents));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-base font-semibold text-neutral-800 dark:text-white" },
        });
        (__VLS_ctx.selectedSummary.admin?.pixKey || "Sem chave");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
        });
        (__VLS_ctx.selectedSummary.admin?.pixType || "Defina o tipo");
        var __VLS_25;
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_26 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }));
        const __VLS_27 = __VLS_26({
            ...{ class: "border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_26));
        __VLS_28.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-4 flex items-center justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-900 dark:text-white" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-white/10 dark:text-white" },
        });
        (__VLS_ctx.transfers.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-3 max-h-[360px] overflow-y-auto" },
        });
        if (__VLS_ctx.transfers.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400" },
            });
        }
        for (const [transfer] of __VLS_getVForSourceType((__VLS_ctx.transfers))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (transfer.id),
                ...{ class: "flex items-start justify-between rounded-lg border border-neutral-100 bg-neutral-50/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "font-semibold text-neutral-800 dark:text-white" },
            });
            (__VLS_ctx.formatCurrency(transfer.amount));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
            });
            (__VLS_ctx.formatDate(transfer.createdAt));
            (transfer.mpTransferId || "PIX");
            if (transfer.errorMessage) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "mt-1 text-xs text-red-600 dark:text-red-400" },
                });
                (transfer.errorMessage);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rounded-full px-3 py-1 text-xs font-semibold" },
                ...{ class: (transfer.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : transfer.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200') },
            });
            (transfer.status);
        }
        var __VLS_28;
    }
    if (__VLS_ctx.selectedSummary) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }));
        const __VLS_30 = __VLS_29({
            ...{ class: "border border-white/40 bg-white/90 shadow-lg dark:border-white/10 dark:bg-neutral-900" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_31.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-4 flex items-center justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold text-neutral-900 dark:text-white" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
        });
        (__VLS_ctx.transferOrders.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overflow-x-auto" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "min-w-full divide-y divide-neutral-200 text-sm dark:divide-white/10" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: "bg-neutral-50/80 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ class: "text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "px-3 py-2 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({
            ...{ class: "divide-y divide-neutral-100 dark:divide-white/5" },
        });
        if (__VLS_ctx.transferOrders.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                colspan: "3",
                ...{ class: "px-3 py-4 text-center text-neutral-500 dark:text-neutral-400" },
            });
        }
        for (const [order] of __VLS_getVForSourceType((__VLS_ctx.transferOrders))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (order.id),
                ...{ class: "hover:bg-neutral-50/80 dark:hover:bg-white/5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 font-semibold text-neutral-900 dark:text-white" },
            });
            (order.id.slice(0, 6));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 text-neutral-700 dark:text-neutral-200" },
            });
            (order.registrations?.length || 0);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "px-3 py-3 text-right font-semibold text-neutral-900 dark:text-white" },
            });
            (__VLS_ctx.formatCurrency(order.amountToTransfer));
        }
        var __VLS_31;
    }
    if (!__VLS_ctx.summaries.length) {
        /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
            ...{ class: "border border-dashed border-neutral-200 bg-white/80 text-center text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300" },
        }));
        const __VLS_33 = __VLS_32({
            ...{ class: "border border-dashed border-neutral-200 bg-white/80 text-center text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_34.slots.default;
        var __VLS_34;
    }
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50/70']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-900/10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.28em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-64']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.28em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-neutral-800']} */ ;
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
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['via-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-600/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/15']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.28em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-amber-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-amber-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.28em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-900/20']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-emerald-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-emerald-500/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-900/20']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-200']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.28em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[360px]']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.28em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-neutral-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BaseCard: BaseCard,
            TableSkeleton: TableSkeleton,
            Modal: Modal,
            ErrorDialog: ErrorDialog,
            formatCurrency: formatCurrency,
            formatDate: formatDate,
            loading: loading,
            loadingTransfer: loadingTransfer,
            summaries: summaries,
            transferOrders: transferOrders,
            transfers: transfers,
            transferModal: transferModal,
            errorDialog: errorDialog,
            isAdminGeral: isAdminGeral,
            selectedSummary: selectedSummary,
            selectDistrict: selectDistrict,
            openTransfer: openTransfer,
            confirmTransfer: confirmTransfer,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminDistrictFinance.vue.js.map