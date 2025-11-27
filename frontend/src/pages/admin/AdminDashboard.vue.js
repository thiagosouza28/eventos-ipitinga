/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, ref } from "vue";
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
const canViewEvents = computed(() => auth.hasPermission("events", "view"));
const canViewOrders = computed(() => auth.hasPermission("orders", "view"));
const canViewRegistrations = computed(() => auth.hasPermission("registrations", "view"));
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
    finally {
        loadingDashboard.value = false;
    }
});
const activeEvents = computed(() => admin.events.filter((event) => event.isActive).length);
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
        helperText: "ðŸ“¡ Carregando painel administrativo...",
    }));
    const __VLS_1 = __VLS_0({
        helperText: "ðŸ“¡ Carregando painel administrativo...",
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
        ...{ class: "flex flex-col gap-3 rounded-[26px] bg-gradient-to-br from-[#6f9bff] via-[#4d7dff] to-[#1f4fff] p-5 text-white shadow-[0_25px_80px_rgba(72,103,255,0.35)] dark:shadow-[0_25px_70px_rgba(16,25,56,0.55)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs uppercase tracking-[0.3em] text-white/70" },
    });
    const __VLS_6 = {}.CalendarDaysIcon;
    /** @type {[typeof __VLS_components.CalendarDaysIcon, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        ...{ class: "h-10 w-10 text-white/80" },
        'aria-hidden': "true",
    }));
    const __VLS_8 = __VLS_7({
        ...{ class: "h-10 w-10 text-white/80" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-4xl font-semibold" },
    });
    (__VLS_ctx.activeEvents);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-col gap-3 rounded-[26px] bg-gradient-to-br from-white via-[#f5f7ff] to-[#eaf1ff] p-5 text-[#111827] shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:from-[#161d36] dark:via-[#111a2d] dark:to-[#0d1426] dark:text-[color:var(--text)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.55)] dark:border dark:border-[rgba(255,255,255,0.06)]" },
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
        ...{ class: "flex flex-col gap-3 rounded-[26px] bg-gradient-to-br from-white via-[#f2f7ff] to-[#fef2ff] p-5 text-[#111827] shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:from-[#161c33] dark:via-[#121a2f] dark:to-[#0e1527] dark:text-[color:var(--text)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.55)] dark:border dark:border-[rgba(255,255,255,0.06)]" },
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
    (__VLS_ctx.admin.registrations.length);
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
        const __VLS_21 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }));
        const __VLS_23 = __VLS_22({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        __VLS_24.slots.default;
        var __VLS_24;
        const __VLS_25 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }));
        const __VLS_27 = __VLS_26({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "text-[#1f4fff] hover:underline dark:text-[#a8c4ff]" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_26));
        __VLS_28.slots.default;
        var __VLS_28;
    }
    if (!__VLS_ctx.admin.events.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "py-4 text-center text-sm text-[color:var(--text-muted)]" },
            colspan: "4",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-6 flex flex-col gap-4 md:hidden" },
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.admin.events))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (event.id),
            ...{ class: "rounded-3xl border border-white/15 bg-white/90 p-4 text-sm shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)] dark:border-white/5 dark:bg-[color:var(--surface-card)] dark:text-[color:var(--text)]" },
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
        const __VLS_29 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }));
        const __VLS_31 = __VLS_30({
            to: (`/evento/${event.slug}`),
            target: "_blank",
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        __VLS_32.slots.default;
        var __VLS_32;
        const __VLS_33 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }));
        const __VLS_35 = __VLS_34({
            to: (`/admin/checkin/${event.id}`),
            ...{ class: "inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_34));
        __VLS_36.slots.default;
        var __VLS_36;
    }
    if (!__VLS_ctx.admin.events.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rounded-3xl border border-dashed border-[color:var(--border-card)] p-4 text-center text-sm text-[color:var(--text-muted)]" },
        });
    }
    var __VLS_20;
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
/** @type {__VLS_StyleScopedClasses['rounded-[26px]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-[#6f9bff]']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#4d7dff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#1f4fff]']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_25px_80px_rgba(72,103,255,0.35)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_25px_70px_rgba(16,25,56,0.55)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[26px]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#f5f7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#eaf1ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#111827]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_25px_60px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-[#161d36]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-[#111a2d]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-[#0d1426]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_25px_70px_rgba(0,0,0,0.55)]']} */ ;
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
/** @type {__VLS_StyleScopedClasses['rounded-[26px]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-white']} */ ;
/** @type {__VLS_StyleScopedClasses['via-[#f2f7ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#fef2ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#111827]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_25px_60px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-[#161c33]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-[#121a2f]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-[#0e1527]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_25px_70px_rgba(0,0,0,0.55)]']} */ ;
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
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/15']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)]']} */ ;
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
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
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