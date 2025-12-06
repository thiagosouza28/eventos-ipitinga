/// <reference types="../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ArrowRightOnRectangleIcon, Bars3Icon, BanknotesIcon, BuildingOffice2Icon, CalendarDaysIcon, ClipboardDocumentListIcon, Cog6ToothIcon, MapPinIcon, MoonIcon, PresentationChartBarIcon, QrCodeIcon, ShieldCheckIcon, Squares2X2Icon, SunIcon, UserPlusIcon, UsersIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import { useTheme } from "./composables/useTheme";
import { useAuthStore } from "./stores/auth";
import { useSystemConfigStore } from "./stores/system-config";
import LoadingOverlay from "./components/ui/LoadingOverlay.vue";
import AdminSidebar from "./components/admin/AdminSidebar.vue";
const { isDark, toggleTheme } = useTheme();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const systemConfigStore = useSystemConfigStore();
const { config: systemConfig } = storeToRefs(systemConfigStore);
const mobileMenuOpen = ref(false);
const currentTime = ref(new Date());
const isSidebarOpen = ref(true);
const mobileViewportBreakpoint = 768;
let timer;
const isMobileViewport = () => typeof window !== "undefined" && window.innerWidth < mobileViewportBreakpoint;
const lockBodyScroll = (locked) => {
    if (typeof document === "undefined") {
        return;
    }
    document.body.style.overflow = locked ? "hidden" : "";
};
const baseAdminMenu = [
    { label: "Dashboard", to: { name: "admin-dashboard" }, icon: Squares2X2Icon, module: "dashboard" },
    { label: "Eventos", to: { name: "admin-events" }, icon: CalendarDaysIcon, module: "events" },
    { label: "Distritos", to: { name: "admin-districts" }, icon: MapPinIcon, module: "districts" },
    { label: "Igrejas", to: { name: "admin-churches" }, icon: BuildingOffice2Icon, module: "churches" },
    { label: "Ministerios", to: { name: "admin-ministries" }, icon: UsersIcon, module: "ministries" },
    { label: "Usuarios", to: { name: "admin-users" }, icon: UserPlusIcon, module: "users" },
    { label: "Permissoes", to: { name: "admin-profiles" }, icon: ShieldCheckIcon, module: "profiles" },
    { label: "Pedidos", to: { name: "admin-orders" }, icon: ClipboardDocumentListIcon, module: "orders" },
    { label: "Inscricoes", to: { name: "admin-registrations" }, icon: UsersIcon, module: "registrations" },
    { label: "Relatorios", to: { name: "admin-reports", params: { tab: "event" } }, icon: PresentationChartBarIcon, module: "reports" },
    { label: "Financeiro", to: { name: "admin-financial" }, icon: BanknotesIcon, module: "financial" },
    { label: "Financeiro (responsáveis)", to: { name: "admin-district-finance" }, icon: BanknotesIcon, module: "financial" },
    { label: "Check-in", to: { name: "admin-checkin" }, icon: QrCodeIcon, module: "checkin" },
    { label: "PIX / Pagamentos", to: { name: "admin-pix-config" }, icon: Cog6ToothIcon, requiresRole: "AdminGeral" },
    { label: "Configuracoes", to: "/admin/system-config", icon: Cog6ToothIcon, requiresRole: "AdminGeral" }
];
const adminMenuItems = computed(() => baseAdminMenu.filter((item) => {
    if (item.requiresRole && auth.user?.role !== item.requiresRole) {
        return false;
    }
    if (!item.module) {
        return true;
    }
    return auth.hasPermission(item.module, item.action ?? "view");
}));
const adminStandaloneRoutes = new Set(["admin-login", "admin-forgot-password", "admin-force-password"]);
const isAdminLayout = computed(() => {
    if (!route.path.startsWith("/admin")) {
        return false;
    }
    const currentName = typeof route.name === "string" ? route.name : "";
    return !adminStandaloneRoutes.has(currentName);
});
const handleViewportResize = () => {
    if (!isAdminLayout.value) {
        lockBodyScroll(false);
        return;
    }
    if (isMobileViewport()) {
        isSidebarOpen.value = false;
        lockBodyScroll(false);
    }
    else {
        lockBodyScroll(false);
    }
};
const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
};
watch(() => route.fullPath, () => {
    if (!isAdminLayout.value) {
        return;
    }
    if (typeof window !== "undefined" && window.innerWidth < mobileViewportBreakpoint) {
        isSidebarOpen.value = false;
    }
});
watch(() => isSidebarOpen.value, (isOpen) => {
    if (!isAdminLayout.value) {
        return;
    }
    if (isMobileViewport()) {
        lockBodyScroll(isOpen);
    }
    else {
        lockBodyScroll(false);
    }
}, { immediate: true });
const activeBrandLogo = computed(() => {
    const branding = systemConfig.value.branding;
    if (isDark.value) {
        return branding.logoDarkUrl ?? branding.logoLightUrl ?? "";
    }
    return branding.logoLightUrl ?? branding.logoDarkUrl ?? "";
});
const adminLink = computed(() => auth.isAuthenticated ? { name: "admin-dashboard" } : { name: "admin-login" });
const adminLinkLabel = computed(() => (auth.isAuthenticated ? "Painel admin" : "Admin"));
const userDisplayName = computed(() => {
    const name = auth.user?.name?.trim();
    if (!name)
        return "";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
        return parts[0] ?? "";
    }
    return `${parts[0]} ${parts[parts.length - 1]}`;
});
const greetingMessage = computed(() => {
    if (!auth.isAuthenticated)
        return "";
    const displayName = userDisplayName.value;
    if (!displayName)
        return "";
    const hour = currentTime.value.getHours();
    let greeting = "Olá";
    if (hour >= 5 && hour < 12) {
        greeting = "Bom dia";
    }
    else if (hour >= 12 && hour < 18) {
        greeting = "Boa tarde";
    }
    else {
        greeting = "Boa noite";
    }
    return `${greeting}, ${displayName}`;
});
onMounted(() => {
    if (typeof window !== "undefined") {
        if (isMobileViewport()) {
            isSidebarOpen.value = false;
        }
        window.addEventListener("resize", handleViewportResize);
    }
    if (typeof window !== "undefined") {
        timer = window.setInterval(() => {
            currentTime.value = new Date();
        }, 60 * 1000);
    }
});
onBeforeUnmount(() => {
    if (timer) {
        window.clearInterval(timer);
    }
    if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleViewportResize);
    }
    lockBodyScroll(false);
});
const handleSignOut = () => {
    auth.signOut();
    router.push({ name: "admin-login" });
    mobileMenuOpen.value = false;
};
const userInitials = computed(() => {
    const name = auth.user?.name?.trim();
    if (!name) {
        return "CI";
    }
    const letters = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0)?.toUpperCase() ?? "")
        .join("");
    return letters || "CI";
});
const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
};
const closeMobileMenu = () => {
    mobileMenuOpen.value = false;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ({ dark: __VLS_ctx.isDark }) },
});
/** @type {[typeof LoadingOverlay, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(LoadingOverlay, new LoadingOverlay({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "min-h-screen bg-[color:var(--background)] text-[color:var(--text)] transition-colors" },
});
if (__VLS_ctx.isAdminLayout) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex min-h-screen flex-col md:flex-row" },
    });
    /** @type {[typeof AdminSidebar, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(AdminSidebar, new AdminSidebar({
        ...{ 'onToggle': {} },
        isOpen: (__VLS_ctx.isSidebarOpen),
        menuItems: (__VLS_ctx.adminMenuItems),
    }));
    const __VLS_4 = __VLS_3({
        ...{ 'onToggle': {} },
        isOpen: (__VLS_ctx.isSidebarOpen),
        menuItems: (__VLS_ctx.adminMenuItems),
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
    let __VLS_6;
    let __VLS_7;
    let __VLS_8;
    const __VLS_9 = {
        onToggle: (__VLS_ctx.toggleSidebar)
    };
    var __VLS_5;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex min-h-screen flex-1 flex-col bg-[#F3F6FB] dark:bg-[#050816]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "sticky top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-[color:var(--app-shell-border)] bg-[color:var(--app-shell-bg)] px-4 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex min-w-0 flex-1 items-center gap-3" },
    });
    const __VLS_10 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        to: "/",
        ...{ class: "flex items-center gap-3 text-lg font-semibold text-[#111827] dark:text-white" },
    }));
    const __VLS_12 = __VLS_11({
        to: "/",
        ...{ class: "flex items-center gap-3 text-lg font-semibold text-[#111827] dark:text-white" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_13.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-[#fdfdff] to-[#eef3ff] shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.1)] dark:from-[#1b2140] dark:to-[#11152A]" },
    });
    if (__VLS_ctx.activeBrandLogo) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.activeBrandLogo),
            alt: "Logotipo CATRE",
            ...{ class: "h-full w-full object-contain p-1.5" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-semibold text-[#5a6bff] dark:text-white" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-base font-semibold sm:text-lg" },
    });
    var __VLS_13;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-1 items-center justify-end gap-2 sm:gap-3" },
    });
    if (__VLS_ctx.greetingMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hidden flex-col text-right leading-tight sm:flex" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm font-semibold text-[#1f2937] dark:text-white" },
        });
        (__VLS_ctx.greetingMessage);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-[#94A3B8] dark:text-[#94a3b8]" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleTheme) },
        type: "button",
        ...{ class: "hidden h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-[#5a6bff] shadow-sm transition hover:bg-[#f3f6ff] dark:border-[rgba(255,255,255,0.1)] dark:bg-transparent dark:text-white lg:flex" },
        'aria-pressed': (__VLS_ctx.isDark),
    });
    if (__VLS_ctx.isDark) {
        const __VLS_14 = {}.SunIcon;
        /** @type {[typeof __VLS_components.SunIcon, ]} */ ;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }));
        const __VLS_16 = __VLS_15({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    }
    else {
        const __VLS_18 = {}.MoonIcon;
        /** @type {[typeof __VLS_components.MoonIcon, ]} */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }));
        const __VLS_20 = __VLS_19({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    const __VLS_22 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
        to: (__VLS_ctx.adminLink),
        ...{ class: "btn-outline hidden sm:inline-flex" },
    }));
    const __VLS_24 = __VLS_23({
        to: (__VLS_ctx.adminLink),
        ...{ class: "btn-outline hidden sm:inline-flex" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_23));
    __VLS_25.slots.default;
    const __VLS_26 = {}.ShieldCheckIcon;
    /** @type {[typeof __VLS_components.ShieldCheckIcon, ]} */ ;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
        ...{ class: "h-5 w-5" },
        'aria-hidden': "true",
    }));
    const __VLS_28 = __VLS_27({
        ...{ class: "h-5 w-5" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.adminLinkLabel);
    var __VLS_25;
    if (__VLS_ctx.auth.isAuthenticated && __VLS_ctx.auth.user?.role === 'AdminGeral') {
        const __VLS_30 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
            to: "/admin/system-config",
            ...{ class: "btn-muted hidden font-medium sm:inline-flex" },
        }));
        const __VLS_32 = __VLS_31({
            to: "/admin/system-config",
            ...{ class: "btn-muted hidden font-medium sm:inline-flex" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_31));
        __VLS_33.slots.default;
        var __VLS_33;
    }
    if (__VLS_ctx.auth.isAuthenticated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hidden h-10 w-10 items-center justify-center rounded-full bg-[#1f4fff] text-sm font-semibold text-white shadow-md lg:flex" },
        });
        (__VLS_ctx.userInitials);
    }
    if (__VLS_ctx.auth.isAuthenticated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleSignOut) },
            type: "button",
            ...{ class: "btn-muted hidden text-[#475569] dark:text-white sm:inline-flex" },
        });
        const __VLS_34 = {}.ArrowRightOnRectangleIcon;
        /** @type {[typeof __VLS_components.ArrowRightOnRectangleIcon, ]} */ ;
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }));
        const __VLS_36 = __VLS_35({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_35));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleSidebar) },
        type: "button",
        ...{ class: "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/90 text-[#0b1220] shadow-sm shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white md:hidden dark:border-white/20 dark:bg-white/15 dark:text-white dark:shadow-black/30 dark:hover:bg-white/25" },
        'aria-pressed': (__VLS_ctx.isSidebarOpen),
    });
    if (!__VLS_ctx.isSidebarOpen) {
        const __VLS_38 = {}.Bars3Icon;
        /** @type {[typeof __VLS_components.Bars3Icon, ]} */ ;
        // @ts-ignore
        const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }));
        const __VLS_40 = __VLS_39({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    }
    else {
        const __VLS_42 = {}.XMarkIcon;
        /** @type {[typeof __VLS_components.XMarkIcon, ]} */ ;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }));
        const __VLS_44 = __VLS_43({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "flex-1 px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:px-10" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mx-auto w-full max-w-[1900px] space-y-6" },
    });
    const __VLS_46 = {}.RouterView;
    /** @type {[typeof __VLS_components.RouterView, ]} */ ;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({}));
    const __VLS_48 = __VLS_47({}, ...__VLS_functionalComponentArgsRest(__VLS_47));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "sticky top-0 z-50" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mx-auto w-full max-w-[1900px] px-3 py-4 sm:px-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-between rounded-[32px] border border-[color:var(--app-shell-border)] bg-[color:var(--app-shell-bg)] px-4 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_60px_rgba(0,0,0,0.55)]" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center gap-4" },
    });
    const __VLS_50 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        to: "/",
        ...{ class: "flex items-center gap-3 text-lg font-semibold text-[color:var(--text)]" },
    }));
    const __VLS_52 = __VLS_51({
        to: "/",
        ...{ class: "flex items-center gap-3 text-lg font-semibold text-[color:var(--text)]" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    __VLS_53.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-[#fdfdff] to-[#eef3ff] shadow-[0_10px_30px_rgba(15,23,42,0.08)]" },
    });
    if (__VLS_ctx.activeBrandLogo) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.activeBrandLogo),
            alt: "Logotipo CATRE",
            ...{ class: "h-full w-full object-contain p-1.5" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-semibold text-[#5a6bff]" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-base font-semibold sm:text-lg" },
    });
    var __VLS_53;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-1 items-center justify-end gap-2 sm:gap-3" },
    });
    if (__VLS_ctx.greetingMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hidden flex-col text-right leading-tight sm:flex" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm font-semibold text-[color:var(--text)]" },
        });
        (__VLS_ctx.greetingMessage);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-[#94A3B8] dark:text-[color:var(--text-muted)]" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleTheme) },
        type: "button",
        ...{ class: "hidden h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-[#5a6bff] shadow-sm transition hover:bg-[#f3f6ff] dark:border-[rgba(255,255,255,0.1)] dark:bg-transparent dark:text-white lg:flex" },
        'aria-pressed': (__VLS_ctx.isDark),
    });
    if (__VLS_ctx.isDark) {
        const __VLS_54 = {}.SunIcon;
        /** @type {[typeof __VLS_components.SunIcon, ]} */ ;
        // @ts-ignore
        const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }));
        const __VLS_56 = __VLS_55({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    }
    else {
        const __VLS_58 = {}.MoonIcon;
        /** @type {[typeof __VLS_components.MoonIcon, ]} */ ;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }));
        const __VLS_60 = __VLS_59({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    const __VLS_62 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
        to: (__VLS_ctx.adminLink),
        ...{ class: "btn-outline hidden sm:inline-flex" },
    }));
    const __VLS_64 = __VLS_63({
        to: (__VLS_ctx.adminLink),
        ...{ class: "btn-outline hidden sm:inline-flex" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    __VLS_65.slots.default;
    const __VLS_66 = {}.ShieldCheckIcon;
    /** @type {[typeof __VLS_components.ShieldCheckIcon, ]} */ ;
    // @ts-ignore
    const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
        ...{ class: "h-5 w-5" },
        'aria-hidden': "true",
    }));
    const __VLS_68 = __VLS_67({
        ...{ class: "h-5 w-5" },
        'aria-hidden': "true",
    }, ...__VLS_functionalComponentArgsRest(__VLS_67));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.adminLinkLabel);
    var __VLS_65;
    if (__VLS_ctx.auth.isAuthenticated && __VLS_ctx.auth.user?.role === 'AdminGeral') {
        const __VLS_70 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
            to: "/admin/system-config",
            ...{ class: "btn-muted hidden font-medium sm:inline-flex" },
        }));
        const __VLS_72 = __VLS_71({
            to: "/admin/system-config",
            ...{ class: "btn-muted hidden font-medium sm:inline-flex" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
        __VLS_73.slots.default;
        var __VLS_73;
    }
    if (__VLS_ctx.auth.isAuthenticated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hidden h-10 w-10 items-center justify-center rounded-full bg-[#1f4fff] text-sm font-semibold text-white shadow-md lg:flex" },
        });
        (__VLS_ctx.userInitials);
    }
    if (__VLS_ctx.auth.isAuthenticated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleSignOut) },
            type: "button",
            ...{ class: "btn-muted hidden text-[#475569] dark:text-[color:var(--text)] sm:inline-flex" },
        });
        const __VLS_74 = {}.ArrowRightOnRectangleIcon;
        /** @type {[typeof __VLS_components.ArrowRightOnRectangleIcon, ]} */ ;
        // @ts-ignore
        const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }));
        const __VLS_76 = __VLS_75({
            ...{ class: "h-5 w-5" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_75));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleMobileMenu) },
        type: "button",
        ...{ class: "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-neutral-700 shadow-sm transition hover:bg-[#f7f8ff] dark:border-[color:var(--border-card)] dark:bg-[color:var(--surface-card-alt)] dark:text-[color:var(--text)] sm:hidden" },
    });
    if (!__VLS_ctx.mobileMenuOpen) {
        const __VLS_78 = {}.Bars3Icon;
        /** @type {[typeof __VLS_components.Bars3Icon, ]} */ ;
        // @ts-ignore
        const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }));
        const __VLS_80 = __VLS_79({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_79));
    }
    else {
        const __VLS_82 = {}.XMarkIcon;
        /** @type {[typeof __VLS_components.XMarkIcon, ]} */ ;
        // @ts-ignore
        const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }));
        const __VLS_84 = __VLS_83({
            ...{ class: "h-6 w-6" },
            'aria-hidden': "true",
        }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sr-only" },
    });
    const __VLS_86 = {}.transition;
    /** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
    // @ts-ignore
    const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
        name: "fade",
    }));
    const __VLS_88 = __VLS_87({
        name: "fade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_87));
    __VLS_89.slots.default;
    if (__VLS_ctx.mobileMenuOpen) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mx-auto mt-2 flex w-full max-w-[95%] flex-col gap-2 rounded-2xl border border-[color:var(--app-shell-border)] bg-[color:var(--surface-card)] px-4 py-4 text-sm shadow-[0_25px_80px_rgba(15,23,42,0.2)] backdrop-blur sm:hidden dark:shadow-[0_25px_80px_rgba(0,0,0,0.55)]" },
        });
        if (__VLS_ctx.greetingMessage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-3 text-sm font-semibold text-[color:var(--text)]" },
            });
            (__VLS_ctx.greetingMessage);
        }
        const __VLS_90 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
            ...{ 'onClick': {} },
            to: (__VLS_ctx.adminLink),
            ...{ class: "btn-outline w-full justify-center border-[color:var(--border-card)]" },
        }));
        const __VLS_92 = __VLS_91({
            ...{ 'onClick': {} },
            to: (__VLS_ctx.adminLink),
            ...{ class: "btn-outline w-full justify-center border-[color:var(--border-card)]" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        let __VLS_94;
        let __VLS_95;
        let __VLS_96;
        const __VLS_97 = {
            onClick: (__VLS_ctx.closeMobileMenu)
        };
        __VLS_93.slots.default;
        const __VLS_98 = {}.ShieldCheckIcon;
        /** @type {[typeof __VLS_components.ShieldCheckIcon, ]} */ ;
        // @ts-ignore
        const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
            ...{ class: "h-5 w-5" },
        }));
        const __VLS_100 = __VLS_99({
            ...{ class: "h-5 w-5" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_99));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.adminLinkLabel);
        var __VLS_93;
        if (__VLS_ctx.auth.isAuthenticated && __VLS_ctx.auth.user?.role === 'AdminGeral') {
            const __VLS_102 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
            // @ts-ignore
            const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
                ...{ 'onClick': {} },
                to: "/admin/system-config",
                ...{ class: "btn-muted w-full justify-center" },
            }));
            const __VLS_104 = __VLS_103({
                ...{ 'onClick': {} },
                to: "/admin/system-config",
                ...{ class: "btn-muted w-full justify-center" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_103));
            let __VLS_106;
            let __VLS_107;
            let __VLS_108;
            const __VLS_109 = {
                onClick: (__VLS_ctx.closeMobileMenu)
            };
            __VLS_105.slots.default;
            var __VLS_105;
        }
        if (__VLS_ctx.auth.isAuthenticated) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.handleSignOut) },
                type: "button",
                ...{ class: "btn-muted w-full justify-center" },
            });
            const __VLS_110 = {}.ArrowRightOnRectangleIcon;
            /** @type {[typeof __VLS_components.ArrowRightOnRectangleIcon, ]} */ ;
            // @ts-ignore
            const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
                ...{ class: "h-5 w-5" },
            }));
            const __VLS_112 = __VLS_111({
                ...{ class: "h-5 w-5" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_111));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
    }
    var __VLS_89;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[98%] flex-col rounded-[32px] border border-[color:var(--border-card)] bg-[color:var(--surface-card)]/95 px-4 py-10 shadow-[0_45px_120px_-60px_rgba(15,23,42,0.45)] backdrop-blur 2xl:max-w-[1900px] sm:px-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "flex-1 pb-10" },
    });
    const __VLS_114 = {}.RouterView;
    /** @type {[typeof __VLS_components.RouterView, ]} */ ;
    // @ts-ignore
    const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({}));
    const __VLS_116 = __VLS_115({}, ...__VLS_functionalComponentArgsRest(__VLS_115));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
        ...{ class: "mt-auto border-t border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] py-6 text-center text-sm text-[color:var(--text-muted)]" },
    });
    (new Date().getFullYear());
}
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--background)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#F3F6FB]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[#050816]']} */ ;
/** @type {__VLS_StyleScopedClasses['sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-30']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:pt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[32px]']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--app-shell-border)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--app-shell-bg)]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_20px_60px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#111827]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-[#fdfdff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#eef3ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_10px_30px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.1)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-[#1b2140]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-[#11152A]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-contain']} */ ;
/** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#5a6bff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#1f2937]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#94A3B8]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[#94a3b8]']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['h-11']} */ ;
/** @type {__VLS_StyleScopedClasses['w-11']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#5a6bff]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-[#f3f6ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.1)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#1f4fff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#475569]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-11']} */ ;
/** @type {__VLS_StyleScopedClasses['w-11']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#0b1220]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-black/10']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['md:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/15']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/30']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-white/25']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-16']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-8']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:px-8']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:px-10']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-[1900px]']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-[1900px]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[32px]']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--app-shell-border)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--app-shell-bg)]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_18px_60px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_18px_60px_rgba(0,0,0,0.55)]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-[#fdfdff]']} */ ;
/** @type {__VLS_StyleScopedClasses['to-[#eef3ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_10px_30px_rgba(15,23,42,0.08)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-contain']} */ ;
/** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#5a6bff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#94A3B8]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text-muted)]']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['h-11']} */ ;
/** @type {__VLS_StyleScopedClasses['w-11']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#5a6bff]']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-[#f3f6ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[rgba(255,255,255,0.1)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[#1f4fff]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:flex']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[#475569]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-11']} */ ;
/** @type {__VLS_StyleScopedClasses['w-11']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-[#f7f8ff]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-[color:var(--surface-card-alt)]']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-[95%]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--app-shell-border)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_25px_80px_rgba(15,23,42,0.2)]']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-[0_25px_80px_rgba(0,0,0,0.55)]']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card-alt)]']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text)]']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-5']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-[calc(100vh-72px)]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-[98%]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-[32px]']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card)]/95']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-10']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-[0_45px_120px_-60px_rgba(15,23,42,0.45)]']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['2xl:max-w-[1900px]']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-10']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-[color:var(--border-card)]']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-[color:var(--surface-card-alt)]']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[color:var(--text-muted)]']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            RouterView: RouterView,
            ArrowRightOnRectangleIcon: ArrowRightOnRectangleIcon,
            Bars3Icon: Bars3Icon,
            MoonIcon: MoonIcon,
            ShieldCheckIcon: ShieldCheckIcon,
            SunIcon: SunIcon,
            XMarkIcon: XMarkIcon,
            LoadingOverlay: LoadingOverlay,
            AdminSidebar: AdminSidebar,
            isDark: isDark,
            toggleTheme: toggleTheme,
            auth: auth,
            mobileMenuOpen: mobileMenuOpen,
            isSidebarOpen: isSidebarOpen,
            adminMenuItems: adminMenuItems,
            isAdminLayout: isAdminLayout,
            toggleSidebar: toggleSidebar,
            activeBrandLogo: activeBrandLogo,
            adminLink: adminLink,
            adminLinkLabel: adminLinkLabel,
            greetingMessage: greetingMessage,
            handleSignOut: handleSignOut,
            userInitials: userInitials,
            toggleMobileMenu: toggleMobileMenu,
            closeMobileMenu: closeMobileMenu,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=App.vue.js.map