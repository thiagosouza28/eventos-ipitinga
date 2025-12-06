<template>
  <div :class="{ dark: isDark }">
    <LoadingOverlay />
    <div class="min-h-screen bg-[color:var(--background)] text-[color:var(--text)] transition-colors">
      <template v-if="isAdminLayout">
        <div class="flex min-h-screen flex-col md:flex-row">
          <AdminSidebar :is-open="isSidebarOpen" :menu-items="adminMenuItems" @toggle="toggleSidebar" />
          <div class="flex min-h-screen flex-1 flex-col bg-[#F3F6FB] dark:bg-[#050816]">
            <header class="sticky top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6">
              <div
                class="flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-[color:var(--app-shell-border)] bg-[color:var(--app-shell-bg)] px-4 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
              >
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <RouterLink to="/" class="flex items-center gap-3 text-lg font-semibold text-[#111827] dark:text-white">
                    <div
                      class="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-[#fdfdff] to-[#eef3ff] shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.1)] dark:from-[#1b2140] dark:to-[#11152A]"
                    >
                      <img v-if="activeBrandLogo" :src="activeBrandLogo" alt="Logotipo CATRE" class="h-full w-full object-contain p-1.5" />
                      <span v-else class="font-semibold text-[#5a6bff] dark:text-white">CI</span>
                    </div>
                    <span class="text-base font-semibold sm:text-lg">CATRE Ipitinga</span>
                  </RouterLink>
                </div>
                <div class="flex flex-1 items-center justify-end gap-2 sm:gap-3">
                  <div v-if="greetingMessage" class="hidden flex-col text-right leading-tight sm:flex">
                    <span class="text-sm font-semibold text-[#1f2937] dark:text-white">{{ greetingMessage }}</span>
                    <span class="text-xs text-[#94A3B8] dark:text-[#94a3b8]">Estamos felizes em ver você</span>
                  </div>
                  <button
                    type="button"
                    class="hidden h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-[#5a6bff] shadow-sm transition hover:bg-[#f3f6ff] dark:border-[rgba(255,255,255,0.1)] dark:bg-transparent dark:text-white lg:flex"
                    :aria-pressed="isDark"
                    @click="toggleTheme"
                  >
                    <SunIcon v-if="isDark" class="h-5 w-5" aria-hidden="true" />
                    <MoonIcon v-else class="h-5 w-5" aria-hidden="true" />
                    <span class="sr-only">Alternar tema</span>
                  </button>
                  <RouterLink :to="adminLink" class="btn-outline hidden sm:inline-flex">
                    <ShieldCheckIcon class="h-5 w-5" aria-hidden="true" />
                    <span>{{ adminLinkLabel }}</span>
                  </RouterLink>
                  <RouterLink
                    v-if="auth.isAuthenticated && auth.user?.role === 'AdminGeral'"
                    to="/admin/system-config"
                    class="btn-muted hidden font-medium sm:inline-flex"
                  >
                    Configurações
                  </RouterLink>
                  <div
                    v-if="auth.isAuthenticated"
                    class="hidden h-10 w-10 items-center justify-center rounded-full bg-[#1f4fff] text-sm font-semibold text-white shadow-md lg:flex"
                  >
                    {{ userInitials }}
                  </div>
                  <button
                    v-if="auth.isAuthenticated"
                    type="button"
                    class="btn-muted hidden text-[#475569] dark:text-white sm:inline-flex"
                    @click="handleSignOut"
                  >
                    <ArrowRightOnRectangleIcon class="h-5 w-5" aria-hidden="true" />
                    <span>Sair</span>
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/90 text-[#0b1220] shadow-sm shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white md:hidden dark:border-white/20 dark:bg-white/15 dark:text-white dark:shadow-black/30 dark:hover:bg-white/25"
                    :aria-pressed="isSidebarOpen"
                    @click="toggleSidebar"
                  >
                    <Bars3Icon v-if="!isSidebarOpen" class="h-6 w-6" aria-hidden="true" />
                    <XMarkIcon v-else class="h-6 w-6" aria-hidden="true" />
                    <span class="sr-only">Alternar menu administrativo</span>
                  </button>
                </div>
              </div>
            </header>
            <main class="flex-1 px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:px-10">
              <div class="mx-auto w-full max-w-[1900px] space-y-6">
                <RouterView />
              </div>
            </main>
          </div>
        </div>
      </template>
      <template v-else>
        <header class="sticky top-0 z-50">
          <div class="mx-auto w-full max-w-[1900px] px-3 py-4 sm:px-6">
            <div class="flex items-center justify-between rounded-[32px] border border-[color:var(--app-shell-border)] bg-[color:var(--app-shell-bg)] px-4 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
              <div class="flex items-center gap-4">
                <RouterLink to="/" class="flex items-center gap-3 text-lg font-semibold text-[color:var(--text)]">
                  <div class="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-[#fdfdff] to-[#eef3ff] shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                    <img v-if="activeBrandLogo" :src="activeBrandLogo" alt="Logotipo CATRE" class="h-full w-full object-contain p-1.5" />
                    <span v-else class="font-semibold text-[#5a6bff]">CI</span>
                  </div>
                  <span class="text-base font-semibold sm:text-lg">CATRE Ipitinga</span>
                </RouterLink>
              </div>
              <div class="flex flex-1 items-center justify-end gap-2 sm:gap-3">
                <div v-if="greetingMessage" class="hidden flex-col text-right leading-tight sm:flex">
                  <span class="text-sm font-semibold text-[color:var(--text)]">{{ greetingMessage }}</span>
                  <span class="text-xs text-[#94A3B8] dark:text-[color:var(--text-muted)]">Estamos felizes em ver você</span>
                </div>
                <button
                  type="button"
                  class="hidden h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-[#5a6bff] shadow-sm transition hover:bg-[#f3f6ff] dark:border-[rgba(255,255,255,0.1)] dark:bg-transparent dark:text-white lg:flex"
                  :aria-pressed="isDark"
                  @click="toggleTheme"
                >
                  <SunIcon v-if="isDark" class="h-5 w-5" aria-hidden="true" />
                  <MoonIcon v-else class="h-5 w-5" aria-hidden="true" />
                  <span class="sr-only">Alternar tema</span>
                </button>
                <RouterLink :to="adminLink" class="btn-outline hidden sm:inline-flex">
                  <ShieldCheckIcon class="h-5 w-5" aria-hidden="true" />
                  <span>{{ adminLinkLabel }}</span>
                </RouterLink>
                <RouterLink
                  v-if="auth.isAuthenticated && auth.user?.role === 'AdminGeral'"
                  to="/admin/system-config"
                  class="btn-muted hidden font-medium sm:inline-flex"
                >
                  Configurações
                </RouterLink>
                <div
                  v-if="auth.isAuthenticated"
                  class="hidden h-10 w-10 items-center justify-center rounded-full bg-[#1f4fff] text-sm font-semibold text-white shadow-md lg:flex"
                >
                  {{ userInitials }}
                </div>
                <button
                  v-if="auth.isAuthenticated"
                  type="button"
                  class="btn-muted hidden text-[#475569] dark:text-[color:var(--text)] sm:inline-flex"
                  @click="handleSignOut"
                >
                  <ArrowRightOnRectangleIcon class="h-5 w-5" aria-hidden="true" />
                  <span>Sair</span>
                </button>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-neutral-700 shadow-sm transition hover:bg-[#f7f8ff] dark:border-[color:var(--border-card)] dark:bg-[color:var(--surface-card-alt)] dark:text-[color:var(--text)] sm:hidden"
                  @click="toggleMobileMenu"
                >
                  <Bars3Icon v-if="!mobileMenuOpen" class="h-6 w-6" aria-hidden="true" />
                  <XMarkIcon v-else class="h-6 w-6" aria-hidden="true" />
                  <span class="sr-only">Abrir menu</span>
                </button>
              </div>
            </div>
          </div>
          <transition name="fade">
            <div
              v-if="mobileMenuOpen"
              class="mx-auto mt-2 flex w-full max-w-[95%] flex-col gap-2 rounded-2xl border border-[color:var(--app-shell-border)] bg-[color:var(--surface-card)] px-4 py-4 text-sm shadow-[0_25px_80px_rgba(15,23,42,0.2)] backdrop-blur sm:hidden dark:shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
            >
              <div
                v-if="greetingMessage"
                class="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-3 text-sm font-semibold text-[color:var(--text)]"
              >
                {{ greetingMessage }}
              </div>
              <RouterLink :to="adminLink" class="btn-outline w-full justify-center border-[color:var(--border-card)]" @click="closeMobileMenu">
                <ShieldCheckIcon class="h-5 w-5" />
                <span>{{ adminLinkLabel }}</span>
              </RouterLink>
              <RouterLink
                v-if="auth.isAuthenticated && auth.user?.role === 'AdminGeral'"
                to="/admin/system-config"
                class="btn-muted w-full justify-center"
                @click="closeMobileMenu"
              >
                Configurações
              </RouterLink>
              <button v-if="auth.isAuthenticated" type="button" class="btn-muted w-full justify-center" @click="handleSignOut">
                <ArrowRightOnRectangleIcon class="h-5 w-5" />
                <span>Sair</span>
              </button>
            </div>
          </transition>
        </header>
        <div
          class="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[98%] flex-col rounded-[32px] border border-[color:var(--border-card)] bg-[color:var(--surface-card)]/95 px-4 py-10 shadow-[0_45px_120px_-60px_rgba(15,23,42,0.45)] backdrop-blur 2xl:max-w-[1900px] sm:px-6"
        >
          <main class="flex-1 pb-10">
            <RouterView />
          </main>
          <footer class="mt-auto border-t border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] py-6 text-center text-sm text-[color:var(--text-muted)]">
            &copy; {{ new Date().getFullYear() }} CATRE Ipitinga. Sistema de Inscrições e check-in.
          </footer>
        </div>
      </template>
    </div>
  </div>
</template>
...
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  MapPinIcon,
  MoonIcon,
  PresentationChartBarIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  SunIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon
} from "@heroicons/vue/24/outline";

import { useTheme } from "./composables/useTheme";
import { useAuthStore } from "./stores/auth";
import { useSystemConfigStore } from "./stores/system-config";
import LoadingOverlay from "./components/ui/LoadingOverlay.vue";
import AdminSidebar from "./components/admin/AdminSidebar.vue";
import type { PermissionAction, Role } from "./types/api";

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
let timer: number | undefined;

const isMobileViewport = () => typeof window !== "undefined" && window.innerWidth < mobileViewportBreakpoint;

const lockBodyScroll = (locked: boolean) => {
  if (typeof document === "undefined") {
    return;
  }
  document.body.style.overflow = locked ? "hidden" : "";
};

type MenuDefinition = {
  label: string;
  to: RouteLocationRaw;
  icon: typeof Squares2X2Icon;
  module?: string;
  action?: PermissionAction;
  requiresRole?: Role;
};

const baseAdminMenu: MenuDefinition[] = [
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

const adminMenuItems = computed(() =>
  baseAdminMenu.filter((item) => {
    if (item.requiresRole && auth.user?.role !== item.requiresRole) {
      return false;
    }
    if (!item.module) {
      return true;
    }
    return auth.hasPermission(item.module, item.action ?? "view");
  })
);

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
  } else {
    lockBodyScroll(false);
  }
};

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

