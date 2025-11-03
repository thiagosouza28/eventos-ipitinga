<template>
  <div :class="{ dark: isDark }">
    <div class="min-h-screen bg-neutral-100 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      <header class="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6">
          <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white">
              CI
            </span>
            <span>CATRE Ipitinga</span>
          </RouterLink>
          <div class="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <RouterLink
            :to="adminLink"
            class="rounded-md border border-primary-500 px-3 py-1.5 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:border-primary-400 dark:text-primary-200 dark:hover:bg-primary-500/20"
          >
            {{ adminLinkLabel }}
          </RouterLink>
          <button
            v-if="auth.isAuthenticated"
            type="button"
            class="rounded-md border border-neutral-200 px-3 py-1.5 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="handleSignOut"
          >
            Sair
          </button>
          <button
            type="button"
            class="rounded-md border border-neutral-200 px-3 py-1.5 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="toggleTheme"
          >
              <span v-if="isDark">Tema claro</span>
              <span v-else>Tema escuro</span>
            </button>
          </div>
        </div>
      </header>

      <div class="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl flex-col px-4 py-10 sm:px-6">
        <main class="flex-1 pb-10">
          <RouterView />
        </main>

        <footer class="mt-auto border-t border-neutral-200 bg-white/60 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
          &copy; {{ new Date().getFullYear() }} CATRE Ipitinga. Sistema de inscricoes e check-in.
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
