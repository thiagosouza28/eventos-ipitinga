<template>
  <teleport to="body">
    <div
      v-if="open"
      ref="dialogRef"
      class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-xl"
      :style="{ background: 'var(--modal-backdrop)' }"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-notice-title"
      @keydown.esc.prevent
    >
      <div
        class="w-full max-w-lg rounded-2xl border border-[color:var(--border-card)] bg-white p-6 text-[color:var(--text-base)] shadow-2xl sm:p-8"
      >
        <h2 id="event-notice-title" class="text-xl font-semibold text-neutral-900">
          {{ title }}
        </h2>
        <ul class="mt-4 space-y-2 text-sm text-neutral-600">
          <li v-for="(item, index) in bullets" :key="`${slug}-${index}`" class="flex items-start gap-2">
            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary-500"></span>
            <span>{{ item }}</span>
          </li>
        </ul>
        <p v-if="footerText" class="mt-4 text-xs text-neutral-500">
          {{ footerText }}
        </p>
        <label v-if="showOnce" class="mt-4 flex items-start gap-2 text-sm text-neutral-600">
          <input
            v-model="remember"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-200"
          />
          <span>Não mostrar novamente</span>
        </label>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-muted w-full sm:w-auto" @click="handleCancel">
            Cancelar
          </button>
          <button type="button" class="btn-primary w-full sm:w-auto" @click="handleAccept">
            Li e concordo
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = defineProps<{
  slug: string;
  open: boolean;
  title: string;
  bullets: string[];
  footerText?: string;
  showOnce?: boolean;
}>();

const emit = defineEmits<{
  (event: "accept", remember: boolean): void;
  (event: "cancel"): void;
}>();

const dialogRef = ref<HTMLElement | null>(null);
const remember = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      remember.value = false;
      nextTick(() => dialogRef.value?.focus());
    }
  }
);

const handleAccept = () => {
  emit("accept", props.showOnce === false ? false : remember.value);
};

const handleCancel = () => {
  emit("cancel");
};
</script>