watch(
  () => route.fullPath,
  () => {
    if (!isAdminLayout.value) {
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth < mobileViewportBreakpoint) {
      isSidebarOpen.value = false;
    }
  }
);

watch(
  () => isSidebarOpen.value,
  (isOpen) => {
    if (!isAdminLayout.value) {
      return;
    }
    if (isMobileViewport()) {
      lockBodyScroll(isOpen);
    } else {
      lockBodyScroll(false);
    }
  },
  { immediate: true }
);

const activeBrandLogo = computed(() => {
  const branding = systemConfig.value.branding;
  if (isDark.value) {
    return branding.logoDarkUrl ?? branding.logoLightUrl ?? "";
  }
  return branding.logoLightUrl ?? branding.logoDarkUrl ?? "";
});

const adminLink = computed(() =>
  auth.isAuthenticated ? { name: "admin-dashboard" } : { name: "admin-login" }
);
const adminLinkLabel = computed(() => (auth.isAuthenticated ? "Painel admin" : "Admin"));
const userDisplayName = computed(() => {
  const name = auth.user?.name?.trim();
  if (!name) return "";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }
  return `${parts[0]} ${parts[parts.length - 1]}`;
});
const greetingMessage = computed(() => {
  if (!auth.isAuthenticated) return "";
  const displayName = userDisplayName.value;
  if (!displayName) return "";
  const hour = currentTime.value.getHours();
  let greeting = "Olá";
  if (hour >= 5 && hour < 12) {
    greeting = "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
  } else {
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
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>












