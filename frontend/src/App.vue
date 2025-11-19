<template>
  <div :class="{ dark: isDark }">
    <div class="min-h-screen text-[color:var(--text-base)] transition-colors">
      <header
        class="sticky top-0 z-50 border-b border-[color:var(--app-shell-border)] bg-[color:var(--surface-blur)] shadow-[0_18px_60px_-50px_rgba(15,23,42,0.9)] backdrop-blur-xl"
      >
        <div
          class="mx-auto flex w-full max-w-[98%] items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 2xl:max-w-[1900px]"
        >
          <RouterLink to="/" class="flex items-center gap-3 text-lg font-semibold text-neutral-900 dark:text-white">
            <div
              class="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[color:var(--app-shell-border)] bg-[color:var(--surface-card)] shadow-lg shadow-primary-600/40"
            >
              <img
                v-if="activeBrandLogo"
                :src="activeBrandLogo"
                alt="Logotipo CATRE"
                class="h-full w-full object-contain p-1.5"
              />
              <span v-else>CI</span>
            </div>
            <span class="text-base font-semibold sm:text-lg">CATRE Ipitinga</span>
          </RouterLink>
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-transparent bg-neutral-200/80 text-neutral-900 transition hover:bg-neutral-300 dark:bg-white/10 dark:text-white"
              :aria-pressed="isDark"
              @click="toggleTheme"
            >
              <SunIcon v-if="isDark" class="h-5 w-5" aria-hidden="true" />
              <MoonIcon v-else class="h-5 w-5" aria-hidden="true" />
              <span class="sr-only">Alternar tema</span>
            </button>
            <div v-if="greetingMessage" class="hidden flex-col text-right leading-tight sm:flex">
              <span class="text-sm font-semibold text-[color:var(--text-base)] dark:text-white">
                {{ greetingMessage }}
              </span>
              <span class="text-xs text-[color:var(--text-muted)]">Estamos felizes em ver voce</span>
            </div>
            <div class="hidden sm:flex items-center gap-2">
              <RouterLink
                :to="adminLink"
                class="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-shell-border)] bg-white/80 px-4 py-2 text-sm font-medium text-primary-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:bg-transparent dark:text-primary-200"
              >
                <ShieldCheckIcon class="h-5 w-5" aria-hidden="true" />
                <span>{{ adminLinkLabel }}</span>
              </RouterLink>
              <RouterLink
                v-if="auth.isAuthenticated && auth.user?.role === 'AdminGeral'"
                :to="{ name: 'admin-system-config' }"
                class="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-shell-border)] px-4 py-2 text-sm font-medium text-[color:var(--text-base)] transition hover:-translate-y-0.5 hover:bg-[color:var(--surface-card-alt)]"
              >
                <span>Configurações</span>
              </RouterLink>
              <button
                v-if="auth.isAuthenticated"
                type="button"
                class="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-shell-border)] px-4 py-2 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:text-neutral-100"
                @click="handleSignOut"
              >
                <ArrowRightOnRectangleIcon class="h-5 w-5" aria-hidden="true" />
                <span>Sair</span>
              </button>
            </div>
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--app-shell-border)] bg-white/80 text-neutral-700 transition hover:bg-white sm:hidden dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              @click="toggleMobileMenu"
            >
              <Bars3Icon v-if="!mobileMenuOpen" class="h-6 w-6" aria-hidden="true" />
              <XMarkIcon v-else class="h-6 w-6" aria-hidden="true" />
              <span class="sr-only">Abrir menu</span>
            </button>
          </div>
        </div>
        <transition name="fade">
          <div
            v-if="mobileMenuOpen"
            class="mx-auto mt-2 flex w-full max-w-[95%] flex-col gap-2 rounded-2xl border border-[color:var(--app-shell-border)] bg-[color:var(--surface-card)] px-4 py-4 text-sm shadow-lg sm:hidden"
          >
            <div
              v-if="greetingMessage"
              class="rounded-xl border border-[color:var(--app-shell-border)] px-4 py-3 text-sm font-semibold text-[color:var(--text-base)] dark:text-white"
            >
              {{ greetingMessage }}
            </div>
            <RouterLink
              :to="adminLink"
              class="inline-flex items-center gap-2 rounded-xl border border-[color:var(--app-shell-border)] px-3 py-2 font-medium text-primary-700 transition hover:bg-white/80 dark:text-primary-200"
              @click="closeMobileMenu"
            >
              <ShieldCheckIcon class="h-5 w-5" />
              <span>{{ adminLinkLabel }}</span>
            </RouterLink>
            <RouterLink
              v-if="auth.isAuthenticated && auth.user?.role === 'AdminGeral'"
              :to="{ name: 'admin-system-config' }"
              class="inline-flex items-center gap-2 rounded-xl border border-[color:var(--app-shell-border)] px-3 py-2 font-medium text-[color:var(--text-base)] transition hover:bg-white/80"
              @click="closeMobileMenu"
            >
              <span>Configurações</span>
            </RouterLink>
            <button
              v-if="auth.isAuthenticated"
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-[color:var(--app-shell-border)] px-3 py-2 text-left font-medium text-neutral-700 transition hover:bg-white/80 dark:text-neutral-100"
              @click="handleSignOut"
            >
              <ArrowRightOnRectangleIcon class="h-5 w-5" />
              <span>Sair</span>
            </button>
          </div>
        </transition>
      </header>

      <div
        class="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[98%] flex-col rounded-[32px] border border-[color:var(--app-shell-border)] bg-[color:var(--app-shell-bg)] px-4 py-10 shadow-[0_45px_120px_-60px_rgba(15,23,42,0.5)] backdrop-blur 2xl:max-w-[1900px] sm:px-6"
      >
        <main v-if="isAdminLayout" class="flex flex-1 gap-6 pb-6">
          <AdminSidebar :is-open="isSidebarOpen" :menu-items="adminMenuItems" @toggle="toggleSidebar" />
          <div class="flex-1 rounded-[28px] bg-[#F5F7FA] p-4 sm:p-6">
            <button
              type="button"
              class="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] shadow-sm transition hover:-translate-y-0.5 md:hidden"
              @click="toggleSidebar"
            >
              <Bars3Icon class="h-5 w-5" aria-hidden="true" />
              Menu
            </button>
            <RouterView />
          </div>
        </main>
        <main v-else class="flex-1 pb-10">
          <RouterView />
        </main>

        <footer
          class="mt-auto border-t border-[color:var(--app-shell-border)] bg-[color:var(--surface-card-alt)] py-6 text-center text-sm text-[color:var(--text-muted)]"
        >
          &copy; {{ new Date().getFullYear() }} CATRE Ipitinga. Sistema de inscrições e check-in.
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  MoonIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  SunIcon,
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
const isSidebarOpen = ref(false);
let timer: number | undefined;

const adminMenuItems = [
  { label: "Dashboard", to: { name: "admin-dashboard" }, icon: Squares2X2Icon },
  { label: "Eventos", to: { name: "admin-events" }, icon: CalendarDaysIcon },
  { label: "Pedidos", to: { name: "admin-orders" }, icon: ClipboardDocumentListIcon },
  { label: "Inscri��es", to: { name: "admin-registrations" }, icon: UsersIcon },
  { label: "Financeiro", to: { name: "admin-financial" }, icon: BanknotesIcon },
  { label: "Check-in", to: { name: "admin-checkin" }, icon: QrCodeIcon },
  { label: "Configura��es", to: { name: "admin-system-config" }, icon: Cog6ToothIcon }
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
      isSidebarOpen.value = false;
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
  let greeting = "Ola";
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
