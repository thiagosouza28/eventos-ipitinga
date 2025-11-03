import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const EventLanding = () => import("../pages/public/EventLanding.vue");
const EventFlow = () => import("../pages/public/EventFlow.vue");
const PaymentPage = () => import("../pages/public/PaymentPage.vue");
const ReceiptLookup = () => import("../pages/public/ReceiptLookup.vue");
const CheckinValidate = () => import("../pages/public/CheckinValidate.vue");

const AdminLogin = () => import("../pages/admin/AdminLogin.vue");
const AdminDashboard = () => import("../pages/admin/AdminDashboard.vue");
const AdminEvents = () => import("../pages/admin/AdminEvents.vue");
const AdminRegistrations = () => import("../pages/admin/AdminRegistrations.vue");
const AdminOrders = () => import("../pages/admin/AdminOrders.vue");
const AdminCheckin = () => import("../pages/admin/AdminCheckin.vue");
const AdminCatalog = () => import("../pages/admin/AdminCatalog.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: EventLanding },
    { path: "/evento/:slug", name: "event", component: EventFlow, props: true },
    { path: "/evento/:slug/pagamento/:orderId", name: "payment", component: PaymentPage, props: true },
    { path: "/comprovante", name: "receipt", component: ReceiptLookup },
    { path: "/checkin/validate", name: "checkin-validate", component: CheckinValidate },
    { path: "/admin", name: "admin-login", component: AdminLogin },
    {
      path: "/admin/dashboard",
      name: "admin-dashboard",
      component: AdminDashboard,
      meta: { requiresAuth: true }
    },
    {
      path: "/admin/catalog",
      name: "admin-catalog",
      component: AdminCatalog,
      meta: { requiresAuth: true }
    },
    {
      path: "/admin/events",
      name: "admin-events",
      component: AdminEvents,
      meta: { requiresAuth: true }
    },
    {
      path: "/admin/registrations",
      name: "admin-registrations",
      component: AdminRegistrations,
      meta: { requiresAuth: true }
    },
    {
      path: "/admin/orders",
      name: "admin-orders",
      component: AdminOrders,
      meta: { requiresAuth: true }
    },
    {
      path: "/admin/checkin/:eventId",
      name: "admin-checkin",
      component: AdminCheckin,
      props: true,
      meta: { requiresAuth: true }
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
  next();
});
