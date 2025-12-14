import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useLoaderStore } from "../stores/loader";
const EventLanding = () => import("../pages/public/EventLanding.vue");
const EventFlow = () => import("../pages/public/EventFlow.vue");
const PaymentPage = () => import("../pages/public/PaymentPage.vue");
const AdminPendingOrders = () => import("../pages/public/PendingOrders.vue");
const ReceiptLookup = () => import("../pages/public/ReceiptLookup.vue");
const CheckinValidate = () => import("../pages/public/CheckinValidate.vue");
const DocumentPreview = () => import("../pages/shared/DocumentPreview.vue");
const AdminLogin = () => import("../pages/admin/AdminLogin.vue");
const AdminForgotPassword = () => import("../pages/admin/AdminForgotPassword.vue");
const AdminForcePassword = () => import("../pages/admin/AdminForcePassword.vue");
const AdminDashboard = () => import("../pages/admin/AdminDashboard.vue");
const AdminEvents = () => import("../pages/admin/AdminEvents.vue");
const AdminRegistrations = () => import("../pages/admin/AdminRegistrations.vue");
const AdminOrders = () => import("../pages/admin/AdminOrders.vue");
const AdminCheckin = () => import("../pages/admin/AdminCheckin.vue");
const AdminCatalog = () => import("../pages/admin/AdminCatalog.vue");
const AdminDistricts = () => import("../pages/admin/AdminDistricts.vue");
const AdminChurches = () => import("../pages/admin/AdminChurches.vue");
const AdminMinistries = () => import("../pages/admin/AdminMinistries.vue");
const AdminFinancial = () => import("../pages/admin/AdminFinancial.vue");
const AdminDistrictFinance = () => import("../pages/admin/AdminDistrictFinance.vue");
const AdminReports = () => import("../pages/admin/AdminReports.vue");
const AdminEventFinancial = () => import("../pages/admin/AdminEventFinancial.vue");
const AdminUsers = () => import("../pages/admin/AdminUsers.vue");
const AdminProfile = () => import("../pages/admin/AdminProfile.vue");
const AdminProfiles = () => import("../pages/admin/AdminProfiles.vue");
const AdminAccessDenied = () => import("../pages/admin/AdminAccessDenied.vue");
const AdminSystemConfig = () => import("../pages/admin/AdminSystemConfig.vue");
const AdminPixConfig = () => import("../pages/admin/AdminPixConfig.vue");
export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", name: "home", component: EventLanding },
        { path: "/evento/:slug", name: "event", component: EventFlow, props: true },
        { path: "/evento/:slug/pagamento/:orderId", name: "payment", component: PaymentPage, props: true },
        {
            path: "/admin/pendencias",
            name: "admin-pending-orders",
            component: AdminPendingOrders,
            meta: { requiresAuth: true, requiresPermission: { module: "orders", action: "view" } }
        },
        { path: "/comprovante", name: "receipt", component: ReceiptLookup },
        { path: "/checkin/validate", name: "checkin-validate", component: CheckinValidate },
        { path: "/documentos/visualizar", name: "document-preview", component: DocumentPreview },
        { path: "/admin", name: "admin-login", component: AdminLogin },
        { path: "/admin/esqueci-senha", name: "admin-forgot-password", component: AdminForgotPassword },
        {
            path: "/admin/alterar-senha",
            name: "admin-force-password",
            component: AdminForcePassword,
            meta: { requiresAuth: true, allowPasswordReset: true }
        },
        {
            path: "/admin/dashboard",
            name: "admin-dashboard",
            component: AdminDashboard,
            meta: { requiresAuth: true, requiresPermission: { module: "dashboard", action: "view" } }
        },
        {
            path: "/admin/users",
            name: "admin-users",
            component: AdminUsers,
            meta: { requiresAuth: true, requiresPermission: { module: "users", action: "view" } }
        },
        {
            path: "/admin/profile",
            name: "admin-profile",
            component: AdminProfile,
            meta: { requiresAuth: true }
        },
        {
            path: "/admin/profiles",
            name: "admin-profiles",
            component: AdminProfiles,
            meta: { requiresAuth: true, requiresPermission: { module: "profiles", action: "view" } }
        },
        {
            path: "/admin/catalog",
            name: "admin-catalog",
            component: AdminCatalog,
            meta: { requiresAuth: true, requiresPermission: { module: "catalog", action: "view" } }
        },
        {
            path: "/admin/districts",
            name: "admin-districts",
            component: AdminDistricts,
            meta: { requiresAuth: true, requiresPermission: { module: "districts", action: "view" } }
        },
        {
            path: "/admin/churches",
            name: "admin-churches",
            component: AdminChurches,
            meta: { requiresAuth: true, requiresPermission: { module: "churches", action: "view" } }
        },
        {
            path: "/admin/ministries",
            name: "admin-ministries",
            component: AdminMinistries,
            meta: { requiresAuth: true, requiresPermission: { module: "ministries", action: "view" } }
        },
        {
            path: "/admin/events",
            name: "admin-events",
            component: AdminEvents,
            meta: { requiresAuth: true, requiresPermission: { module: "events", action: "view" } }
        },
        {
            path: "/admin/registrations",
            name: "admin-registrations",
            component: AdminRegistrations,
            meta: { requiresAuth: true, requiresPermission: { module: "registrations", action: "view" } }
        },
        {
            path: "/admin/reports/:tab?",
            name: "admin-reports",
            component: AdminReports,
            props: true,
            meta: { requiresAuth: true, requiresPermission: { module: "reports", action: "view" } }
        },
        {
            path: "/admin/orders",
            name: "admin-orders",
            component: AdminOrders,
            meta: { requiresAuth: true, requiresPermission: { module: "orders", action: "view" } }
        },
        {
            path: "/admin/financial",
            name: "admin-financial",
            component: AdminFinancial,
            meta: { requiresAuth: true, requiresPermission: { module: "financial", action: "view" } }
        },
        {
            path: "/admin/finance/districts",
            name: "admin-district-finance",
            component: AdminDistrictFinance,
            meta: { requiresAuth: true, requiresPermission: { module: "financial", action: "view" } }
        },
        {
            path: "/admin/events/:eventId/financial",
            name: "admin-event-financial",
            component: AdminEventFinancial,
            props: true,
            meta: { requiresAuth: true, requiresPermission: { module: "financial", action: "view" } }
        },
        {
            path: "/admin/checkin/:eventId?",
            name: "admin-checkin",
            component: AdminCheckin,
            props: true,
            meta: { requiresAuth: true, requiresPermission: { module: "checkin", action: "view" } }
        },
        {
            path: "/admin/system-config",
            name: "admin-system-config",
            component: AdminSystemConfig,
            meta: { requiresAuth: true, requiresRole: "AdminGeral" }
        },
        {
            path: "/admin/payments/pix",
            name: "admin-pix-config",
            component: AdminPixConfig,
            meta: { requiresAuth: true, requiresRole: "AdminGeral" }
        },
        {
            path: "/admin/acesso-negado",
            name: "admin-access-denied",
            component: AdminAccessDenied,
            meta: { requiresAuth: true }
        },
        {
            path: "/:pathMatch(.*)*",
            name: "not-found",
            redirect: "/"
        }
    ]
});
const shouldTriggerRouteLoader = (to, from) => {
    if (!from.name) {
        return true;
    }
    return to.fullPath !== from.fullPath;
};
router.beforeEach((to, from, next) => {
    const auth = useAuthStore();
    const loader = useLoaderStore();
    if (shouldTriggerRouteLoader(to, from)) {
        loader.show("Carregando pagina...");
    }
    if (to.name === "admin-login" && auth.isAuthenticated) {
        next({ name: "admin-dashboard" });
        return;
    }
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        next({ name: "admin-login", query: { redirect: to.fullPath } });
        return;
    }
    if (auth.isAuthenticated &&
        auth.user?.mustChangePassword &&
        !to.meta.allowPasswordReset &&
        to.name !== "admin-force-password") {
        next({
            name: "admin-force-password",
            query: { redirect: to.fullPath }
        });
        return;
    }
    if (to.meta.requiresPermission && auth.isAuthenticated) {
        const requirement = to.meta.requiresPermission;
        if (!auth.hasPermission(requirement.module, requirement.action ?? "view")) {
            next({
                name: "admin-access-denied",
                query: {
                    module: requirement.module,
                    action: requirement.action ?? "view",
                    from: to.fullPath
                }
            });
            return;
        }
    }
    if (to.meta.requiresRole && auth.isAuthenticated) {
        const requiredRole = to.meta.requiresRole;
        if (auth.user?.role !== requiredRole) {
            next({
                name: "admin-access-denied",
                query: {
                    from: to.fullPath,
                    role: requiredRole
                }
            });
            return;
        }
    }
    next();
});
router.afterEach(() => {
    const loader = useLoaderStore();
    loader.hide();
});
router.onError(() => {
    const loader = useLoaderStore();
    loader.hide();
});
//# sourceMappingURL=index.js.map