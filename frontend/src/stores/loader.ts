import { defineStore } from "pinia";
import { computed, ref } from "vue";

type LoaderMessage = {
  text: string;
  icon?: string;
};

type LoaderMessagePayload = LoaderMessage | string | undefined;

const DEFAULT_MESSAGE: LoaderMessage = {
  text: "Processando..."
};

const REQUEST_MESSAGES: Record<string, LoaderMessage> = {
  get: { text: "Carregando dados..." },
  post: { text: "Salvando..." },
  put: { text: "Atualizando informacoes..." },
  patch: { text: "Atualizando informacoes..." },
  delete: { text: "Processando exclusao..." }
};

const resolveMessage = (payload?: LoaderMessagePayload): LoaderMessage => {
  if (typeof payload === "string") {
    return { text: payload };
  }
  if (payload && typeof payload === "object") {
    return { ...DEFAULT_MESSAGE, ...payload };
  }
  return { ...DEFAULT_MESSAGE };
};

export const useLoaderStore = defineStore("loader", () => {
  const activeRequests = ref(0);
  const message = ref<LoaderMessage>(resolveMessage());
  const manualLock = ref(false);

  const isVisible = computed(() => manualLock.value || activeRequests.value > 0);

  const setMessage = (payload?: LoaderMessagePayload) => {
    message.value = resolveMessage(payload);
  };

  const start = (payload?: LoaderMessagePayload) => {
    activeRequests.value += 1;
    setMessage(payload);
  };

  const stop = () => {
    activeRequests.value = Math.max(0, activeRequests.value - 1);
    if (activeRequests.value === 0 && !manualLock.value) {
      setMessage();
    }
  };

  const show = (payload?: LoaderMessagePayload) => {
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
    if (!method) {
      return resolveMessage();
    }
    const normalized = method.toLowerCase();
    return resolveMessage(REQUEST_MESSAGES[normalized]);
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
