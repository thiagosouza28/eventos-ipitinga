/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, reactive } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { BanknotesIcon, BuildingOffice2Icon, CalendarDaysIcon, ClipboardDocumentListIcon, MapPinIcon, QrCodeIcon, ShieldCheckIcon, UserPlusIcon, UsersIcon } from "@heroicons/vue/24/outline";
import BaseCard from "../../components/ui/BaseCard.vue";
import Modal from "../../components/ui/Modal.vue";
import { useAdminStore } from "../../stores/admin";
import { formatDate } from "../../utils/format";
import { useAuthStore } from "../../stores/auth";
const admin = useAdminStore();
const auth = useAuthStore();
const router = useRouter();
const canViewEvents = computed(() => auth.hasPermission("events", "view"));
const canViewOrders = computed(() => auth.hasPermission("orders", "view"));
const canViewRegistrations = computed(() => auth.hasPermission("registrations", "view"));
const canViewFinancial = computed(() => auth.hasPermission("financial", "view"));
const canManageCatalog = computed(() => auth.hasPermission("catalog", "view"));
const canManageDistricts = computed(() => auth.hasPermission("districts", "view"));
const canManageChurches = computed(() => auth.hasPermission("churches", "view"));
onMounted(async () => {
    const tasks = [];
    if (canViewEvents.value)
        tasks.push(admin.loadEvents());
    if (canViewOrders.value)
        tasks.push(admin.loadOrders({}));
    if (canViewRegistrations.value)
        tasks.push(admin.loadRegistrations({}));
    try {
        await Promise.all(tasks);
    }
    catch (error) {
        console.error("Falha ao carregar dados iniciais do dashboard", error);
    }
});
const activeEvents = computed(() => admin.events.filter((event) => event.isActive).length);
const selectableCheckinEvents = computed(() => {
    const actives = admin.events.filter((event) => event.isActive);
    return actives.length ? actives : admin.events;
});
const hasCheckinEvents = computed(() => selectableCheckinEvents.value.length > 0);
const checkinDialog = reactive({
    open: false,
    eventId: ""
});
const openCheckinDialog = () => {
    if (!hasCheckinEvents.value)
        return;
    checkinDialog.eventId = selectableCheckinEvents.value[0]?.id ?? "";
    checkinDialog.open = true;
};
const confirmCheckinNavigation = async () => {
    if (!checkinDialog.eventId)
        return;
    checkinDialog.open = false;
    await router.push({ name: "admin-checkin", params: { eventId: checkinDialog.eventId } });
};
const quickActions = computed(() => {
    const actions = [];
    if (canViewEvents.value) {
        actions.push({
            id: "events",
            label: "Gerenciar eventos",
            subtitle: "Datas, lotes e comunicados",
            to: "/admin/events",
            icon: CalendarDaysIcon,
            variant: "secondary"
        });
    }
    if (canManageDistricts.value) {
        actions.push({
            id: "districts",
            label: "Distritos",
            subtitle: "Estruture regioes de apoio",
            to: "/admin/districts",
            icon: MapPinIcon,
            variant: "outline"
        });
    }
    if (canManageChurches.value) {
        actions.push({
            id: "churches",
            label: "Igrejas",
            subtitle: "Cadastre congregacoes",
            to: "/admin/churches",
            icon: BuildingOffice2Icon,
            variant: "outline"
        });
    }
    if (auth.isAdminGeral) {
        actions.push({
            id: "ministries",
            label: "Ministerios",
            subtitle: "Coordene equipes",
            to: "/admin/ministries",
            icon: UsersIcon,
            variant: "outline"
        }, {
            id: "users",
            label: "Cadastrar usuarios",
            subtitle: "Perfis de acesso",
            to: { name: "admin-users" },
            icon: UserPlusIcon,
            variant: "outline"
        }, {
            id: "profiles",
            label: "Permissões",
            subtitle: "Controle de módulos",
            to: "/admin/profiles",
            icon: ShieldCheckIcon,
            variant: "outline"
        });
    }
    actions.push(...(canViewRegistrations.value
        ? [
            {
                id: "registrations",
                label: "Ver inscricoes",
                subtitle: "Controle em tempo real",
                to: "/admin/registrations",
                icon: ClipboardDocumentListIcon,
                variant: "primary"
            }
        ]
        : []), ...(canViewFinancial.value
        ? [
            {
                id: "financial",
                label: "Dashboard financeiro",
                subtitle: "Fluxo de receitas",
                to: "/admin/financial",
                icon: BanknotesIcon,
                variant: "primary"
            }
        ]
        : []));
    actions.push({
        id: "checkin",
        label: "Abrir check-in",
        subtitle: "Escaneie participantes",
        icon: QrCodeIcon,
        variant: "secondary",
        disabled: !hasCheckinEvents.value,
        onClick: openCheckinDialog
    });
    return actions;
});
const getQuickActionClasses = (_variant) => "border border-[#dbe6ff] bg-gradient-to-br from-[#a8c9ff] via-[#6f9eff] to-[#4b72ff] text-white shadow-[0_28px_60px_-35px_rgba(75,114,255,0.65)] transition hover:-translate-y-0.5 hover:shadow-xl dark:border-primary-400 dark:from-primary-600 dark:via-primary-500 dark:to-primary-700 dark:shadow-primary-500/40";
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-6" },
});
/** @type {[typeof Modal, typeof Modal, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(Modal, new Modal({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.checkinDialog.open),
    title: "Abrir check-in",
}));
const __VLS_1 = __VLS_0({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.checkinDialog.open),
    title: "Abrir check-in",
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    'onUpdate:modelValue': (...[$event]) => {
        __VLS_ctx.checkinDialog.open = $event;
    }
};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.checkinDialog.eventId),
    ...{ class: "w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40" },
});
for (const [event] of __VLS_getVForSourceType((__VLS_ctx.selectableCheckinEvents))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (event.id),
        value: (event.id),
    });
    (event.title);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex justify-end gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.checkinDialog.open = false;
        } },
    type: "button",
    ...{ class: "rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-neutral-200 dark:hover:bg-white/10" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.confirmCheckinNavigation) },
    type: "button",
    ...{ class: "rounded-full bg-gradient-to-r from-[#6ea2ff] to-[#496ffb] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#5b7df733] transition hover:translate-y-0.5 disabled:opacity-60 dark:from-primary-600 dark:to-primary-500 dark:shadow-primary-500/40" },
    disabled: (!__VLS_ctx.checkinDialog.eventId),
});
var __VLS_2;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "bg-gradient-to-br from-white via-[#f7f8ff]/60 to-[#ecf3ff]/80 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/20" },
}));
const __VLS_8 = __VLS_7({
    ...{ class: "bg-gradient-to-br from-white via-[#f7f8ff]/60 to-[#ecf3ff]/80 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/20" },
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_9.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col gap-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "max-w-3xl" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs uppercase tracking-[0.2em] text-primary-500 dark:text-primary-300" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-3xl font-semibold text-neutral-900 dark:text-neutral-50" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "mt-1 text-sm text-neutral-600 dark:text-neutral-400" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "w-full" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" },
});
for (const [action] of __VLS_getVForSourceType((__VLS_ctx.quickActions))) {
    const __VLS_10 = ((action.to ? __VLS_ctx.RouterLink : 'button'));
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        ...{ 'onClick': {} },
        key: (action.id),
        ...(action.to ? { to: action.to } : { type: 'button' }),
        ...{ class: "group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" },
        ...{ class: ([__VLS_ctx.getQuickActionClasses(action.variant), action.disabled ? 'opacity-60 cursor-not-allowed' : '']) },
        disabled: (!action.to && action.disabled),
    }));
    const __VLS_12 = __VLS_11({
        ...{ 'onClick': {} },
        key: (action.id),
        ...(action.to ? { to: action.to } : { type: 'button' }),
        ...{ class: "group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" },
        ...{ class: ([__VLS_ctx.getQuickActionClasses(action.variant), action.disabled ? 'opacity-60 cursor-not-allowed' : '']) },
        disabled: (!action.to && action.disabled),
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    let __VLS_14;
    let __VLS_15;
    let __VLS_16;
    const __VLS_17 = {
        onClick: (...[$event]) => {
            !action.to && !action.disabled ? action.onClick?.() : undefined;
        }
    };
    __VLS_13.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-base font-semibold text-white" },
    });
    (action.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs text-white/70" },
    });
    (action.subtitle);
    const __VLS_18 = ((action.icon));
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        ...{ class: "h-5 w-5 text-white/80" },
        'aria-hidden': "true",
    }));
    const __VLS_20 = __VLS_19({
        ...{ class: "h-5 w-5 text-white/80" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    var __VLS_13;
}
if (!__VLS_ctx.hasCheckinEvents) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400" },
    });
}
var __VLS_9;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3" },
});
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "relative overflow-hidden border-none bg-gradient-to-br from-[#7aaeff] via-[#5d8eff] to-[#3c6bff] text-white shadow-lg shadow-[#516af633] dark:from-primary-600 dark:via-primary-600 dark:to-primary-700 dark:shadow-primary-500/40" },
}));
const __VLS_23 = __VLS_22({
    ...{ class: "relative overflow-hidden border-none bg-gradient-to-br from-[#7aaeff] via-[#5d8eff] to-[#3c6bff] text-white shadow-lg shadow-[#516af633] dark:from-primary-600 dark:via-primary-600 dark:to-primary-700 dark:shadow-primary-500/40" },
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs uppercase tracking-wide text-white/80" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-4xl font-semibold" },
});
(__VLS_ctx.activeEvents);
const __VLS_25 = {}.CalendarDaysIcon;
/** @type {[typeof __VLS_components.CalendarDaysIcon, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    ...{ class: "h-10 w-10 text-white/70" },
    'aria-hidden': "true",
}));
const __VLS_27 = __VLS_26({
    ...{ class: "h-10 w-10 text-white/70" },
    'aria-hidden': "true",
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
var __VLS_24;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "relative overflow-hidden border-none bg-gradient-to-br from-white to-[#eef2ff] text-neutral-900 shadow-lg shadow-neutral-200/80 dark:from-neutral-900 dark:to-neutral-900/60 dark:shadow-black/40" },
}));
const __VLS_30 = __VLS_29({
    ...{ class: "relative overflow-hidden border-none bg-gradient-to-br from-white to-[#eef2ff] text-neutral-900 shadow-lg shadow-neutral-200/80 dark:from-neutral-900 dark:to-neutral-900/60 dark:shadow-black/40" },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-4xl font-semibold text-neutral-900 dark:text-neutral-50" },
});
(__VLS_ctx.admin.orders.length);
const __VLS_32 = {}.ClipboardDocumentListIcon;
/** @type {[typeof __VLS_components.ClipboardDocumentListIcon, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    ...{ class: "h-10 w-10 text-primary-500" },
    'aria-hidden': "true",
}));
const __VLS_34 = __VLS_33({
    ...{ class: "h-10 w-10 text-primary-500" },
    'aria-hidden': "true",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
var __VLS_31;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
    ...{ class: "relative overflow-hidden border-none bg-gradient-to-br from-[#eef4ff] via-white to-[#f8f1ff] shadow-lg shadow-primary-200/60 dark:from-primary-900/40 dark:via-neutral-900 dark:to-purple-900/30" },
}));
const __VLS_37 = __VLS_36({
    ...{ class: "relative overflow-hidden border-none bg-gradient-to-br from-[#eef4ff] via-white to-[#f8f1ff] shadow-lg shadow-primary-200/60 dark:from-primary-900/40 dark:via-neutral-900 dark:to-purple-900/30" },
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
__VLS_38.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-4xl font-semibold text-neutral-900 dark:text-neutral-50" },
});
(__VLS_ctx.admin.registrations.length);
const __VLS_39 = {}.UsersIcon;
/** @type {[typeof __VLS_components.UsersIcon, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    ...{ class: "h-10 w-10 text-primary-500 dark:text-primary-300" },
    'aria-hidden': "true",
}));
const __VLS_41 = __VLS_40({
    ...{ class: "h-10 w-10 text-primary-500 dark:text-primary-300" },
    'aria-hidden': "true",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
var __VLS_38;
/** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({}));
const __VLS_44 = __VLS_43({}, ...__VLS_functionalComponentArgsRest(__VLS_43));
__VLS_45.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-lg font-semibold text-neutral-800 dark:text-neutral-100" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-4 overflow-x-auto" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
    ...{ class: "w-full table-auto text-left text-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
    ...{ class: "text-xs uppercase tracking-wide text-neutral-500" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: "pb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: "pb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: "pb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
    ...{ class: "pb-2 text-right" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({
    ...{ class: "divide-y divide-neutral-200 dark:divide-neutral-800" },
});
for (const [event] of __VLS_getVForSourceType((__VLS_ctx.admin.events))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        key: (event.id),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "py-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "font-medium text-neutral-800 dark:text-neutral-100" },
    });
    (event.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-xs text-neutral-500" },
    });
    (event.slug);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "py-3 text-sm" },
    });
    (__VLS_ctx.formatDate(event.startDate));
    (__VLS_ctx.formatDate(event.endDate));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "py-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ([
                'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                event.isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-200 text-neutral-600'
            ]) },
    });
    (event.isActive ? "Ativo" : "Inativo");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "py-3 text-right" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-end gap-3" },
    });
    const __VLS_46 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
        to: (`/evento/${event.slug}`),
        target: "_blank",
        ...{ class: "text-sm text-primary-600 hover:text-primary-500" },
    }));
    const __VLS_48 = __VLS_47({
        to: (`/evento/${event.slug}`),
        target: "_blank",
        ...{ class: "text-sm text-primary-600 hover:text-primary-500" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    __VLS_49.slots.default;
    var __VLS_49;
    const __VLS_50 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        to: (`/admin/checkin/${event.id}`),
        ...{ class: "text-sm text-primary-600 hover:text-primary-500" },
    }));
    const __VLS_52 = __VLS_51({
        to: (`/admin/checkin/${event.id}`),
        ...{ class: "text-sm text-primary-600 hover:text-primary-500" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    __VLS_53.slots.default;
    var __VLS_53;
}
if (!__VLS_ctx.admin.events.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "py-3 text-sm text-neutral-500" },
        colspan: "4",
    });
}
var __VLS_45;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.25em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
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
/** @type {__VLS_StyleScopedClasses['dark:focus:border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:focus:ring-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-[#6ea2ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#496ffb]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[#5b7df733]']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#f7f8ff]/60']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#ecf3ff]/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-900/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-950/20']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['xl:grid-cols-4']} */ ;
/** @type {__VLS_StyleScopedClasses['group']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:shadow-md']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['md:gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['border-none']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-[#7aaeff]']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#5d8eff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#3c6bff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[#516af633]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['border-none']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#eef2ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-neutral-900/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['border-none']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-[#eef4ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['via-white']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#f8f1ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-200/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-primary-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-purple-900/30']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            CalendarDaysIcon: CalendarDaysIcon,
            ClipboardDocumentListIcon: ClipboardDocumentListIcon,
            UsersIcon: UsersIcon,
            BaseCard: BaseCard,
            Modal: Modal,
            formatDate: formatDate,
            admin: admin,
            activeEvents: activeEvents,
            selectableCheckinEvents: selectableCheckinEvents,
            hasCheckinEvents: hasCheckinEvents,
            checkinDialog: checkinDialog,
            confirmCheckinNavigation: confirmCheckinNavigation,
            quickActions: quickActions,
            getQuickActionClasses: getQuickActionClasses,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminDashboard.vue.js.map