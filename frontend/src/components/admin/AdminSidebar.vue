<template>
  <div
    class="hidden md:flex"
    :style="{ width: isOpen ? '200px' : '80px' }"
  >
    <aside
      class="sticky top-0 flex h-screen flex-col rounded-r-[36px] rounded-l-[32px] bg-[color:var(--app-shell-bg)] px-4 py-6 text-sm text-[color:var(--text-muted)] shadow-[0_20px_60px_rgba(15,23,42,0.15)] transition-all duration-300 dark:bg-[color:var(--surface-card)]"
    >
      <button
        type="button"
        class="mb-8 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white text-[#5a6bff] shadow-[0_10px_20px_rgba(76,87,125,0.15)] transition hover:bg-[#f8f9ff] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#10142b] dark:text-white"
        @click="emit('toggle')"
      >
        <Bars3Icon class="h-5 w-5" aria-hidden="true" />
        <span class="sr-only">Alternar menu</span>
      </button>
      <nav class="flex flex-1 flex-col space-y-2">
        <RouterLink
          v-for="item in visibleMenuItems"
          :key="item.label"
          :to="item.to"
          class="group flex items-center rounded-[20px] px-3 py-3 text-sm font-medium tracking-wide transition-all duration-300"
          :class="[
            isOpen ? 'justify-start' : 'justify-center',
            isActive(item.to)
              ? 'bg-white text-[#1f4fff] shadow-[0_15px_35px_rgba(47,83,192,0.18)] dark:bg-[#10172f]'
              : 'text-[#6b7280] hover:bg-white/70 hover:text-[#1f4fff] dark:text-[#c2c9e4] dark:hover:bg-[#10172f]'
          ]"
        >
          <component
            :is="item.icon"
            class="h-5 w-5 transition-colors"
            :class="[isActive(item.to) ? 'text-[#1f4fff]' : 'text-[#9aa4c4] group-hover:text-[#1f4fff] dark:text-[#8d99c9]']"
          />
          <transition name="label-fade">
            <span v-if="isOpen" class="ml-3 text-sm font-semibold tracking-tight text-[#1f2a44] dark:text-white">
              {{ item.label }}
            </span>
          </transition>
        </RouterLink>
      </nav>
    </aside>
  </div>

  <transition name="sidebar-overlay">
    <div v-if="isOpen" class="fixed inset-0 z-40 flex md:hidden">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('toggle')" />
      <transition name="sidebar-drawer">
        <aside class="relative ml-0 flex h-full w-72 flex-col rounded-r-[32px] border border-[color:var(--border-card)] bg-[color:var(--surface-card)] px-5 py-6 shadow-2xl">
          <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-[color:var(--text)]">Menu</p>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)]"
            @click="emit('toggle')"
          >
            <XMarkIcon class="h-5 w-5" aria-hidden="true" />
            <span class="sr-only">Fechar menu</span>
          </button>
        </div>
          <nav class="mt-6 flex flex-1 flex-col space-y-3 overflow-y-auto pr-1">
            <RouterLink
              v-for="item in visibleMenuItems"
              :key="`mobile-${item.label}`"
              :to="item.to"
              class="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition hover:bg-[color:var(--surface-card-alt)]"
              :class="[isActive(item.to) ? 'text-[color:var(--primary)]' : 'text-[color:var(--text-muted)]']"
              @click="$emit('toggle')"
            >
              <component :is="item.icon" class="h-5 w-5 text-[color:var(--text-muted)]" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </aside>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import { RouterLink, useRoute, type RouteLocationRaw } from "vue-router";
import { Bars3Icon, XMarkIcon } from "@heroicons/vue/24/outline";

import { useAuthStore } from "../../stores/auth";
import type { PermissionAction, Role } from "../../types/api";

type MenuItem = {
  label: string;
  to: RouteLocationRaw;
  icon: Component;
  module?: string;
  action?: PermissionAction;
  requiresRole?: Role;
};

const props = defineProps<{
  isOpen: boolean;
  menuItems: MenuItem[];
}>();

const emit = defineEmits<{
  (event: "toggle"): void;
}>();

const route = useRoute();
const auth = useAuthStore();

const isRouteActive = (to: RouteLocationRaw) => {
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

const isActive = (to: RouteLocationRaw) => isRouteActive(to);

const visibleMenuItems = computed(() =>
  props.menuItems.filter((item) => {
    if (item.requiresRole && auth.user?.role !== item.requiresRole) {
      return false;
    }
    if (!item.module) {
      return true;
    }
    return auth.hasPermission(item.module, item.action ?? "view");
  })
);
</script>

<style scoped>
.label-fade-enter-active,
.label-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.label-fade-enter-from,
.label-fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
.sidebar-overlay-enter-active,
.sidebar-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.sidebar-overlay-enter-from,
.sidebar-overlay-leave-to {
  opacity: 0;
}
.sidebar-drawer-enter-active,
.sidebar-drawer-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.sidebar-drawer-enter-from,
.sidebar-drawer-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
