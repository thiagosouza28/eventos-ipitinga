/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Bars3Icon, XMarkIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "../../stores/auth";
const props = defineProps();
const route = useRoute();
const auth = useAuthStore();
const isRouteActive = (to) => {
    if (typeof to === "string") {
        return route.path === to;
    }
    if ("name" in to && to.name) {
        return route.name === to.name;
    }
    if ("path" in to && to.path) {
        return route.path === to.path;
    }
    return false;
};
const isActive = (to) => isRouteActive(to);
const visibleMenuItems = computed(() => props.menuItems.filter((item) => {
    if (item.requiresRole && auth.user?.role !== item.requiresRole) {
        return false;
    }
    if (!item.module) {
        return true;
    }
    return auth.hasPermission(item.module, item.action ?? "view");
}));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hidden md:flex" },
    ...{ style: ({ width: __VLS_ctx.isOpen ? '200px' : '80px' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "sticky top-0 flex h-screen flex-col rounded-r-[36px] rounded-l-[32px] bg-[color:var(--app-shell-bg)] px-4 py-6 text-sm text-[color:var(--text-muted)] shadow-[0_20px_60px_rgba(15,23,42,0.15)] transition-all duration-300 dark:bg-[color:var(--surface-card)]" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('toggle');
        } },
    type: "button",
    ...{ class: "mb-8 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-[#5a6bff] shadow-[0_10px_20px_rgba(76,87,125,0.15)] transition hover:bg-[#f8f9ff] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#10142b] dark:text-white" },
});
const __VLS_0 = {}.Bars3Icon;
/** @type {[typeof __VLS_components.Bars3Icon, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "h-5 w-5" },
    'aria-hidden': "true",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "h-5 w-5" },
    'aria-hidden': "true",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sr-only" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "flex flex-1 flex-col space-y-2" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.visibleMenuItems))) {
    const __VLS_4 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        key: (item.label),
        to: (item.to),
        ...{ class: "group flex items-center rounded-[20px] px-3 py-3 text-sm font-medium tracking-wide transition-all duration-300" },
        ...{ class: ([
                __VLS_ctx.isOpen ? 'justify-start' : 'justify-center',
                __VLS_ctx.isActive(item.to)
                    ? 'bg-white text-[#1f4fff] shadow-[0_15px_35px_rgba(47,83,192,0.18)] dark:bg-[#10172f]'
                    : 'text-[#6b7280] hover:bg-white/70 hover:text-[#1f4fff] dark:text-[#c2c9e4] dark:hover:bg-[#10172f]'
            ]) },
    }));
    const __VLS_6 = __VLS_5({
        key: (item.label),
        to: (item.to),
        ...{ class: "group flex items-center rounded-[20px] px-3 py-3 text-sm font-medium tracking-wide transition-all duration-300" },
        ...{ class: ([
                __VLS_ctx.isOpen ? 'justify-start' : 'justify-center',
                __VLS_ctx.isActive(item.to)
                    ? 'bg-white text-[#1f4fff] shadow-[0_15px_35px_rgba(47,83,192,0.18)] dark:bg-[#10172f]'
                    : 'text-[#6b7280] hover:bg-white/70 hover:text-[#1f4fff] dark:text-[#c2c9e4] dark:hover:bg-[#10172f]'
            ]) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    const __VLS_8 = ((item.icon));
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ class: "h-5 w-5 transition-colors" },
        ...{ class: ([__VLS_ctx.isActive(item.to) ? 'text-[#1f4fff]' : 'text-[#9aa4c4] group-hover:text-[#1f4fff] dark:text-[#8d99c9]']) },
    }));
    const __VLS_10 = __VLS_9({
        ...{ class: "h-5 w-5 transition-colors" },
        ...{ class: ([__VLS_ctx.isActive(item.to) ? 'text-[#1f4fff]' : 'text-[#9aa4c4] group-hover:text-[#1f4fff] dark:text-[#8d99c9]']) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    const __VLS_12 = {}.transition;
    /** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        name: "label-fade",
    }));
    const __VLS_14 = __VLS_13({
        name: "label-fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    if (__VLS_ctx.isOpen) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ml-3 text-sm font-semibold tracking-tight text-[#1f2a44] dark:text-white" },
        });
        (item.label);
    }
    var __VLS_15;
    var __VLS_7;
}
const __VLS_16 = {}.transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    name: "sidebar-overlay",
}));
const __VLS_18 = __VLS_17({
    name: "sidebar-overlay",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
if (__VLS_ctx.isOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fixed inset-0 z-40 flex md:hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.$emit('toggle');
            } },
        ...{ class: "absolute inset-0 bg-black/40 backdrop-blur-sm" },
    });
    const __VLS_20 = {}.transition;
    /** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        name: "sidebar-drawer",
    }));
    const __VLS_22 = __VLS_21({
        name: "sidebar-drawer",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "relative ml-0 flex h-full w-72 flex-col rounded-r-[32px] border border-[color:var(--border-card)] bg-[color:var(--surface-card)] px-5 py-6 shadow-2xl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm font-semibold text-[color:var(--text)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.$emit('toggle');
            } },
        type: "button",
        ...{ class: "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)]" },
    });
    const __VLS_24 = {}.XMarkIcon;
    /** @type {[typeof __VLS_components.XMarkIcon, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ class: "h-5 w-5" },
        'aria-hidden': "true",
    }));
    const __VLS_26 = __VLS_25({
        ...{ class: "h-5 w-5" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
        ...{ class: "mt-6 flex flex-1 flex-col space-y-3 overflow-y-auto pr-1" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.visibleMenuItems))) {
        const __VLS_28 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            ...{ 'onClick': {} },
            key: (`mobile-${item.label}`),
            to: (item.to),
            ...{ class: "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition hover:bg-[color:var(--surface-card-alt)]" },
            ...{ class: ([__VLS_ctx.isActive(item.to) ? 'text-[color:var(--primary)]' : 'text-[color:var(--text-muted)]']) },
        }));
        const __VLS_30 = __VLS_29({
            ...{ 'onClick': {} },
            key: (`mobile-${item.label}`),
            to: (item.to),
            ...{ class: "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition hover:bg-[color:var(--surface-card-alt)]" },
            ...{ class: ([__VLS_ctx.isActive(item.to) ? 'text-[color:var(--primary)]' : 'text-[color:var(--text-muted)]']) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        let __VLS_32;
        let __VLS_33;
        let __VLS_34;
        const __VLS_35 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.$emit('toggle');
            }
        };
        __VLS_31.slots.default;
        const __VLS_36 = ((item.icon));
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            ...{ class: "h-5 w-5 text-[color:var(--text-muted)]" },
        }));
        const __VLS_38 = __VLS_37({
            ...{ class: "h-5 w-5 text-[color:var(--text-muted)]" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        var __VLS_31;
    }
    var __VLS_23;
}
var __VLS_19;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-r-[36px]']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-l-[32px]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--app-shell-bg)]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_20px_60px_rgba(15,23,42,0.15)]']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[color:var(--surface-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-11']} */ ;
/** @type {__VLS_StyleScopedClasses['w-11']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#5a6bff]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_10px_20px_rgba(76,87,125,0.15)]']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-[#f8f9ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.1)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[#10142b]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['group']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[20px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#1f2a44]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-40']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-72']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-r-[32px]']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card-alt)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['pr-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-[color:var(--surface-card-alt)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            Bars3Icon: Bars3Icon,
            XMarkIcon: XMarkIcon,
            isActive: isActive,
            visibleMenuItems: visibleMenuItems,
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
//# sourceMappingURL=AdminSidebar.vue.js.map