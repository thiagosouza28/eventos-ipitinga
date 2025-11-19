<template>
  <div class="hidden h-full md:flex" :class="[isOpen ? 'w-60' : 'w-20']">
    <aside
      class="flex h-full w-full flex-col rounded-[28px] bg-white px-3 py-6 text-sm text-[#667085] shadow-lg shadow-[rgba(15,23,42,0.08)] transition-all duration-300"
    >
      <button
        type="button"
        class="mb-8 flex h-11 w-11 items-center justify-center rounded-full border border-[#E4E7EC] text-[#1A1A1A] transition hover:bg-[#F5F7FA]"
        @click="$emit('toggle')"
      >
        <Bars3Icon class="h-5 w-5" aria-hidden="true" />
        <span class="sr-only">Alternar menu</span>
      </button>
      <nav class="flex flex-1 flex-col items-center justify-center space-y-5">
        <RouterLink
          v-for="item in menuItems"
          :key="item.label"
          :to="item.to"
          class="group flex w-full items-center rounded-2xl px-2 py-2 text-sm font-medium transition-all duration-200"
          :class="[
            isRouteActive(item.to) ? 'bg-[#EEF4FF] text-[#1A1A1A]' : 'text-[#667085] hover:bg-[#F5F7FA]',
            isOpen ? 'justify-start pl-3 pr-4' : 'justify-center'
          ]"
        >
          <component :is="item.icon" class="h-5 w-5 text-[#667085] transition-colors group-hover:text-[#344054]" />
          <transition name="label-fade">
            <span
              v-if="isOpen"
              class="ml-3 text-base font-medium text-[#1A1A1A] transition duration-200"
            >
              {{ item.label }}
            </span>
          </transition>
        </RouterLink>
      </nav>
    </aside>
  </div>

  <transition name="sidebar-overlay">
    <div v-if="isOpen" class="fixed inset-0 z-40 flex md:hidden">
      <div class="absolute inset-0 bg-black/40" @click="$emit('toggle')" />
      <aside class="relative ml-0 flex h-full w-60 flex-col bg-white px-4 py-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-[#1A1A1A]">Menu</p>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC]"
            @click="$emit('toggle')"
          >
            <XMarkIcon class="h-5 w-5" aria-hidden="true" />
            <span class="sr-only">Fechar menu</span>
          </button>
        </div>
        <nav class="mt-6 flex flex-col space-y-4">
          <RouterLink
            v-for="item in menuItems"
            :key="`mobile-${item.label}`"
            :to="item.to"
            class="flex items-center rounded-2xl px-3 py-2 text-base font-medium transition hover:bg-[#F5F7FA]"
            :class="[isRouteActive(item.to) ? 'text-[#1A1A1A]' : 'text-[#667085]']"
            @click="$emit('toggle')"
          >
            <component :is="item.icon" class="h-5 w-5 text-[#667085]" />
            <span class="ml-3">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>
    </div>
  </transition>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink, useRoute, type RouteLocationRaw } from "vue-router";
import { Bars3Icon, XMarkIcon } from "@heroicons/vue/24/outline";

type MenuItem = {
  label: string;
  to: RouteLocationRaw;
  icon: Component;
};

defineProps<{
  isOpen: boolean;
  menuItems: MenuItem[];
}>();

const route = useRoute();

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
</style>
