<template>
  <transition name="loading-overlay-fade">
    <div
      v-if="isVisible"
      class="loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="loading-overlay__panel">
        <div class="loading-spinner" aria-hidden="true">
          <span class="loading-spinner__ring"></span>
          <span class="loading-spinner__ring loading-spinner__ring--inner"></span>
        </div>
        <p class="loading-message">{{ displayMessage }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useLoaderStore } from "../../stores/loader";

const loader = useLoaderStore();
const { isVisible, message } = storeToRefs(loader);

const displayMessage = computed(() => {
  const text = message.value?.text?.trim();
  return text && text.length > 0 ? text : "Processando...";
});
</script>

<style scoped>
.loading-overlay-fade-enter-active,
.loading-overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}

.loading-overlay-fade-enter-from,
.loading-overlay-fade-leave-to {
  opacity: 0;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(10px);
  pointer-events: all;
  touch-action: none;
  cursor: wait;
}

.loading-overlay__panel {
  --loader-tone: #0f172a;
  --loader-glow: rgba(255, 255, 255, 0.35);
  --loader-text: #f6f7fb;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2.5rem 3rem;
  border-radius: 1.75rem;
  background: rgba(12, 14, 22, 0.65);
  box-shadow: 0 25px 65px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.dark .loading-overlay__panel {
  --loader-tone: #f3f5ff;
  --loader-glow: rgba(99, 102, 241, 0.4);
  --loader-text: #f8faff;
  background: rgba(10, 12, 22, 0.85);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 80px rgba(5, 5, 10, 0.8);
}

.loading-spinner {
  position: relative;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner::after {
  content: "";
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08), transparent 65%);
  filter: blur(1px);
}

.loading-spinner__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 5px solid rgba(255, 255, 255, 0.18);
  border-top-color: var(--loader-tone);
  border-bottom-color: transparent;
  animation: loading-spin 0.85s linear infinite;
  box-shadow: 0 0 35px var(--loader-glow);
}

.loading-spinner__ring--inner {
  inset: 16px;
  border-width: 4px;
  border-style: solid;
  border-color: transparent;
  border-left-color: rgba(255, 255, 255, 0.3);
  border-right-color: rgba(255, 255, 255, 0.3);
  animation: loading-spin-reverse 1.2s ease-in-out infinite;
  opacity: 0.75;
}

.loading-message {
  color: var(--loader-text);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes loading-spin-reverse {
  to {
    transform: rotate(-360deg);
  }
}
</style>
