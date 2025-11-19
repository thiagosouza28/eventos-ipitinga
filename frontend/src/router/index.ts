import { createRouter, createWebHistory } from "vue-router";
import type { PermissionAction, Role } from "../types/api";
import { useAuthStore } from "../stores/auth";

const EventLanding = () => import("../pages/public/EventLanding.vue");
const EventFlow = () => import("../pages/public/EventFlow.vue");
const PaymentPage = () => import("../pages/public/PaymentPage.vue");
const PendingOrders = () => import("../pages/public/PendingOrders.vue");
const ReceiptLookup = () => import("../pages/public/ReceiptLookup.vue");
const CheckinValidate = () => import("../pages/public/CheckinValidate.vue");

const AdminLogin = () => import("../pages/admin/AdminLogin.vue");
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
const AdminEventFinancial = () => import("../pages/admin/AdminEventFinancial.vue");
const AdminUsers = () => import("../pages/admin/AdminUsers.vue");
const AdminProfiles = () => import("../pages/admin/AdminProfiles.vue");
const AdminAccessDenied = () => import("../pages/admin/AdminAccessDenied.vue");
const AdminSystemConfig = () => import("../pages/admin/AdminSystemConfig.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: EventLanding },
    { path: "/evento/:slug", name: "event", component: EventFlow, props: true },
    { path: "/evento/:slug/pagamento/:orderId", name: "payment", component: PaymentPage, props: true },
    { 
      path: "/pendencias/:cpf?",
      name: "pending-orders",
      component: PendingOrders,
      props: (route) => ({
        cpf: route.params.cpf || route.query.cpf
      })
    },
    { path: "/comprovante", name: "receipt", component: ReceiptLookup },
    { path: "/checkin/validate", name: "checkin-validate", component: CheckinValidate },
    { path: "/admin", name: "admin-login", component: AdminLogin },
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

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  if (to.name === "admin-login" && auth.isAuthenticated) {
    next({ name: "admin-dashboard" });
    return;
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: "admin-login", query: { redirect: to.fullPath } });
    return;
  }
  if (to.meta.requiresPermission && auth.isAuthenticated) {
    const requirement = to.meta.requiresPermission as { module: string; action?: PermissionAction };
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
    const requiredRole = to.meta.requiresRole as Role;
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

