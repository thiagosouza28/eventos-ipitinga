<template>
  <div :class="{ dark: isDark }">
    <div
      class="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white text-neutral-900 transition-colors dark:from-neutral-950 dark:via-black dark:to-neutral-950 dark:text-neutral-50"
    >
      <header
        class="border-b border-primary-100/60 bg-white/90 shadow-sm backdrop-blur-md dark:border-primary-900/40 dark:bg-black/70"
      >
        <div class="mx-auto flex w-full max-w-[95%] xl:max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6">
          <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30"
            >
              CI
            </span>
            <span>CATRE Ipitinga</span>
          </RouterLink>
          <div class="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <RouterLink
            :to="adminLink"
            class="rounded-md border border-primary-500/60 px-3 py-1.5 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-400/70 dark:text-primary-200 dark:hover:bg-primary-500/20"
          >
            {{ adminLinkLabel }}
          </RouterLink>
          <button
            v-if="auth.isAuthenticated"
            type="button"
            class="rounded-md border border-black/10 px-3 py-1.5 text-sm text-neutral-900 transition hover:bg-black/5 dark:border-white/10 dark:text-neutral-100 dark:hover:bg-white/5"
            @click="handleSignOut"
          >
            Sair
          </button>
          <button
            type="button"
            class="rounded-md border border-black/10 px-3 py-1.5 text-sm text-neutral-900 transition hover:bg-black/5 dark:border-white/10 dark:text-neutral-100 dark:hover:bg-white/5"
            @click="toggleTheme"
          >
              <span v-if="isDark">Tema claro</span>
              <span v-else>Tema escuro</span>
            </button>
          </div>
        </div>
      </header>

      <div
        class="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[95%] flex-col rounded-[28px] border border-white/60 bg-white/90 px-4 py-10 shadow-2xl shadow-primary-100/50 backdrop-blur xl:max-w-[1600px] dark:border-white/10 dark:bg-neutral-950/80 dark:shadow-black/40 sm:px-6"
      >
        <main class="flex-1 pb-10">
          <RouterView />
        </main>

        <footer
          class="mt-auto border-t border-black/5 bg-white/80 py-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:bg-black/60"
        >
          &copy; {{ new Date().getFullYear() }} CATRE Ipitinga. Sistema de inscrições e check-in.
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";

import { useTheme } from "./composables/useTheme";
import { useAuthStore } from "./stores/auth";

const { isDark, toggleTheme } = useTheme();
const router = useRouter();
const auth = useAuthStore();

const adminLink = computed(() =>
  auth.isAuthenticated ? { name: "admin-dashboard" } : { name: "admin-login" }
);
const adminLinkLabel = computed(() => (auth.isAuthenticated ? "Painel admin" : "Admin"));

const handleSignOut = () => {
  auth.signOut();
  router.push({ name: "admin-login" });
};
</script>
