/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { reactive, ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import { useCatalogStore } from "../../stores/catalog";
const catalog = useCatalogStore();
const editingDistrictId = ref(null);
const showDistrictModal = ref(false);
const districtForm = reactive({ name: "", pastorName: "" });
const districtError = ref("");
const errorDialog = reactive({
    open: false,
    title: "Ocorreu um erro",
    message: "",
    details: ""
});
const confirmDelete = reactive({
    open: false,
    title: "",
    description: "",
    id: ""
});
const extractErrorInfo = (error) => {
    const anyError = error;
    const responseData = anyError?.response?.data ?? {};
    const message = (typeof responseData.message === "string" && responseData.message) ||
        anyError?.message ||
        "Ocorreu um erro inesperado.";
    const rawDetails = responseData?.details;
    const details = typeof rawDetails === "string"
        ? rawDetails
        : rawDetails
            ? JSON.stringify(rawDetails, null, 2)
            : "";
    return { message, details };
};
const showError = (title, error) => {
    const { message, details } = extractErrorInfo(error);
    errorDialog.title = title;
    errorDialog.message = message;
    errorDialog.details = details;
    errorDialog.open = true;
};
const openNewDistrictForm = () => {
    editingDistrictId.value = null;
    districtForm.name = "";
    districtForm.pastorName = "";
    districtError.value = "";
    showDistrictModal.value = true;
};
const resetDistrictForm = () => {
    editingDistrictId.value = null;
    districtForm.name = "";
    districtForm.pastorName = "";
    districtError.value = "";
    showDistrictModal.value = false;
};
const submitDistrict = async () => {
    const name = districtForm.name.trim();
    const pastorName = districtForm.pastorName.trim();
    if (!name) {
        districtError.value = "Informe um nome para o distrito.";
        return;
    }
    if (!pastorName) {
        districtError.value = "Informe o nome do pastor distrital.";
        return;
    }
    districtError.value = "";
    try {
        const payload = {
            name: String(name),
            pastorName: String(pastorName)
        };
        if (editingDistrictId.value) {
            await catalog.updateDistrict(editingDistrictId.value, payload);
        }
        else {
            await catalog.createDistrict(payload);
        }
        resetDistrictForm();
    }
    catch (error) {
        showError(editingDistrictId.value ? "Falha ao atualizar distrito" : "Falha ao criar distrito", error);
    }
};
const startDistrictEdit = (district) => {
    editingDistrictId.value = district.id;
    districtForm.name = district.name;
    districtForm.pastorName = district.pastorName ?? "";
    districtError.value = "";
    showDistrictModal.value = true;
};
const confirmDeleteDistrict = (district) => {
    confirmDelete.open = true;
    confirmDelete.title = "Excluir Distrito";
    confirmDelete.description = `Tem certeza que deseja excluir o distrito "${district.name}"? Esta ação não pode ser desfeita.`;
    confirmDelete.id = district.id;
};
const handleConfirmDelete = async () => {
    if (!confirmDelete.id)
        return;
    try {
        await catalog.deleteDistrict(confirmDelete.id);
        confirmDelete.open = false;
        confirmDelete.id = null;
    }
    catch (error) {
        showError("Falha ao excluir distrito", error);
    }
};
onMounted(async () => {
    try {
        await catalog.loadDistricts();
    }
    catch (error) {
        showError("Falha ao carregar distritos", error);
    }
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
/** @type {[typeof ConfirmDialog, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(ConfirmDialog, new ConfirmDialog({
    ...{ 'onConfirm': {} },
    ...{ 'onCancel': {} },
    modelValue: (__VLS_ctx.confirmDelete.open),
    title: (__VLS_ctx.confirmDelete.title),
    description: (__VLS_ctx.confirmDelete.description),
    type: "danger",
    confirmLabel: "Excluir",
    cancelLabel: "Cancelar",
}));
const __VLS_8 = __VLS_7({
    ...{ 'onConfirm': {} },
    ...{ 'onCancel': {} },
    modelValue: (__VLS_ctx.confirmDelete.open),
    title: (__VLS_ctx.confirmDelete.title),
    description: (__VLS_ctx.confirmDelete.description),
    type: "danger",
    confirmLabel: "Excluir",
    cancelLabel: "Cancelar",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_10;
let __VLS_11;
let __VLS_12;
const __VLS_13 = {
    onConfirm: (__VLS_ctx.handleConfirmDelete)
};
const __VLS_14 = {
    onCancel: (...[$event]) => {
        __VLS_ctx.confirmDelete.open = false;
    }
};
var __VLS_9;
/** @type {[typeof Modal, typeof Modal, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(Modal, new Modal({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.showDistrictModal),
    title: (__VLS_ctx.editingDistrictId ? 'Editar Distrito' : 'Novo Distrito'),
}));
const __VLS_16 = __VLS_15({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.showDistrictModal),
    title: (__VLS_ctx.editingDistrictId ? 'Editar Distrito' : 'Novo Distrito'),
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
let __VLS_18;
let __VLS_19;
let __VLS_20;
const __VLS_21 = {
    'onUpdate:modelValue': (...[$event]) => {
        __VLS_ctx.showDistrictModal = $event;
    }
};
__VLS_17.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.submitDistrict) },
    ...{ class: "space-y-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-red-500" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.districtForm.name),
    type: "text",
    required: true,
    ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
    placeholder: "Nome do distrito",
});
if (__VLS_ctx.districtError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-red-500 dark:text-red-400" },
    });
    (__VLS_ctx.districtError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-sm font-semibold text-neutral-700 dark:text-neutral-100" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-red-500" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.districtForm.pastorName),
    type: "text",
    required: true,
    ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
    placeholder: "Nome completo do pastor distrital",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetDistrictForm) },
    type: "button",
    ...{ class: "inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    type: "submit",
    ...{ class: "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5" },
});
(__VLS_ctx.editingDistrictId ? "Salvar" : "Adicionar");
var __VLS_17;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
}));
const __VLS_23 = __VLS_22({
    ...{ class: "bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30" },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "mt-1 text-sm text-neutral-600 dark:text-neutral-400" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-center" },
});
const __VLS_25 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    to: "/admin/dashboard",
    ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
}));
const __VLS_27 = __VLS_26({
    to: "/admin/dashboard",
    ...{ class: "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10" },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
__VLS_28.slots.default;
var __VLS_28;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openNewDistrictForm) },
    type: "button",
    ...{ class: "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition hover:translate-y-0.5" },
});
var __VLS_24;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
}));
const __VLS_30 = __VLS_29({
    ...{ class: "border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40" },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-2xl font-semibold text-neutral-900 dark:text-white" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs text-neutral-500 dark:text-neutral-400 sm:max-w-xs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-6 hidden overflow-hidden rounded-sm border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/40 md:block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
    ...{ class: "w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
    ...{ class: "bg-white/60 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: "px-5 py-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: "px-5 py-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: "px-5 py-3 text-right" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({
    ...{ class: "divide-y divide-neutral-100 dark:divide-white/5" },
});
for (const [district] of __VLS_getVForSourceType((__VLS_ctx.catalog.districts))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        key: (district.id),
        ...{ class: "transition hover:bg-white/80 dark:hover:bg-white/5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "px-5 py-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "font-semibold text-neutral-900 dark:text-white" },
    });
    (district.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300" },
    });
    (district.pastorName || "Não informado");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "px-5 py-4 text-right" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inline-flex flex-wrap items-center justify-end gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.startDistrictEdit(district);
            } },
        ...{ class: "inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.confirmDeleteDistrict(district);
            } },
        ...{ class: "inline-flex items-center gap-1 rounded-full border border-red-200/70 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30" },
    });
}
if (!__VLS_ctx.catalog.districts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400" },
        colspan: "3",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-6 flex flex-col gap-4 md:hidden" },
});
for (const [district] of __VLS_getVForSourceType((__VLS_ctx.catalog.districts))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (district.id),
        ...{ class: "rounded-3xl border border-white/10 bg-white/90 p-4 text-sm shadow-[0_18px_40px_-25px_rgba(15,23,42,0.75)] dark:border-white/5 dark:bg-neutral-950/40 dark:text-neutral-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-start justify-between gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.35em] text-neutral-500" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-base font-semibold text-neutral-900 dark:text-white" },
    });
    (district.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "rounded-full border border-[color:var(--border-card)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-4 text-xs text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "font-semibold text-neutral-800 dark:text-neutral-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-1 text-base text-neutral-900 dark:text-white" },
    });
    (district.pastorName || "Não informado");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-4 grid grid-cols-2 gap-2 text-xs font-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.startDistrictEdit(district);
            } },
        ...{ class: "rounded-full border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.confirmDeleteDistrict(district);
            } },
        ...{ class: "rounded-full border border-red-200 px-4 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30" },
    });
}
if (!__VLS_ctx.catalog.districts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-3xl border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400" },
    });
}
var __VLS_31;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-neutral-400']} */ ;
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
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-neutral-400']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-end']} */ ;
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
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
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
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['shadow-primary-500/50']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
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
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:max-w-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['md:block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200/60']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-red-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_18px_40px_-25px_rgba(15,23,42,0.75)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-primary-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-red-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            BaseCard: BaseCard,
            ErrorDialog: ErrorDialog,
            ConfirmDialog: ConfirmDialog,
            Modal: Modal,
            catalog: catalog,
            editingDistrictId: editingDistrictId,
            showDistrictModal: showDistrictModal,
            districtForm: districtForm,
            districtError: districtError,
            errorDialog: errorDialog,
            confirmDelete: confirmDelete,
            openNewDistrictForm: openNewDistrictForm,
            resetDistrictForm: resetDistrictForm,
            submitDistrict: submitDistrict,
            startDistrictEdit: startDistrictEdit,
            confirmDeleteDistrict: confirmDeleteDistrict,
            handleConfirmDelete: handleConfirmDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminDistricts.vue.js.map