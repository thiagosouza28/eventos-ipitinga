/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { CalendarDaysIcon, ClipboardDocumentListIcon, UsersIcon } from "@heroicons/vue/24/outline";
import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
import { formatDate } from "../../utils/format";
import { useAuthStore } from "../../stores/auth";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
const admin = useAdminStore();
const auth = useAuthStore();
const loadingDashboard = ref(true);
const hasRequested = ref(false);
const canViewEvents = computed(() => auth.hasPermission("events", "view"));
const canViewOrders = computed(() => auth.hasPermission("orders", "view"));
const canViewRegistrations = computed(() => auth.hasPermission("registrations", "view"));
const currentUser = computed(() => auth.user);
const isLocalDirector = computed(() => currentUser.value?.role === "DiretorLocal");
const scopedChurchId = computed(() => currentUser.value?.churchId ?? null);
const scopedDistrictId = computed(() => currentUser.value?.districtScopeId ?? null);
const userMinistryIds = computed(() => {
    const ids = new Set();
    if (currentUser.value?.ministryId)
        ids.add(currentUser.value.ministryId);
    (currentUser.value?.ministries ?? []).forEach((ministry) => {
        if (ministry.id)
            ids.add(ministry.id);
    });
    return ids;
});
const hasMinistryScope = computed(() => isLocalDirector.value && userMinistryIds.value.size > 0);
const localDirectorFilters = computed(() => {
    if (isLocalDirector.value) {
        const filters = {};
        if (scopedChurchId.value)
            filters.churchId = scopedChurchId.value;
        if (scopedDistrictId.value)
            filters.districtId = scopedDistrictId.value;
        return filters;
    }
    return {};
});
const visibleEvents = computed(() => {
    if (hasMinistryScope.value) {
        return admin.events.filter((event) => event.ministryId && userMinistryIds.value.has(event.ministryId));
    }
    return admin.events;
});
const dashboardFilters = reactive({
    eventId: "",
    startDate: "",
    endDate: ""
});
const metricsLoading = ref(false);
const registrationsMetrics = reactive({
    summary: {
        totalRegistrations: 0,
        districtsCount: 0,
        churchesCount: 0,
        lotsCount: 0
    },
    byDistrict: [],
    byChurch: [],
    byLot: [],
    generatedAt: null
});
const metricsEvents = computed(() => visibleEvents.value);
const districtMax = computed(() => Math.max(0, ...registrationsMetrics.byDistrict.map((item) => item.registrationsCount)));
const churchMax = computed(() => Math.max(0, ...registrationsMetrics.byChurch.map((item) => item.registrationsCount)));
const lotMax = computed(() => Math.max(0, ...registrationsMetrics.byLot.map((item) => item.registrationsCount)));
const chartLimit = 12;
const districtChartRows = computed(() => registrationsMetrics.byDistrict.slice(0, chartLimit));
const churchChartRows = computed(() => registrationsMetrics.byChurch.slice(0, chartLimit));
const lotChartRows = computed(() => registrationsMetrics.byLot.slice(0, chartLimit));
const buildDashboardParams = () => ({
    eventId: dashboardFilters.eventId || undefined,
    startDate: dashboardFilters.startDate || undefined,
    endDate: dashboardFilters.endDate || undefined
});
const loadRegistrationsMetrics = async () => {
    metricsLoading.value = true;
    try {
        const data = await admin.getRegistrationsDashboard(buildDashboardParams());
        registrationsMetrics.summary = data.summary ?? registrationsMetrics.summary;
        registrationsMetrics.byDistrict = data.byDistrict ?? [];
        registrationsMetrics.byChurch = data.byChurch ?? [];
        registrationsMetrics.byLot = data.byLot ?? [];
        registrationsMetrics.generatedAt = data.generatedAt ? new Date(data.generatedAt) : new Date();
    }
    catch (error) {
        console.error("Falha ao carregar metricas de inscricoes", error);
    }
    finally {
        metricsLoading.value = false;
    }
};
let metricsTimer = null;
const scheduleMetricsLoad = () => {
    if (metricsTimer)
        clearTimeout(metricsTimer);
    metricsTimer = setTimeout(() => {
        void loadRegistrationsMetrics();
    }, 400);
};
const resolveBarWidth = (value, max) => `${max > 0 ? Math.round((value / max) * 100) : 0}%`;
const formatCount = (value) => new Intl.NumberFormat("pt-BR").format(value);
const formatPercent = (value, total) => `${total > 0 ? Math.round((value / total) * 100) : 0}%`;
const loadDashboardData = async () => {
    if (hasRequested.value)
        return;
    if (!auth.ensureValidSession()) {
        console.warn("[dashboard] Session invalid. Skipping dashboard load.");
        loadingDashboard.value = false;
        return;
    }
    const tasks = [];
    if (canViewEvents.value)
        tasks.push(admin.loadEvents());
    if (canViewOrders.value)
        tasks.push(admin.loadOrders(localDirectorFilters.value));
    if (canViewRegistrations.value)
        tasks.push(admin.loadRegistrations(localDirectorFilters.value));
    hasRequested.value = true;
    loadingDashboard.value = true;
    try {
        console.info("[dashboard] Loading admin dashboard data");
        await Promise.all(tasks);
        await loadRegistrationsMetrics();
    }
    catch (error) {
        console.error("Falha ao carregar dados iniciais do dashboard", error);
    }
    finally {
        loadingDashboard.value = false;
    }
};
watch(() => [dashboardFilters.eventId, dashboardFilters.startDate, dashboardFilters.endDate], () => {
    if (loadingDashboard.value)
        return;
    scheduleMetricsLoad();
});
watch(() => auth.isReady && auth.isAuthenticated && auth.hasValidSession, (ready) => {
    if (!ready) {
        hasRequested.value = false;
        loadingDashboard.value = false;
        return;
    }
    loadDashboardData();
}, { immediate: true });
const activeEvents = computed(() => visibleEvents.value.filter((event) => event.isActive).length);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-6" },
});
if (__VLS_ctx.loadingDashboard) {
    /** @type {[typeof TableSkeleton, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
        helperText: "📡 Carregando painel administrativo...",
    }));
    const __VLS_1 = __VLS_0({
        helperText: "📡 Carregando painel administrativo...",
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
else {
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "bg-gradient-to-r from-white via-[#f7f9ff] to-[#e7ecff] dark:from-[#131a2f] dark:via-[#0f162a] dark:to-[#0b1223]" },
    }));
    const __VLS_4 = __VLS_3({
        ...{ class: "bg-gradient-to-r from-white via-[#f7f9ff] to-[#e7ecff] dark:from-[#131a2f] dark:via-[#0f162a] dark:to-[#0b1223]" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
    __VLS_5.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "max-w-4xl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.35em] text-[#6f7cff] dark:text-[#b7c8ff]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "mt-1 text-3xl font-semibold text-[color:var(--text)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2 text-sm text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 rounded-lg bg-gradient-to-br from-white via-[#f5f7ff] to-[#eaf1ff] p-5 text-[#111827] shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:from-[#161d36] dark:via-[#111a2d] dark:to-[#0d1426] dark:text-[color:var(--text)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)] dark:border dark:border-[rgba(255,255,255,0.06)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]" },
    });
    const __VLS_6 = {}.CalendarDaysIcon;
    /** @type {[typeof __VLS_components.CalendarDaysIcon, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        ...{ class: "h-10 w-10 text-[#4b61ff] dark:text-[#9eb5ff]" },
        'aria-hidden': "true",
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: "h-10 w-10 text-[#4b61ff] dark:text-[#9eb5ff]" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-4xl font-semibold" },
    });
    (__VLS_ctx.activeEvents);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 rounded-lg bg-gradient-to-br from-white via-[#f5f7ff] to-[#eaf1ff] p-5 text-[#111827] shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:from-[#161d36] dark:via-[#111a2d] dark:to-[#0d1426] dark:text-[color:var(--text)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)] dark:border dark:border-[rgba(255,255,255,0.06)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]" },
    });
    const __VLS_10 = {}.ClipboardDocumentListIcon;
    /** @type {[typeof __VLS_components.ClipboardDocumentListIcon, ]} */ ;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        ...{ class: "h-10 w-10 text-[#4b61ff] dark:text-[#9eb5ff]" },
        'aria-hidden': "true",
    }));
    const __VLS_12 = __VLS_11({
        ...{ class: "h-10 w-10 text-[#4b61ff] dark:text-[#9eb5ff]" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-4xl font-semibold" },
    });
    (__VLS_ctx.admin.orders.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 rounded-lg bg-gradient-to-br from-white via-[#f2f7ff] to-[#fef2ff] p-5 text-[#111827] shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:from-[#161c33] dark:via-[#121a2f] dark:to-[#0e1527] dark:text-[color:var(--text)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)] dark:border dark:border-[rgba(255,255,255,0.06)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]" },
    });
    const __VLS_14 = {}.UsersIcon;
    /** @type {[typeof __VLS_components.UsersIcon, ]} */ ;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
        ...{ class: "h-10 w-10 text-[#4b61ff] dark:text-[#b8a2ff]" },
        'aria-hidden': "true",
    }));
    const __VLS_16 = __VLS_15({
        ...{ class: "h-10 w-10 text-[#4b61ff] dark:text-[#b8a2ff]" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-4xl font-semibold" },
    });
    (__VLS_ctx.admin.registrationsTotal ?? __VLS_ctx.admin.registrations.length);
    var __VLS_5;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "bg-[color:var(--surface-card)]/95 border-[color:var(--border-card)] dark:bg-[color:var(--surface-card)]/92 dark:border-[rgba(255,255,255,0.12)]" },
    }));
    const __VLS_19 = __VLS_18({
        ...{ class: "bg-[color:var(--surface-card)]/95 border-[color:var(--border-card)] dark:bg-[color:var(--surface-card)]/92 dark:border-[rgba(255,255,255,0.12)]" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    __VLS_20.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-xl font-semibold text-[color:var(--text)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-1 text-sm text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.dashboardFilters.eventId),
        ...{ class: "w-full rounded-xl border border-[color:var(--border-card)] bg-white/80 px-4 py-2.5 text-sm text-[color:var(--text)] shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.metricsEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (event.id),
            value: (event.id),
        });
        (event.title);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
        ...{ class: "w-full rounded-xl border border-[color:var(--border-card)] bg-white/80 px-4 py-2.5 text-sm text-[color:var(--text)] shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5" },
    });
    (__VLS_ctx.dashboardFilters.startDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
        ...{ class: "w-full rounded-xl border border-[color:var(--border-card)] bg-white/80 px-4 py-2.5 text-sm text-[color:var(--text)] shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5" },
    });
    (__VLS_ctx.dashboardFilters.endDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadRegistrationsMetrics) },
        type: "button",
        ...{ class: "inline-flex items-center justify-center rounded-xl bg-[#1f4fff] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#9eb5ff] dark:text-[#10162a]" },
        disabled: (__VLS_ctx.metricsLoading),
    });
    if (__VLS_ctx.metricsLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-white border-b-transparent dark:border-[#10162a] dark:border-b-transparent" },
        });
    }
    if (__VLS_ctx.registrationsMetrics.generatedAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-[color:var(--text-muted)]" },
        });
        (__VLS_ctx.registrationsMetrics.generatedAt.toLocaleString('pt-BR'));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-6" },
    });
    if (__VLS_ctx.metricsLoading) {
        /** @type {[typeof TableSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(TableSkeleton, new TableSkeleton({
            helperText: "Carregando métricas de inscrições...",
        }));
        const __VLS_22 = __VLS_21({
            helperText: "Carregando métricas de inscrições...",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-y-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-4 md:grid-cols-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 shadow-inner shadow-blue-100/25 dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-3xl font-semibold text-[color:var(--text)]" },
        });
        (__VLS_ctx.formatCount(__VLS_ctx.registrationsMetrics.summary.totalRegistrations));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 shadow-inner shadow-blue-100/25 dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-3xl font-semibold text-[color:var(--text)]" },
        });
        (__VLS_ctx.formatCount(__VLS_ctx.registrationsMetrics.summary.districtsCount));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 shadow-inner shadow-blue-100/25 dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-3xl font-semibold text-[color:var(--text)]" },
        });
        (__VLS_ctx.formatCount(__VLS_ctx.registrationsMetrics.summary.churchesCount));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid gap-6 lg:grid-cols-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm font-semibold text-[color:var(--text)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-[color:var(--text-muted)]" },
        });
        (__VLS_ctx.districtChartRows.length);
        if (!__VLS_ctx.districtChartRows.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 text-sm text-[color:var(--text-muted)]" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 space-y-3" },
            });
            for (const [district, index] of __VLS_getVForSourceType((__VLS_ctx.districtChartRows))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (`${district.districtId ?? 'district'}-${index}`),
                    ...{ class: "space-y-1" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "font-semibold text-[color:var(--text)]" },
                });
                (district.districtName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-[color:var(--text)]" },
                });
                (__VLS_ctx.formatCount(district.registrationsCount));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-1.5" },
                });
                if (district.confirmedCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200" },
                    });
                    (__VLS_ctx.formatCount(district.confirmedCount));
                    (__VLS_ctx.formatPercent(district.confirmedCount, district.registrationsCount));
                }
                if (district.pendingCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-400/15 dark:text-red-200" },
                    });
                    (__VLS_ctx.formatCount(district.pendingCount));
                    (__VLS_ctx.formatPercent(district.pendingCount, district.registrationsCount));
                }
                if (district.canceledCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-200" },
                    });
                    (__VLS_ctx.formatCount(district.canceledCount));
                    (__VLS_ctx.formatPercent(district.canceledCount, district.registrationsCount));
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "h-2 rounded-full bg-[#e5e7ff] dark:bg-white/10" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex h-2 overflow-hidden rounded-full" },
                    ...{ style: ({ width: __VLS_ctx.resolveBarWidth(district.registrationsCount, __VLS_ctx.districtMax) }) },
                });
                if (district.confirmedCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-emerald-500 dark:bg-emerald-400" },
                        ...{ style: ({ flexGrow: district.confirmedCount }) },
                    });
                }
                if (district.pendingCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-red-500 dark:bg-red-400" },
                        ...{ style: ({ flexGrow: district.pendingCount }) },
                    });
                }
                if (district.canceledCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-blue-500 dark:bg-blue-400" },
                        ...{ style: ({ flexGrow: district.canceledCount }) },
                    });
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm font-semibold text-[color:var(--text)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-[color:var(--text-muted)]" },
        });
        (__VLS_ctx.churchChartRows.length);
        if (!__VLS_ctx.churchChartRows.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 text-sm text-[color:var(--text-muted)]" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 space-y-3" },
            });
            for (const [church, index] of __VLS_getVForSourceType((__VLS_ctx.churchChartRows))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (`${church.churchId ?? 'church'}-${index}`),
                    ...{ class: "space-y-1" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "font-semibold text-[color:var(--text)]" },
                });
                (church.churchName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-[color:var(--text)]" },
                });
                (__VLS_ctx.formatCount(church.registrationsCount));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-1.5" },
                });
                if (church.confirmedCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200" },
                    });
                    (__VLS_ctx.formatCount(church.confirmedCount));
                    (__VLS_ctx.formatPercent(church.confirmedCount, church.registrationsCount));
                }
                if (church.pendingCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-400/15 dark:text-red-200" },
                    });
                    (__VLS_ctx.formatCount(church.pendingCount));
                    (__VLS_ctx.formatPercent(church.pendingCount, church.registrationsCount));
                }
                if (church.canceledCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-200" },
                    });
                    (__VLS_ctx.formatCount(church.canceledCount));
                    (__VLS_ctx.formatPercent(church.canceledCount, church.registrationsCount));
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-[11px] text-[color:var(--text-muted)]" },
                });
                (church.districtName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "h-2 rounded-full bg-[#e5e7ff] dark:bg-white/10" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex h-2 overflow-hidden rounded-full" },
                    ...{ style: ({ width: __VLS_ctx.resolveBarWidth(church.registrationsCount, __VLS_ctx.churchMax) }) },
                });
                if (church.confirmedCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-emerald-500 dark:bg-emerald-400" },
                        ...{ style: ({ flexGrow: church.confirmedCount }) },
                    });
                }
                if (church.pendingCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-red-500 dark:bg-red-400" },
                        ...{ style: ({ flexGrow: church.pendingCount }) },
                    });
                }
                if (church.canceledCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-blue-500 dark:bg-blue-400" },
                        ...{ style: ({ flexGrow: church.canceledCount }) },
                    });
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 dark:border-white/10 dark:bg-white/5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm font-semibold text-[color:var(--text)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-[color:var(--text-muted)]" },
        });
        (__VLS_ctx.lotChartRows.length);
        if (!__VLS_ctx.lotChartRows.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 text-sm text-[color:var(--text-muted)]" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-4 space-y-3" },
            });
            for (const [lot] of __VLS_getVForSourceType((__VLS_ctx.lotChartRows))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (`${lot.eventId}-${lot.lotId}`),
                    ...{ class: "space-y-1" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "font-semibold text-[color:var(--text)]" },
                });
                (lot.lotName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-[color:var(--text)]" },
                });
                (__VLS_ctx.formatCount(lot.registrationsCount));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex items-center gap-1.5" },
                });
                if (lot.confirmedCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200" },
                    });
                    (__VLS_ctx.formatCount(lot.confirmedCount));
                    (__VLS_ctx.formatPercent(lot.confirmedCount, lot.registrationsCount));
                }
                if (lot.pendingCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-400/15 dark:text-red-200" },
                    });
                    (__VLS_ctx.formatCount(lot.pendingCount));
                    (__VLS_ctx.formatPercent(lot.pendingCount, lot.registrationsCount));
                }
                if (lot.canceledCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-200" },
                    });
                    (__VLS_ctx.formatCount(lot.canceledCount));
                    (__VLS_ctx.formatPercent(lot.canceledCount, lot.registrationsCount));
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-[11px] text-[color:var(--text-muted)]" },
                });
                (lot.eventTitle);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "h-2 rounded-full bg-[#e5e7ff] dark:bg-white/10" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex h-2 overflow-hidden rounded-full" },
                    ...{ style: ({ width: __VLS_ctx.resolveBarWidth(lot.registrationsCount, __VLS_ctx.lotMax) }) },
                });
                if (lot.confirmedCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-emerald-500 dark:bg-emerald-400" },
                        ...{ style: ({ flexGrow: lot.confirmedCount }) },
                    });
                }
                if (lot.pendingCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-red-500 dark:bg-red-400" },
                        ...{ style: ({ flexGrow: lot.pendingCount }) },
                    });
                }
                if (lot.canceledCount) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "h-2 basis-0 bg-blue-500 dark:bg-blue-400" },
                        ...{ style: ({ flexGrow: lot.canceledCount }) },
                    });
                }
            }
        }
    }
    var __VLS_20;
    /** @type {[typeof BaseCard, typeof BaseCard, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(BaseCard, new BaseCard({
        ...{ class: "bg-[color:var(--surface-card)]/95 border-[color:var(--border-card)] dark:bg-[color:var(--surface-card)]/92 dark:border-[rgba(255,255,255,0.12)]" },
    }));
    const __VLS_25 = __VLS_24({
        ...{ class: "bg-[color:var(--surface-card)]/95 border-[color:var(--border-card)] dark:bg-[color:var(--surface-card)]/92 dark:border-[rgba(255,255,255,0.12)]" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    __VLS_26.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-xl font-semibold text-[color:var(--text)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-6 hidden overflow-x-auto md:block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "w-full table-auto text-left text-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
        ...{ class: "text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "pb-4 font-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "pb-4 font-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "pb-4 font-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "pb-4 text-right font-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({
        ...{ class: "divide-y divide-[#eaecf5] dark:divide-[rgba(255,255,255,0.08)]" },
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.admin.events))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (event.id),
            ...{ class: "text-[color:var(--text)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "py-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "font-semibold text-[color:var(--text)]" },
        });
        (event.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xs text-[color:var(--text-muted)]" },
        });
        (event.slug);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "py-4 text-sm text-[color:var(--text-muted)]" },
        });
        (__VLS_ctx.formatDate(event.startDate));
        (__VLS_ctx.formatDate(event.endDate));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "py-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ([
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    event.isActive
                        ? 'bg-[#e4ecff] text-[#1f4fff] dark:bg-[rgba(86,129,255,0.35)] dark:text-[#f6f8ff]'
                        : 'bg-neutral-200 text-neutral-600 dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--text-muted)]'
                ]) },
        });
        (event.isActive ? 'Ativo' : 'Inativo');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "py-4 text-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-end gap-3 text-sm" },
        });
        const __VLS_27 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }));
        const __VLS_29 = __VLS_28({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        __VLS_30.slots.default;
        var __VLS_30;
        const __VLS_31 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }));
        const __VLS_33 = __VLS_32({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_34.slots.default;
        var __VLS_34;
    }
    if (!__VLS_ctx.visibleEvents.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "py-4 text-center text-sm text-[color:var(--text-muted)]" },
            colspan: "4",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-6 flex flex-col gap-4 md:hidden" },
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.visibleEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (event.id),
            ...{ class: "rounded-lg border border-white/15 bg-white/90 p-4 text-sm shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] dark:border-white/5 dark:bg-[color:var(--surface-card)] dark:text-[color:var(--text)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-start justify-between gap-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-base font-semibold text-[color:var(--text)]" },
        });
        (event.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs text-[color:var(--text-muted)]" },
        });
        (event.slug);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ([
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    event.isActive
                        ? 'bg-[#e4ecff] text-[#1f4fff] dark:bg-[rgba(86,129,255,0.35)] dark:text-[#f6f8ff]'
                        : 'bg-neutral-200 text-neutral-600 dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--text-muted)]'
                ]) },
        });
        (event.isActive ? 'Ativo' : 'Inativo');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 grid grid-cols-2 gap-3 text-xs text-[color:var(--text-muted)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "font-semibold text-[color:var(--text)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.formatDate(event.startDate));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "font-semibold text-[color:var(--text)]" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.formatDate(event.endDate));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase text-[#1f4fff] dark:text-[#a8c4ff]" },
        });
        const __VLS_35 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }));
        const __VLS_37 = __VLS_36({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        __VLS_38.slots.default;
        var __VLS_38;
        const __VLS_39 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }));
        const __VLS_41 = __VLS_40({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        __VLS_42.slots.default;
        var __VLS_42;
    }
    if (!__VLS_ctx.visibleEvents.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-lg border border-dashed border-[color:var(--border-card)] p-4 text-center text-sm text-[color:var(--text-muted)]" },
        });
    }
    var __VLS_26;
}
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#f7f9ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#e7ecff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-[#131a2f]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-[#0f162a]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-[#0b1223]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#6f7cff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#b7c8ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#f5f7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#eaf1ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#111827]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_12px_30px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-[#161d36]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-[#111a2d]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-[#0d1426]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.06)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#94a3b8]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#4b61ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#9eb5ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#f5f7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#eaf1ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#111827]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_12px_30px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-[#161d36]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-[#111a2d]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-[#0d1426]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.06)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#94a3b8]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#4b61ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#9eb5ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#f2f7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#fef2ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#111827]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_12px_30px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-[#161c33]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-[#121a2f]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-[#0e1527]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.06)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#94a3b8]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#4b61ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#b8a2ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card)]/95']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[color:var(--surface-card)]/92']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.12)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-sky-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#1f4fff]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-blue-200']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[#9eb5ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#10162a]']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[#10162a]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-b-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-blue-100/25']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-blue-100/25']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-blue-100/25']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-blue-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-blue-200']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#e5e7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-400']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-blue-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-blue-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-blue-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#e5e7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-400']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-blue-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-blue-400/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-blue-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#e5e7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-400']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-400']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['basis-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-blue-400']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card)]/95']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[color:var(--surface-card)]/92']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.12)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['md:block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['table-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.2em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-y']} */ ;
/** @type {__VLS_StyleScopedClasses['divide-[#eaecf5]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:divide-[rgba(255,255,255,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#1f4fff]']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#a8c4ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#1f4fff]']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#a8c4ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/15']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[color:var(--surface-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#1f4fff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#a8c4ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-current']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-current']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            CalendarDaysIcon: CalendarDaysIcon,
            ClipboardDocumentListIcon: ClipboardDocumentListIcon,
            UsersIcon: UsersIcon,
            BaseCard: BaseCard,
            formatDate: formatDate,
            TableSkeleton: TableSkeleton,
            admin: admin,
            loadingDashboard: loadingDashboard,
            visibleEvents: visibleEvents,
            dashboardFilters: dashboardFilters,
            metricsLoading: metricsLoading,
            registrationsMetrics: registrationsMetrics,
            metricsEvents: metricsEvents,
            districtMax: districtMax,
            churchMax: churchMax,
            lotMax: lotMax,
            districtChartRows: districtChartRows,
            churchChartRows: churchChartRows,
            lotChartRows: lotChartRows,
            loadRegistrationsMetrics: loadRegistrationsMetrics,
            resolveBarWidth: resolveBarWidth,
            formatCount: formatCount,
            formatPercent: formatPercent,
            activeEvents: activeEvents,
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