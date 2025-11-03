<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      tabindex="-1"
      @keydown.esc="close"
      @click.self="handleOverlay"
      ref="dialogRef"
    >
      <div class="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{{ title }}</h2>
        <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{{ description }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 transition hover:bg-neutral-200 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            @click="handleCancel"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
            :class="type === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-primary-600 hover:bg-primary-500'"
            @click="handleConfirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: "default" | "danger";
  }>(),
  {
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
    type: "default"
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "confirm"): void;
  (event: "cancel"): void;
}>();

const close = () => emit("update:modelValue", false);

const handleCancel = () => {
  emit("cancel");
  close();
};

const handleConfirm = () => {
  emit("confirm");
  close();
};

const handleOverlay = () => {
  emit("cancel");
  close();
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
