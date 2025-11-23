<template>
  <transition name="fade">
    <div v-if="isVisible" class="loader-screen">
      <div class="loading-card">
        <div class="loader-ring"></div>
        <p class="loading-text">{{ message.text }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useLoaderStore } from "../../stores/loader";

const loader = useLoaderStore();
const { isVisible, message } = storeToRefs(loader);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.loader-screen {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.9), rgba(240, 244, 255, 0.85), rgba(225, 234, 255, 0.8));
  backdrop-filter: blur(8px);
}

[data-theme="dark"] .loader-screen {
  background: radial-gradient(circle at 20% 20%, rgba(16, 18, 30, 0.92), rgba(10, 13, 24, 0.9), rgba(6, 7, 15, 0.92));
}

.loading-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(243, 247, 255, 0.95));
  padding: 38px 68px;
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 32, 96, 0.15);
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.7);
  animation: fadeIn 0.35s ease;
}

[data-theme="dark"] .loading-card {
  background: linear-gradient(135deg, rgba(21, 25, 39, 0.95), rgba(13, 18, 32, 0.95));
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.loader-ring {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: 6px solid transparent;
  border-top-color: var(--primary, #1f4fff);
  animation: spin 0.85s linear infinite;
  margin: 0 auto 18px auto;
}

.loading-text {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text, #1a1a1a);
  letter-spacing: 0.35px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
