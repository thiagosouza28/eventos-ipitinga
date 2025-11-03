<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      @click.self="close"
    >
      <div class="w-full max-w-sm rounded-xl border border-red-200 bg-white p-6 shadow-xl dark:border-red-700 dark:bg-neutral-900">
        <h2 class="text-lg font-semibold text-red-600 dark:text-red-400">
          {{ title }}
        </h2>
        <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {{ message }}
        </p>
        <pre
          v-if="details"
          class="mt-4 max-h-40 overflow-auto rounded-lg bg-neutral-100 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        >
{{ formattedDetails }}
        </pre>
        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            @click="close"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    message: string;
    details?: string;
  }>(),
  {
    title: "Ocorreu um erro",
    details: ""
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();

const close = () => emit("update:modelValue", false);

const formattedDetails = computed(() => props.details?.trim());
</script>
