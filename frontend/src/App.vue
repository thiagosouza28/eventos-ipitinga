<template>
  <div :class="{ dark: isDark }">
    <div class="min-h-screen bg-[color:var(--background)] text-[color:var(--text)] transition-colors">
      <template v-if="isAdminLayout">
        <div class="flex min-h-screen">
          <AdminSidebar :is-open="isSidebarOpen" :menu-items="adminMenuItems" @toggle="toggleSidebar" />
          <div class="flex-1 min-h-screen bg-[#F3F6FB] dark:bg-[#050816]">
            <header class="sticky top-0 z-30 px-6 pt-6">
              <div class="flex items-center justify-between rounded-[36px] border border-[color:var(--app-shell-border)] bg-[color:var(--app-shell-bg)] px-6 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
                <RouterLink to="/" class="flex items-center gap-3 text-lg font-semibold text-[#111827] dark:text-white">
                  <div class="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-[#fdfdff] to-[#eef3ff] shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.1)] dark:from-[#1b2140] dark:to-[#11152A]">
                    <img v-if="activeBrandLogo" :src="activeBrandLogo" alt="Logotipo CATRE" class="h-full w-full object-contain p-1.5" />
                    <span v-else class="font-semibold text-[#5a6bff] dark:text-white">CI</span>
                  </div>
                  <span class="text-base font-semibold sm:text-lg">CATRE Ipitinga</span>
                </RouterLink>
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
                </div>
              </div>
            </header>
            <main class="px-6 pb-10 pt-10">
              <RouterView />
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
            &copy; {{ new Date().getFullYear() }} CATRE Ipitinga. Sistema de inscrições e check-in.
          </footer>
        </div>
      </template>
    </div>
  </div>
</template>
...
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
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
let timer: number | undefined;

const adminMenuItems = [
  { label: "Dashboard", to: { name: "admin-dashboard" }, icon: Squares2X2Icon },
  { label: "Eventos", to: { name: "admin-events" }, icon: CalendarDaysIcon },
  { label: "Distritos", to: { name: "admin-districts" }, icon: MapPinIcon },
  { label: "Igrejas", to: { name: "admin-churches" }, icon: BuildingOffice2Icon },
  { label: "Ministérios", to: { name: "admin-ministries" }, icon: UsersIcon },
  { label: "Usuários", to: { name: "admin-users" }, icon: UserPlusIcon },
  { label: "Permissões", to: { name: "admin-profiles" }, icon: ShieldCheckIcon },
  { label: "Pedidos", to: { name: "admin-orders" }, icon: ClipboardDocumentListIcon },
  { label: "Inscrições", to: { name: "admin-registrations" }, icon: UsersIcon },
  { label: "Financeiro", to: { name: "admin-financial" }, icon: BanknotesIcon },
  { label: "Check-in", to: { name: "admin-checkin" }, icon: QrCodeIcon },
  { label: "Configurações", to: "/admin/system-config", icon: Cog6ToothIcon }
];

const isAdminLayout = computed(() => {
  if (!route.path.startsWith("/admin")) {
    return false;
  }
  return route.name !== "admin-login";
});

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

watch(
  () => route.fullPath,
  () => {
    if (!isAdminLayout.value) {
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      isSidebarOpen.value = false;
    }
  }
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
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    isSidebarOpen.value = false;
  }
  timer = window.setInterval(() => {
    currentTime.value = new Date();
  }, 60 * 1000);
});

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer);
  }
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
