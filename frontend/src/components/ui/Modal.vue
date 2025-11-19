<template>
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-xl sm:px-6"
        tabindex="-1"
        :style="{ background: 'var(--modal-backdrop)' }"
        @keydown.esc="close"
        @click.self="handleOverlay"
        ref="dialogRef"
      >
        <transition name="modal-content">
          <div
            class="w-full max-w-[92vw] max-h-[96vh] overflow-y-auto rounded-[var(--modal-radius)] border border-[color:var(--border-card)] bg-[color:var(--surface-card)] p-6 text-[color:var(--text-base)] shadow-xl sm:p-8 xl:max-w-[1800px]"
            :style="{ boxShadow: 'var(--modal-shadow)' }"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-semibold">
                {{ title }}
              </h2>
              <button
                type="button"
                class="rounded-full p-2 text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-card-alt)]"
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
            <div class="text-[color:var(--text-base)]">
              <slot />
            </div>
          </div>
        </transition>
      </div>
    </transition>
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

