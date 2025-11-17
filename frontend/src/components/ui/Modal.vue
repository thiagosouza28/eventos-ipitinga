<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 sm:px-6"
      tabindex="-1"
      @keydown.esc="close"
      @click.self="handleOverlay"
      ref="dialogRef"
    >
      <div
        class="w-full max-w-[92vw] xl:max-w-[1800px] max-h-[96vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 sm:p-8"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
            {{ title }}
          </h2>
          <button
            type="button"
            class="rounded-lg p-1 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            @click="close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="text-neutral-600 dark:text-neutral-300">
          <slot />
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  title: string;
  closeOnOverlay?: boolean;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();

const close = () => emit("update:modelValue", false);

const handleOverlay = () => {
  if (props.closeOnOverlay !== false) {
    close();
  }
};

const dialogRef = ref<HTMLDivElement | null>(null);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      nextTick(() => dialogRef.value?.focus());
    }
  }
);
</script>

