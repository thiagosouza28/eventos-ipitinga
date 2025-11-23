import { defineStore } from "pinia";
import { computed, ref } from "vue";

type LoaderMessage = {
  text: string;
  icon?: string;
};

const DEFAULT_MESSAGE: LoaderMessage = {
  text: "⏳ Carregando informações..."
};

const REQUEST_MESSAGES: Record<string, LoaderMessage> = {
  get: { text: "🔄 Buscando dados..." },
  post: { text: "📡 Enviando informações..." },
  put: { text: "📡 Atualizando informações..." },
  patch: { text: "📡 Atualizando informações..." },
  delete: { text: "🗑️ Processando exclusão..." }
};

export const useLoaderStore = defineStore("loader", () => {
  const activeRequests = ref(0);
  const message = ref<LoaderMessage>(DEFAULT_MESSAGE);
  const manualLock = ref(false);

  const isVisible = computed(() => manualLock.value || activeRequests.value > 0);

  const setMessage = (payload?: LoaderMessage) => {
    message.value = payload ?? DEFAULT_MESSAGE;
  };

  const start = (payload?: LoaderMessage) => {
    activeRequests.value += 1;
    setMessage(payload);
  };

  const stop = () => {
    activeRequests.value = Math.max(0, activeRequests.value - 1);
    if (activeRequests.value === 0 && !manualLock.value) {
      setMessage();
    }
  };

  const show = (payload?: LoaderMessage) => {
    manualLock.value = true;
    setMessage(payload);
  };

  const hide = () => {
    manualLock.value = false;
    if (activeRequests.value === 0) {
      setMessage();
    }
  };

  const messageForMethod = (method?: string) => {
    if (!method) return DEFAULT_MESSAGE;
    return REQUEST_MESSAGES[method.toLowerCase()] ?? DEFAULT_MESSAGE;
  };

  return {
    message,
    isVisible,
    start,
    stop,
    show,
    hide,
    messageForMethod
  };
});
